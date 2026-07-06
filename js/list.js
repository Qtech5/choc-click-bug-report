import { db, storage } from "./firebase.js";
import {
  collection,
  query,
  orderBy,
  where,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const listEl = document.getElementById("bug-list");
const deleteFixedBtn = document.getElementById("delete-fixed-bugs");

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

async function deleteBugCascade(bugDoc) {
  const bug = bugDoc.data();
  const commentsSnap = await getDocs(collection(db, "bugs", bugDoc.id, "comments"));
  await Promise.all(commentsSnap.docs.map((d) => deleteDoc(d.ref)));
  await Promise.all(
    (bug.mediaUrls || [])
      .filter((media) => media.path)
      .map((media) => deleteObject(ref(storage, media.path)).catch(() => {}))
  );
  await deleteDoc(bugDoc.ref);
}

async function deleteAllFixedBugs() {
  if (!confirm("Delete all bugs marked Fixed? This removes their comments and attachments too, and can't be undone.")) {
    return;
  }
  deleteFixedBtn.disabled = true;
  deleteFixedBtn.textContent = "Deleting…";
  try {
    const q = query(collection(db, "bugs"), where("status", "==", "Fixed"));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteBugCascade(d)));
    await loadBugs();
  } catch (err) {
    alert("Failed to delete fixed bugs: " + err.message);
  } finally {
    deleteFixedBtn.disabled = false;
    deleteFixedBtn.textContent = "Delete all fixed";
  }
}

loadBugs().catch((err) => {
  listEl.innerHTML = `<p>Failed to load bug reports: ${escapeHtml(err.message)}</p>`;
});

deleteFixedBtn.addEventListener("click", deleteAllFixedBugs);
