# Design decisions

What was decided, what was rolled back, and why. Read this before changing the landing. Add new entries at the top of the relevant section, with the date. Earlier history is in `git log`. Designer intent per section is in `docs/designer-notes.md`.

Rules that hold across the whole page are in `.claude/skills/ohayo-design` (layout, copy) and `.claude/skills/ohayo-motion` (motion).

## Hidden for now (restorable)

- **2026-11-27 · Launch-update sign-up buttons hidden** (desktop and mobile). Every `[data-open]` button that opens the email sign-up dialog (`#reg`) is hidden by one block at the end of `assets/css/landing.css` ("HIDDEN FOR NOW").
  - Landing: the hero's "Not ready yet? Get launch updates", "Notify me when tournaments open" (#tournament), "Notify me at launch" (#tradeview), the final CTA's "Get launch updates".
  - tournament.html: "Notify me when tournaments open", the final CTA's "Get launch updates".
  - tradeview.html: "Notify me at launch", the final CTA's "Get launch updates".
  - Tournament cards (built by landing.js): the "Notify me" link.
  - The markup, the dialog and its JS are untouched. **To restore, delete that CSS block.**

## Working rules

- **Figma is not a pixel source.** The file mixes old and current designs. Take layout, order and menus from it and keep the code's current visual style (2026-11-24).
- **Check copy against the Notion PRD**, not the existing landing text. Condensing once dropped the join step from Tournament copy (2026-11-24).
- Never commit `.claude/launch.json` or `assets/img/icon-retry.svg`.

## Page structure

