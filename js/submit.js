import { db, storage } from "./firebase.js";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const form = document.getElementById("submit-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  const name = document.getElementById("name").value.trim();
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const files = document.getElementById("media").files;

  try {
    // Generate the doc ref up front (no write yet) so uploaded files can be
    // keyed under its id, then create the bug doc in a single write — the
    // Firestore rules only allow updating the `status` field after creation,
    // so mediaUrls must be included in the initial create, not a follow-up.
    const bugRef = doc(collection(db, "bugs"));

    const mediaUrls = [];
    for (const file of files) {
      const path = `bugs/${bugRef.id}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      mediaUrls.push({ url, path, type: file.type.startsWith("video") ? "video" : "image" });
    }

    await setDoc(bugRef, {
      name,
      title,
      description,
      status: "Open",
      mediaUrls,
      createdAt: serverTimestamp(),
    });

    window.location.href = `bug.html?id=${bugRef.id}`;
  } catch (err) {
    alert("Failed to submit: " + err.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
});
