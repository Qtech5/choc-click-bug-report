import { db, storage } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const listEl = document.getElementById("idea-list");
const deleteAllBtn = document.getElementById("delete-all-ideas");

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadIdeas() {
  listEl.innerHTML = "<p>Loading…</p>";
  const q = query(collection(db, "ideas"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    listEl.innerHTML = "<p>No ideas yet. Be the first!</p>";
    return;
  }

  listEl.innerHTML = "";
  snap.forEach((docSnap) => {
    const idea = docSnap.data();
    const item = document.createElement("a");
    item.className = "idea-item";
    item.href = `idea.html?id=${docSnap.id}`;
    item.innerHTML = `
      <span class="bug-title">${escapeHtml(idea.title)}</span>
      <span class="bug-status idea-votes-badge">👍 ${idea.votes || 0}</span>
    `;
    listEl.appendChild(item);
  });
}

async function deleteIdeaCascade(ideaDoc) {
  const idea = ideaDoc.data();
  const commentsSnap = await getDocs(collection(db, "ideas", ideaDoc.id, "comments"));
  await Promise.all(commentsSnap.docs.map((d) => deleteDoc(d.ref)));
  await Promise.all(
    (idea.mediaUrls || [])
      .filter((media) => media.path)
      .map((media) => deleteObject(ref(storage, media.path)).catch(() => {}))
  );
  await deleteDoc(ideaDoc.ref);
}

async function deleteAllIdeas() {
  if (!confirm("Delete ALL ideas? This removes their comments and attachments too, and can't be undone.")) {
    return;
  }
  deleteAllBtn.disabled = true;
  deleteAllBtn.textContent = "Deleting…";
  try {
    const snap = await getDocs(collection(db, "ideas"));
    await Promise.all(snap.docs.map((d) => deleteIdeaCascade(d)));
    await loadIdeas();
  } catch (err) {
    alert("Failed to delete ideas: " + err.message);
  } finally {
    deleteAllBtn.disabled = false;
    deleteAllBtn.textContent = "Delete all ideas";
  }
}

loadIdeas().catch((err) => {
  listEl.innerHTML = `<p>Failed to load ideas: ${escapeHtml(err.message)}</p>`;
});

deleteAllBtn.addEventListener("click", deleteAllIdeas);
