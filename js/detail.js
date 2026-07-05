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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const params = new URLSearchParams(window.location.search);
const bugId = params.get("id");

const titleEl = document.getElementById("bug-title");
const descEl = document.getElementById("bug-description");
const reporterEl = document.getElementById("bug-reporter");
const statusEl = document.getElementById("bug-status");
const mediaEl = document.getElementById("bug-media");
const commentsEl = document.getElementById("comments-list");
const commentForm = document.getElementById("comment-form");
const deleteBtn = document.getElementById("delete-bug");

let currentMediaUrls = [];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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

async function loadBug() {
  const bugRef = doc(db, "bugs", bugId);
  const snap = await getDoc(bugRef);
  if (!snap.exists()) {
    document.querySelector("main").innerHTML = "<p>Bug report not found.</p>";
    return;
  }
  const bug = snap.data();
  titleEl.textContent = bug.title;
  descEl.textContent = bug.description;
  reporterEl.textContent = bug.name;
  statusEl.value = bug.status || "Open";
  currentMediaUrls = bug.mediaUrls || [];
  renderMedia(currentMediaUrls);
}

async function updateStatus() {
  const bugRef = doc(db, "bugs", bugId);
  await updateDoc(bugRef, { status: statusEl.value });
}

async function loadComments() {
  const q = query(
    collection(db, "bugs", bugId, "comments"),
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

  await addDoc(collection(db, "bugs", bugId, "comments"), {
    author,
    text,
    createdAt: serverTimestamp(),
  });
  commentForm.reset();
  loadComments();
}

async function deleteBug() {
  if (!confirm("Delete this bug report? This removes its comments and attachments too, and can't be undone.")) {
    return;
  }
  deleteBtn.disabled = true;
  deleteBtn.textContent = "Deleting…";

  try {
    const commentsSnap = await getDocs(collection(db, "bugs", bugId, "comments"));
    await Promise.all(commentsSnap.docs.map((d) => deleteDoc(d.ref)));

    await Promise.all(
      currentMediaUrls
        .filter((media) => media.path)
        .map((media) => deleteObject(ref(storage, media.path)).catch(() => {}))
    );

    await deleteDoc(doc(db, "bugs", bugId));
    window.location.href = "index.html";
  } catch (err) {
    alert("Failed to delete: " + err.message);
    deleteBtn.disabled = false;
    deleteBtn.textContent = "Delete report";
  }
}

if (!bugId) {
  document.querySelector("main").innerHTML = "<p>No bug id given.</p>";
} else {
  loadBug();
  loadComments();
  statusEl.addEventListener("change", updateStatus);
  commentForm.addEventListener("submit", submitComment);
  deleteBtn.addEventListener("click", deleteBug);
}
