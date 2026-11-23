# Fiona

Mobile-first PWA: measures an object's natural frequency from a tap (FFT), plays it back and
auto-tunes to the exact resonance (sweep + microphone feedback). Idea: see `idea.md`.

## Commands
```bash
npm install
npm run dev -- --host   # HTTPS (self-signed) dev server → open https://<PC-IP>:5173/fiona/ on the phone
npm test                # DSP unit tests (FFT, peaks, Goertzel, tap detector, tuner)
npm run build           # static build in dist/ for https://kudu.dev/fiona/
npm run preview         # serve the build at http://localhost:4173/fiona/
```

## Deploy
`dist/` is static. Upload its contents so that it is served at `/fiona/` over **HTTPS**
(the microphone only works in a secure context). `base` is set in `vite.config.ts`.

## Layout
- `src/audio/` — DSP (`fft`, `peaks`, `goertzel`, `tapDetector`, `tuner`) + browser engine (`engine.ts`: mic, tone, wake lock)
- `public/capture-worklet.js` — AudioWorklet that streams mic samples
- `src/state/` — `useMeasure`, `usePlayer` (hearing-protection auto-stop: 60 s), history in localStorage
- `src/components/` — UI; `src/i18n/` — PL/EN
