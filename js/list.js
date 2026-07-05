import { db } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const listEl = document.getElementById("bug-list");

function statusClass(status) {
  return (status || "open").toLowerCase().replace(/\s+/g, "-");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadBugs() {
  listEl.innerHTML = "<p>Loading…</p>";
  const q = query(collection(db, "bugs"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    listEl.innerHTML = "<p>No bug reports yet. Be the first!</p>";
    return;
  }

  listEl.innerHTML = "";
  snap.forEach((docSnap) => {
    const bug = docSnap.data();
    const item = document.createElement("a");
    item.className = "bug-item";
    item.href = `bug.html?id=${docSnap.id}`;
    item.innerHTML = `
      <span class="bug-title">${escapeHtml(bug.title)}</span>
      <span class="bug-status status-${statusClass(bug.status)}">${escapeHtml(bug.status || "Open")}</span>
    `;
    listEl.appendChild(item);
  });
}

loadBugs().catch((err) => {
  listEl.innerHTML = `<p>Failed to load bug reports: ${escapeHtml(err.message)}</p>`;
});
