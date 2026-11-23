# Fiona

Mobile-first PWA: measures an object's natural frequency from a tap (FFT), plays it back and
auto-tunes to the exact resonance (sweep + microphone feedback). Idea: see `idea.md`.

## Commands
```bash
npm install
npm run dev -- --host   # HTTPS (self-signed) dev server → open https://<PC-IP>:5173/fiona/ on the phone
npm test                # DSP unit tests (FFT, peaks, Goertzel, tap detector, tuner)
npm run build           # static build in dist/ (served under /fiona/)
npm run preview         # serve the build at http://localhost:4173/fiona/
```

## Deploy

Live at **https://dut00.github.io/fiona/** (GitHub Pages). `https://kudu.dev/fiona` redirects there.

### Pipeline (`.github/workflows/deploy.yml`)
1. Every push to `master` runs `npm ci` → `npm test` → `npm run build` and uploads `dist/`.
2. The **deploy** job waits for approval: open the run in the **Actions** tab →
   **Review deployments** → tick `github-pages` → **Approve and deploy**.
3. After approval the site is published; the run shows the page URL.

A newer push cancels an older run that is still waiting for approval.
To redeploy without a new commit: **Actions → Deploy to GitHub Pages → Run workflow**.
If tests or the build fail, nothing is deployed.

### One-time repository setup
- **Settings → Pages → Build and deployment → Source:** `GitHub Actions`.
- **Settings → Environments → `github-pages`:**
  - **Required reviewers:** add yourself — this is what makes the deploy wait for approval
    (without it, every push to `master` deploys immediately).
  - **Deployment branches:** limit to `master`.

The environment is created automatically on the first run (or when Pages is enabled);
add the reviewer before approving anything important.

### Notes
- The app must be served under `/fiona/` — `base` in `vite.config.ts` and the PWA
  `scope`/`start_url` depend on it. If the repo is renamed, update all three.
- HTTPS is required (the microphone only works in a secure context); GitHub Pages provides it.
- PWA users get the new version automatically on their next visit (service worker `autoUpdate`).

### Redirect from kudu.dev/fiona
Static file `fiona/index.html` on kudu.dev:
```html
<!doctype html>
<meta http-equiv="refresh" content="0; url=https://dut00.github.io/fiona/">
<link rel="canonical" href="https://dut00.github.io/fiona/">
```
or, with nginx: `location /fiona { return 301 https://dut00.github.io/fiona/; }`

## Layout
- `src/audio/` — DSP (`fft`, `peaks`, `goertzel`, `tapDetector`, `tuner`) + browser engine (`engine.ts`: mic, tone, wake lock)
- `public/capture-worklet.js` — AudioWorklet that streams mic samples
- `src/state/` — `useMeasure`, `usePlayer` (hearing-protection auto-stop: 60 s), history in localStorage
- `src/components/` — UI; `src/i18n/` — PL/EN
