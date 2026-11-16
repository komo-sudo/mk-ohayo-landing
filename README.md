# OHAYO landing

Marketing landing for OHAYO — stock perpetuals (SK hynix, NVDA, SOXL …) with leverage, daily tournaments and TradeView.

Static site, no build step.

```
index.html            page markup (all sections)
assets/css/landing.css
assets/js/landing.js  hero card flip, leverage simulator, tournaments, TradeView mock, sign-up modal
docs/                 design notes
```

## Run locally

Open `index.html` in a browser, or `npx serve .`

- `?preview=1` shows the preview bar (headline A–D, hero A/B switch, designer-notes toggle).

## Design source

Figma: `ohayo00001` → page **v3 · Landing plan**
- `LANDING_import · HTML 원본 그대로` — this page, section by section
- `STATE · …` frames — interaction states (card flip, tabs, TradeView steps, modal, FAQ open, hover)
- `NOTE · …` frames — designer notes per section

Fonts: Pretendard Variable (body), Doto (LED numerals). All names, numbers and charts are samples.

## Deploy

Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml` (enable Pages → Source: GitHub Actions once in repo settings).
