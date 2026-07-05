# Chocolate Clicker — Bug Reports

Plain HTML/CSS/JS bug-report forum for Chocolate Clicker playtesters. No build
step (so it can be served directly by GitHub Pages), Firebase JS SDK loaded
from CDN as ES modules. No auth — anyone with the link can post, comment, and
change a bug's status; posts are attributed by a free-text name field only.

## Setup

1. Create (or reuse) a Firebase project, with Firestore and Storage enabled.
2. Copy `js/firebase-config.example.js` → `js/firebase-config.js` (gitignored)
   and fill in the values from Firebase console → Project settings → General
   → "Your apps" → SDK setup and configuration.
3. Paste `firestore.rules` and `storage.rules` into the Firebase console
   (Firestore → Rules, Storage → Rules), or deploy with the Firebase CLI if
   you have a `firebase.json` set up for this project.
4. Serve the folder locally, e.g.:
   ```sh
   npx serve .
   # or
   python3 -m http.server
   ```
   ES module imports require serving over http(s) — opening `index.html`
   directly via `file://` won't work.

## Data model

- `bugs/{bugId}`: `title`, `description`, `name`, `status` (`Open` /
  `In Progress` / `Fixed`), `mediaUrls` (array of `{ url, type }`),
  `createdAt`.
- `bugs/{bugId}/comments/{commentId}`: `author`, `text`, `createdAt`.

## Pages

- `index.html` — all bug reports, title + status, newest first.
- `bug.html?id=...` — full report, status dropdown, media, comment thread.
- `submit.html` — new report form with photo/video upload.

## Deploying to GitHub Pages

Push this folder to its own repo (or a subfolder with Pages configured to
serve it) and enable GitHub Pages on the branch. No build step required.
