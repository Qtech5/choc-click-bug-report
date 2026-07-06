import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const listEl = document.getElementById("idea-list");

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

loadIdeas().catch((err) => {
  listEl.innerHTML = `<p>Failed to load ideas: ${escapeHtml(err.message)}</p>`;
});
