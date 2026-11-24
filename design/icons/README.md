# Alternative icons

Logo proposals. **A v2 is the app icon** (`public/icon.svg`, favicon, PWA icons); the others are alternatives.
All artwork is original — the bird only nods to the idea of the scene, it is not the film character.

| File | Idea | Notes |
|---|---|---|
| `a-duet.svg` | A — bird perched on a wine glass, singing, notes | Best at large sizes |
| `a2-duet-small.svg` | A v2 — same idea, simplified: big bird, bold glass, no notes | Readable down to 16–32 px; favourite for the app icon |
| `b-high-note.svg` | B — bird belts a high note, waves hit the glass, glass cracks | Busy at small sizes |
| `c-poof.svg` | C — glass + note, feathers flying where the bird was | Minimal, insider joke |

Previews (open in a browser): `preview.html` (A, B, C at several sizes), `preview-a2.html` (A vs A v2, dark and light background).

To switch to another design:
1. copy the SVG to `public/icon.svg` (header logo + PWA icon) and `public/favicon.svg` (browser tab),
2. rebuild `public/icon-maskable.svg` — full-bleed background, artwork scaled to ~0.78 around the centre
   so it survives Android's circular crop,
3. regenerate the PNGs (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
   180×180 from the maskable SVG) with headless Chrome, e.g.
   `chrome --headless=new --default-background-color=00000000 --window-size=512,512 --screenshot=… file:///…/icon.svg`.
   Below ~500 px Chrome's viewport is wider than the window, so render small sizes through an HTML page
   with `<img width=N height=N style="position:fixed;left:0;top:0">`.
