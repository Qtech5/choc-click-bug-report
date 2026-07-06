import { db, storage } from "./firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  increment,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const params = new URLSearchParams(window.location.search);
const ideaId = params.get("id");

const titleEl = document.getElementById("idea-title");
const descEl = document.getElementById("idea-description");
const reporterEl = document.getElementById("idea-reporter");
const votesEl = document.getElementById("idea-votes");
const upvoteLabelEl = document.getElementById("upvote-label");
const upvoteBtn = document.getElementById("upvote-btn");
const mediaEl = document.getElementById("idea-media");
const commentsEl = document.getElementById("comments-list");
const commentForm = document.getElementById("comment-form");
const deleteBtn = document.getElementById("delete-idea");

let currentMediaUrls = [];
let currentVotes = 0;
// Once the user votes locally we stop letting the initial (possibly slow)
// idea load overwrite the count — otherwise a late-resolving load can clobber
// the optimistic increment, or even double-count it if it resolves after
// the vote's write already landed in Firestore's local cache.
let localVoteApplied = false;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function votedIdeaIds() {
  try {
    return JSON.parse(localStorage.getItem("votedIdeas") || "[]");
  } catch {
    return [];
  }
}

function hasVoted() {
  return votedIdeaIds().includes(ideaId);
}

function markVoted() {
  const voted = votedIdeaIds();
  voted.push(ideaId);
  localStorage.setItem("votedIdeas", JSON.stringify(voted));
}

function renderMedia(mediaUrls) {
  mediaEl.innerHTML = "";
  (mediaUrls || []).forEach((media) => {
    if (media.type === "video") {
      const video = document.createElement("video");
      video.src = media.url;
      video.controls = true;
      mediaEl.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = media.url;
      mediaEl.appendChild(img);
    }
  });
}

function refreshUpvoteButton() {
  if (hasVoted()) {
    upvoteBtn.disabled = true;
    upvoteLabelEl.textContent = "👍 Upvoted";
  }
}

async function loadIdea() {
  const ideaRef = doc(db, "ideas", ideaId);
  const snap = await getDoc(ideaRef);
  if (!snap.exists()) {
    document.querySelector("main").innerHTML = "<p>Idea not found.</p>";
    return;
  }
  const idea = snap.data();
  titleEl.textContent = idea.title;
  descEl.textContent = idea.description;
  reporterEl.textContent = idea.name;
  if (!localVoteApplied) {
    currentVotes = idea.votes || 0;
    votesEl.textContent = currentVotes;
  }
  currentMediaUrls = idea.mediaUrls || [];
  renderMedia(currentMediaUrls);
  refreshUpvoteButton();
}

async function upvote() {
  if (hasVoted()) return;
  upvoteBtn.disabled = true;
  localVoteApplied = true;
  currentVotes += 1;
  votesEl.textContent = currentVotes;
  try {
    const ideaRef = doc(db, "ideas", ideaId);
    await updateDoc(ideaRef, { votes: increment(1) });
    markVoted();
    refreshUpvoteButton();
  } catch (err) {
    currentVotes -= 1;
    votesEl.textContent = currentVotes;
    localVoteApplied = false;
    upvoteBtn.disabled = false;
    alert("Failed to upvote: " + err.message);
  }
}

async function loadComments() {
  const q = query(
    collection(db, "ideas", ideaId, "comments"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  commentsEl.innerHTML = "";
  if (snap.empty) {
    commentsEl.innerHTML = "<p>No comments yet.</p>";
    return;
  }
  snap.forEach((docSnap) => {
    const c = docSnap.data();
    const el = document.createElement("div");
    el.className = "comment";
    el.innerHTML = `<span class="comment-author">${escapeHtml(c.author)}</span><p>${escapeHtml(c.text)}</p>`;
    commentsEl.appendChild(el);
  });
}

async function submitComment(e) {
  e.preventDefault();
  const author = document.getElementById("comment-author").value.trim();
  const text = document.getElementById("comment-text").value.trim();
  if (!author || !text) return;

  await addDoc(collection(db, "ideas", ideaId, "comments"), {
    author,
    text,
    createdAt: serverTimestamp(),
  });
  commentForm.reset();
  loadComments();
}

async function deleteIdea() {
  if (!confirm("Delete this idea? This removes its comments and attachments too, and can't be undone.")) {
    return;
  }
  deleteBtn.disabled = true;
  deleteBtn.textContent = "Deleting…";

  try {
    const commentsSnap = await getDocs(collection(db, "ideas", ideaId, "comments"));
    await Promise.all(commentsSnap.docs.map((d) => deleteDoc(d.ref)));

    await Promise.all(
      currentMediaUrls
        .filter((media) => media.path)
        .map((media) => deleteObject(ref(storage, media.path)).catch(() => {}))
    );

    await deleteDoc(doc(db, "ideas", ideaId));
    window.location.href = "index.html";
  } catch (err) {
    alert("Failed to delete: " + err.message);
    deleteBtn.disabled = false;
    deleteBtn.textContent = "Delete idea";
  }
}

if (!ideaId) {
  document.querySelector("main").innerHTML = "<p>No idea id given.</p>";
} else {
  loadIdea();
  loadComments();
  upvoteBtn.addEventListener("click", upvote);
  commentForm.addEventListener("submit", submitComment);
  deleteBtn.addEventListener("click", deleteIdea);
}
