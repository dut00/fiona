# Social preview image (OpenGraph)

| Source | Output (1200×630) | Language |
|---|---|---|
| `og-image.svg` | `public/og.png` | Polish — not referenced; swap the URL in `index.html` to use it |
| `og-image-en.svg` | `public/og-en.png` | English — used by `og:image` / `twitter:image` in `index.html` |

Link previews (Messenger, WhatsApp, Discord, …) don't support SVG, hence the PNG.

To regenerate after editing an SVG (Windows, headless Chrome):

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="C:\\CODE\\fiona\\public\\og.png" "file:///C:/CODE/fiona/design/og/og-image.svg"

# English: same command with og-image-en.svg → og-en.png
```

Use absolute paths. The output path is resolved by Chrome, not by your shell.

Messenger and Facebook cache previews. After changing the image, re-scrape the URL in the
[Sharing Debugger](https://developers.facebook.com/tools/debug/).
