# Ultimatexspam

Browser-based multiplayer clan/arena game ("BATTLECLANAREA962551 X SPAM WORLD"). The
entire application is a single self-contained static file: `index.html` (~2.4 MB, all
HTML/CSS/JS inline). There is no build system, no package manager, and no local backend.

## Cursor Cloud specific instructions

### Architecture
- Everything lives in `index.html`. There are no dependencies to install and nothing to build.
- The client loads third-party libs from CDNs at runtime: Tailwind CSS, Google Fonts, and the
  Firebase SDK (v10.12.2 from `gstatic.com`). Internet access is required for full functionality.
- Online multiplayer state (lobbies, leaderboards, presence, gifts, profiles) is backed by
  Firebase Firestore + anonymous Auth. The `firebaseConfig` (project `bca-world96`) is hardcoded
  inline in `index.html`. No secrets/env vars are needed.
- The app has an "OFFLINE-PROOF BOOT" fallback: if Firebase fails to load within ~8s it runs in
  OFFLINE mode (single-player). Online features need Firebase reachable.

### Run (development)
- Serve the repo root with any static server, then open `http://localhost:8000/`:
  `python3 -m http.server 8000` (run from the repo root). Do NOT open via `file://` — ES-module
  dynamic imports for Firebase will break.
- There is no lint/test/build tooling in this repo (no `package.json`, linter config, or tests).

### New-player entry flow (non-obvious)
To get from a cold load into the main game (useful for manual testing):
1. Click `RAISE THE GATES (ENTER)` on the welcome screen.
2. Pick any clan tile on the "PLEDGE YOUR ALLEGIANCE" screen.
3. A locked modal asks for a `CLEARANCE CODE`. The universal code `1` is accepted for any clan
   (see `validatePassword` in `index.html`). Click `BREAK SEAL`.
4. On the dossier/auth screen, switch to `ENLIST (REGISTER)`, enter a commander name + security
   code, and click `ESTABLISH PROFILE (REGISTER)` to enter the HQ.