- **2026-11-27 · Breakpoints for 3type** (details in the ohayo-design skill):
  - Tiers: desktop ≥1081px is frozen; tablet 601–900px; mobile ≤600px, designed at 390px. Mobile requests change only the tablet/mobile tiers.
  - Below 900px: a hamburger opens a full-screen menu built from the page's own menu.
  - Tournament hero below 900px: a 390px portrait storyboard frame, scaled up on tablets.
    - Fixed 2026-11-27: words used to jump about 20–115px when they landed on phones. Their landing spot double-counted the slot offset, because the slots are plain flow there. They now land within 1px.
    - The phone composition fills the screen height: the frame scales to the width, and the free height is spread 40% before the list and 20% before each of its last three rows (to about 62px above the screen's foot).
  - TradeView fan below 900px: centre on the screen's bottom-right corner, sized to sit under the copy. The fan's scale and its rotation live on two layers (.tvf-ring / .tvf-spin). On one element the rotation was lost and the fan stood still on small screens.
  - The tablet/mobile rules live in one block at the end of landing.css.
  - The landing hero (`.fold`) fills the viewport above the ticker strip on tablet and mobile too, as on desktop.
  - Phones only (≤600px), the 2type/3type hero belt follows Figma 178:51218. A 360×360 stage sits on the ticker strip, scaled to the width or to the room under the copy:
    - Ticker + % label at top left.
    - 10x / 20x at left middle (36px).
    - STOCKS at bottom left; a loss hangs below it.
    - OHAYO on the right, its amount (36px) on top of the block, captions on one baseline.
    - Both stacks are 24 dots a row; the flowing chart stays behind at 35%.
    - The run-up caption ("OHAYO · SHORT 20X") enters only as large as the room to the screen edge allows, so it is never cut.
    - 240px is kept under the copy for the graph; 844px-tall phones still fit one screen, shorter ones scroll a little.
  - Phones (≤600px): the Creators section shows the first three cards only (Semi Hunter, Night Desk Jay, Chart Mina).
  - Phones (≤600px), Compare table: two columns. Each row's title is a full-width label above the broker and OHAYO cells, so nothing scrolls sideways or gets cut. The OHAYO column has no background shade on phones.
  - Phones (≤600px), final CTA: the live trading screen sits above the title and buttons.
  - Phones (≤600px), tournament card strips: full-bleed sideways scroll with no scrollbar. A side with more cards beyond it fades into black (72px right, 40px left).
  - Phones (≤600px), TradeView picker: the filter chips are gone (All). Collapsed, only the selected trader shows, as a compact row with a dropdown arrow. Tapping it opens every trader; picking one selects it and closes the list (tap outside or Esc closes too).
  - Phones (≤600px), Try it board: both sample-trade chips on one line (11px); the trade (ticker, side, trader) and its P&L in two blocks side by side; the Put in amounts on one line (12px). The chart is 184px tall (desktop 264) so the whole board fits on one screen. Chip text is centred with a small top nudge (2px tabs, 1px amounts), because Doto glyphs have no descender and otherwise sit high.
  - Phones (≤600px): the header shows only the logo and the menu button. "Get the app" is removed from the header; it stays in the hero and in the full-screen menu.
  - Phones (≤600px): the page intro's counting number is 17% of the screen width (56–96px) instead of a 96px floor, so nothing is cut at the slam or during the OHAYO plate wipe.

- **2026-11-24 · 3type = new page structure** (Figma v3 · Landing plan 147:50759).
  - Menu: About / Tournaments / TradeView ("About OHAYO" shortened to "About" on 2026-11-26).
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

- **2026-11-25 · tournament.html hero v2: the storyboard (Figma 75:10785, 14 cuts).**
  - The inverting dot-type hero (v1) is hidden, kept in `<template id="tour-hero-v1">` in tournament.html.
  - Cuts: headline giant → headline and lede shrink into place → each fact enters its own way (slides in, swings in tilted with depth, flies forward out of a giant 10% word, rides a black panel across, lands while a giant line scrolls past) and settles into a list → hold → the headline grows back. 14.3s loop.
  - Depth after the Pinterest reference: big type shrinking and turning in 3D into small type.
  - Built in Figma pixels inside a scaled 1440×1020 frame: ghost copies at their largest size fly into the real slots, so the type stays crisp.
  - Narrow screens and reduced motion show the last cut, still.
  - 2026-11-25 · Cuts after C3 removed. The new C4 (Figma 158:50828) is the final composition, weight 800: Ranked 3 ways / profit return volume / No entry fee / Join late… / Paid within…
    - Each of the 7 layers grows from scale 0 / opacity 0 to full in 500ms (out, no overshoot), starting at a random moment within 1.2s; the order is reshuffled every loop.
    - Changed the same day: random order → top to bottom (reading order), one layer every 0.3s, each growing over 0.6s, so it reads easily. Hold 3.3s; 9.9s loop.
    - Entry changed from scale 0→1 to a 3D swing: each layer is hinged on its left edge and turns rotateY 90° → 0° like a closing door (perspective 900px), fading in on the way. (−90° → 0°, an opening door, was tried first.)
  - The hero's objects size to the viewport: the 1440×1020 frame scales to fit both width and height (the whole composition to y 835 plus 40px clear), and the C1 headline uses Figma's tight line spacing (0.92), so nothing is cut on short screens.
    - Hold 3s, then the layers fade and the headline grows back. 8.9s loop.

- **2026-11-25 · tournament.html hero rebuilt** (Figma 147:50615, copy option A).
  - Headline only: "Always know what the next rank takes." No lede, no button; the board card is no longer on the page hero.
  - Four facts: No entry fee / Ranked 3 ways: profit, return, volume / Join late, count from then / Paid within 5 business days.
  - First version (a wave crest rewriting the line) was rejected: "doesn't feel like motion graphics".
  - Now, after the designer's reference (a Pinterest kinetic-type reel: one word per beat, hard cuts, frame inverting black/white):
    - A small lead line cuts in, then big punch lines on the 0.5s beat, and the full-width band inverts on each punch. "profit | return | volume" replace one another; "5 business days" is typed.
    - Each line enters with a short dot smear; the last state holds 3 beats; about 11.5s a loop.
  - The dot style stays (6px grid aligned to the dot-wave). The white band carries the dot-wave inverted.
  - 2026-11-25 · Inversion now covers the whole section (the floating header excepted), and the headline flips colour with it.
  - The headline is hidden while facts 1–4 play. It then cuts in on the beat in chunks (Always | know what | the next | rank | takes.), inverting on each, and holds 2s before the loop restarts (about 13.5s).
  - The hero is as tall as the viewport (100svh), no longer the fixed 1085px from the Figma frame.
  - Each fact gets its own type layout after the Figma storyboard 75:10785 (layout only; style and colour stay ours, weight 900):
    - No entry fee: one centred line.
    - Ranked 3 ways: a small line over a big punch.
    - Join late / Paid within: two equal lines, with a big "5".
    - Every block's last baseline sits 70% down the section. Timing and animation unchanged.
  - Hard cuts override ohayo-motion's "transform, don't cut", by request, for this piece only. Inversions stay at or under 2 per second.

- **2026-11-24 · tournament.html hero** (Figma 147:50615):
  - Fills the viewport (100svh), content centred, over a dot-wave background.
  - The intro card has no border or background, on every page.
  - Card motion: LIVE blinks slowly (3.2s); "Ends in" counts down; players rise by 1–3 every 2–5s; return % eases within fixed bands. Ranks don't change, since a rank change within seconds isn't believable.
  - Kept the "Joined 09:12" strip, although this Figma copy predates it.
  - The landing's Tournament intro uses the same design (`.promo--hero`: viewport height, dot-wave). Only the button differs: View more on the landing, the notify button on the page.
- **2026-11-24 · Page heroes split from landing intros.** tournament.html and tradeview.html heroes are `.phero` (ids `tour-hero`, `tv-hero`). The landing intros are `.promo` (`tour-intro`, `tv-intro`). They are designed separately from now on. Card motion (`[data-p-live]`) and the TradeView chart (`.tvp-svg`) are shared behaviour only.
  - The landing Tournament intro: no rule above or below; the dot-wave sits under the content.
  - Landing intros (Tournament and TradeView) are 1120px tall, the height of Slide the leverage (#simulate), not the viewport. Both have a dot-wave. The TradeView intro board has no edge or dot texture; the chart keeps its black backdrop and outline.
  - The landing TradeView intro steps through every buy and sell automatically (3s each, then loops). Each step shows the marker, what was done, the reason in the trader's words and the AI's read. Clicking a marker jumps to it. Votes and comments from the full board are left out.

- **2026-11-24 · Condensed message: "Join, and every trade counts."**
  - Joining is what starts the count (PRD 4.2, 5.1).
  - The board card shows "Joined 09:12 · Your trades count from here" above the leaderboard where You is #2.
  - Replaced the first draft, "A new board every day / Trade the way you already do. It counts on today's board": it implied trades count without joining, and "every day" isn't in the PRD.
- Tabs scroll the panel into view on switch (standard in-page tab pattern).
- **Rolled back:** section reveal for Tournament ("필요없어").
- Background: Spline scene (Figma 45:8529) placed at the bottom of the section, rotated 180°.

## TradeView

- **2026-11-25 · tradeview.html hero rebuilt** (Figma 161:51190).
  - Viewport height, dot-wave background.
  - Copy option A: "Find the trader worth watching." plus its lede, top left.
  - The trader board example is removed. In its place, the nine creator cards from the About page sit on a ring (radius 560, centred low on the right) so the top half reads as a fan; it turns once every 120s and pauses off screen.
  - Same day: cards turned to lie along the radius like spokes, at −90° in Figma's terms (90° clockwise). Every card one height, 108px: the median of their natural heights, the same as on the About page. The name is held to one line and the info line to two, with an ellipsis. (80px was tried first: too small.)
  - Headline and lede enter with the tournament C4 swing: hinged left, rotateY 90° → 0° over 0.6s; headline at 0.2s, lede at 0.5s. Plays once on load.
  - 2026-11-26: the lede no longer swings. It surfaces slowly from the dark: 1.4s from 0.5s, opacity 0→1 with blur 6px and brightness 0.2 lifting to normal.

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
