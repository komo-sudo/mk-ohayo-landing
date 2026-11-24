# Design decisions

What was decided, what was rolled back, and why. Read this before changing the landing. Add new entries at the top of the relevant section, with the date. Earlier history is in `git log`. Designer intent per section is in `docs/designer-notes.md`.

Rules that hold across the whole page are in `.claude/skills/ohayo-design` (layout, copy) and `.claude/skills/ohayo-motion` (motion).

## Working rules

- **Figma is not a pixel source.** The file mixes old and current designs. Take layout, order and menus from it and keep the code's current visual style (2026-11-24).
- **Check copy against the Notion PRD**, not the existing landing text. Condensing once dropped the join step from Tournament copy (2026-11-24).
- Never commit `.claude/launch.json` or `assets/img/icon-retry.svg`.

## Page structure

- **2026-11-24 · 3type = new page structure** (Figma v3 · Landing plan 147:50759).
  - Menu: About OHAYO / Tournaments / TradeView.
  - Tournament and TradeView each get their own page (`tournament.html`, `tradeview.html`). The landing keeps one-message intros with "View more".
  - Spotlight moves to the TradeView page.
  - Still open: the detail pages repeat the headline (intro + full section), and the full Tournament section still has the old "Daily / you trade and it counts" copy.
- **2026-11-24 · Preview bar switches types by reload** (`?hero=1|2|3`), because types can differ in structure.
- **2026-11-24 · 3type created** as a copy of 2type (`hero-v2` + `hero-v3`).
- Hero history:
  - 1type and the earlier 3type (Spline / chart heroes) were removed; headline C only ("Same move. Ten times.").
  - The current hero was then duplicated as 2type.
  - The preview bar shows by default; `?preview=0` hides it.

## Tournament

- **2026-11-24 · Condensed message: "Join, and every trade counts."**
  - Joining is what starts the count (PRD 4.2, 5.1).
  - The board card shows "Joined 09:12 · Your trades count from here" above the leaderboard where You is #2.
  - Replaced the first draft, "A new board every day / Trade the way you already do. It counts on today's board": it implied trades count without joining, and "every day" isn't in the PRD.
- Tabs scroll the panel into view on switch (standard in-page tab pattern).
- **Rolled back:** section reveal for Tournament ("필요없어").
- Background: Spline scene (Figma 45:8529) placed at the bottom of the section, rotated 180°.

## TradeView

- **TradeView is a standalone feature, not a Tournament sub-feature.** Notion 1-Pager · TradeView lives under "Next 킬러피쳐 (Post-Tournament)".
- **Condensed message: "See why they got in."** Every entry and exit is on the chart with the trader's reason in their own words.
- Assembly animation:
  - Plays **once**, when 50% of the section is in view: the title first, then the UI pieces come in from a random depth.
  - **Rolled back:** loop/review mode, and the 50% slower speed.
- Section padding is doubled (216px).

## Sections and motion

- **Creators:**
  - Title "They trade here. So can you.", 9 sample cards, placed under the ticker strip.
  - Reveal: cards in order, then the title.
- **Compare:** reveal with the title first, then the table rows.
- **Today's board strip:** fades out once it enters the top 60% of the viewport (was 20%).
- **Dot-wave backgrounds:**
  - Creators → through Try it, flowing left to right.
  - Spotlight → through Get started, flowing bottom to top.
  - Final CTA.
- **Get started mockups:** 0.5s in/out. The tournament background sits at the section bottom.
- **Final CTA:** candidate 4 (desktop trading screen, Figma 118:24391), live data, radial vignette, 20% larger, layout from Figma 45:9040. Candidates 1–3 are kept `hidden` in `index.html`.
- **Hero:** the title sits above the LED wipe (z 6), except during the intro, when it drops to z 1 (that fixed a grey-shadow bug).
- **2type belt:** short run first, chart-style background with the ticker label on the head candle (Figma 141-47868), a smoothed label and linear chart speed.

## Performance

- 2026-11: Spline renders only while on screen; the CTA canvas redraws only when it changes; the belt is capped at 60fps; dot-waves are drawn at 30fps at 1x resolution.
- Result: main-thread time fell from 970 / 530 / 500 to 7 / 52 / 77 ms per second (TradeView view / Final CTA / Hero).
