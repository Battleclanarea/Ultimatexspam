# Ultimatexspam / BATTLECLANAREA962551

## Cursor Cloud specific instructions

### What this is
This repo is a single, self-contained browser game. The entire app is one static file, `index.html` (~1.8 MB), with all HTML/CSS/JS inlined. There is **no build system, no package manager, no backend, and no test suite** in this repo (`README.md` and `index.html` are the only tracked files).

### Running it (development)
Serve the repo root over HTTP and open `index.html`. Any static file server works; the simplest (no install needed, Python 3 is preinstalled):

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`. Opening via `file://` also mostly works, but serving over HTTP is preferred because the page dynamically `import()`s ES modules.

There is no separate dev/prod build — editing `index.html` and reloading the browser is the full dev loop.

### External services / offline behavior
- The page loads three things from CDNs at runtime: Tailwind (`cdn.tailwindcss.com`), Google Fonts, and Firebase (`gstatic.com`) JS modules.
- Firebase (Firestore + anonymous auth) powers online features (cloud sync, the multiplayer "arena"/"Death Duel"). The Firebase config and API key are hardcoded in `index.html`.
- Boot is **offline-proof**: Firebase load is wrapped in an 8s timeout and a try/catch. If the CDN is blocked or offline, the game logs `Firebase unavailable - OFFLINE MODE` and starts anyway with local-only features. So the app is fully runnable/testable even without network access; only online multiplayer/cloud-sync requires Firebase to reach the CDN.

### Manual "hello world" flow (how to verify it works)
1. Start screen → click **INITIALIZE UPLINK (START)**.
2. Clan select → click any clan card (e.g. **RZG**).
3. Gate chamber → enter clearance code `1` (universal bypass) → **BREAK SEAL**.
4. Military Dossier → **ENLIST (REGISTER)** tab → enter a callsign + security code → submit.
5. Lands in the **HQ** screen with the callsign shown in the top bar.

### Lint / test / build
None exist in this repo. There is nothing to lint, no automated tests, and no build step. Verification is manual in the browser (see flow above).
