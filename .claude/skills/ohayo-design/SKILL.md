---
name: ohayo-design
description: Visual, layout and copy rules for the OHAYO landing and its detail pages (index.html, tournament.html, tradeview.html, assets/css/landing.css). Use before adding or changing any section, card, board, button, menu or page copy, before building or editing a Figma frame for the landing, and whenever the user shares a Figma link to implement. Pair with ohayo-motion for anything that moves.
---

# OHAYO design

The landing should read as one product: a single dark column, short claims paired with boards you can operate, numbers in LED. These rules come from the code as it stands and from decisions the designer made in conversation (full log: `docs/decisions.md`). When a request conflicts with a rule here, the request wins; add the change to `docs/decisions.md`.

## 1. Source of truth

1. **The code is the design reference, not Figma.** The Figma file (`ohayo00001`, key `3TBoB0iMdjtiiIV7KmCAzw`) mixes old and current designs. From a Figma link, take **layout, order, menu structure and copy**. Take visual style (colour, type, spacing, components) from `landing.css` and the existing sections. Never redraw a section just because Figma shows it differently. Copy the visual details only when the user says "이대로" or "똑같이" or names the exact node to match.
2. **Product facts come from Notion, not from existing landing copy.** The current tournament PRD is "KOL-Driven Tournament PRD — 수정 목업 기준 기획안 (2026-11-12)" and the TradeView doc is "1-Pager · TradeView". Check claims against them before writing or condensing copy (see §5).
3. **Tokens only.** Use the `:root` variables in `landing.css` (OHAYO Design System, Figma 02 Color / 03 Geometry). Don't add new hues. The one approved exception is the hero intro/LED-wipe palette in the ohayo-motion skill.

## 2. Foundations (from `landing.css`)

| Role | Token / value |
|---|---|
| Page | `--bg-base` #000. Dark only, by choice. |
| Raised surface (cards, boards) | `--bg-raised` #121212, 1px `--bd-strong` (white 12%) |
| Accent | `--bg-primary` / `--fg-primary` #ff5a00. Eyebrows, highlights, focus ring, "you" rows. |
| Up / down | `--fg-positive` #11ec8a / `--fg-negative` #ff4b4e. Only for gains/losses and long/short. |
| Text | `--fg-base` #fafafa, `--fg-subtle` #b0b0b0 (ledes), `--fg-muted` #909090 (labels, notes) |
| Radii | card 6, control 8, tag 4, tcard 12, avatar full |
| Body font | Pretendard Variable (`--font-body`) |
| LED font | Doto (`--font-led`). Eyebrows, board labels, chips, big numbers. Never body copy. |

Type scale: h1 clamp(38–68px)/700; h2 clamp(28–44px)/700, line-height 1.08, −0.02em; h3 18/28 600; lede 18/31 `--fg-subtle`, max 56ch; eyebrow 14px Doto 700 uppercase, 0.08em, accent.

Inside `.tcard`, numbers switch back to the body font (`.tcard .led`). Keep that: tournament cards copy the app's card, not the LED board.

## 3. Layout

- Content column `.wrap`: max 1120px, 20px side padding (Figma: x 180 on a 1440 frame).
- Sections: 108px top/bottom (84px under 900px) and a 1px `--bd-strong` rule on top. Exceptions are deliberate: TradeView 216px, Tournament has no rule (its 3D scene runs up into the section above).
- **Section head pattern:** `.sec-head` stack → eyebrow → h2 → lede, 14px gap, 32px below. Then the board/cards.
- **Two-column sections** (copy + visual) collapse to one column at 900px with the copy first.
- **Boards** (`.board`) are the interactive mock surfaces. Label them with `.board-label` (Doto, muted, uppercase) and mark samples ("sample", "Sample wallets…").
- Header: floating 1126px bar, 12px from top, hides on scroll down. On ≤900px the menu is hidden (no mobile menu yet).

## 4. Components to reuse (don't rebuild)

| Need | Use |
|---|---|
| Primary / secondary action | `.btn.btn-primary` (inverse white) / `.btn.btn-ghost`; `.btn-sm` in headers and boards; `.linkbtn` for tertiary |
| Toggle / filter | `.chip` with `aria-pressed` |
| Tournament card | `.tcard` > `.tc-status` (`.st.st-live` + `.badge`), `.tc-title` (`.av` 40px), `.tc-stats` (3 cols), `.tc-prog`, `.tc-foot` |
| Leaderboard row | `.lb-row` (`.you` = accent-subtle fill + accent ring, `.tagx` label) |
| Trader / chart board | `.tv-detail` > `.tv-top`, `.tv-svg` (draw with `tvChart(trader, fill)` in landing.js), `.tv-fill`, `.why` (own words) / `.why.ai` (AI read) |
| Long/short tag | `.side` / `.side.short` |
| Feature grid | `.card` with `.tag` + h3 + p |
| 3type intro sections | `.promo` + `.promo-grid` (`.promo--flip` puts the visual left) |
| Sign-up | any `[data-open="tournament|tradeview|both"]` opens the one shared dialog `#reg` |
| Background | `.dot-wave` canvas (`data-dir`, `data-through`) — see ohayo-motion |

Interactive states: hover `--bg-selected` / `--bd-control-hover`, press `--bg-pressed`, focus 2px `--bd-focus`. Primary buttons brighten, never change hue.

## 5. Copy

- **English, short, concrete.** One claim per heading. Write in the trader's terms (ticker, long/short, 10x), not crypto jargon. Deposits and crypto mechanics belong in FAQ/Get started, not up front.
- **Samples are labelled.** Every name, number and chart is a sample and says so in a `.muted` line or the board label.
- **Real limits only:** SK hynix 10x max, NVDA 20x max. Deposit from $5.
- **Accurate to the plan (PRD), especially when condensing.** Tournament rules people get wrong:
  - You must **join** a tournament. Logging in or opening a link isn't joining.
  - Only trades **from the moment you join** count (aggregation window [max(start, joined), end)). Never write "trade the way you already do and it counts" without the join step.
  - The minimum USDC balance is checked once at joining. It's not a fee and nothing is locked. Default 300, KOL ≥100, OHAYO-run can be 0.
  - The minimum traded volume is a **prize** condition, not an entry condition.
  - "Every day" cadence is not in the PRD. Durations are ≥1h in 1h steps. Don't promise daily unless the user confirms.
  - Users see OHAYO-run tournaments plus those of the KOL they're linked to.
- **TradeView is its own feature, not part of Tournament.** It shows real trades and reasons; nothing is placed for you ("not copy trading"). Launch: January 2027.
- Message hierarchy for condensed sections: Tournament → "Join, and every trade counts."; TradeView → "See why they got in."

## 6. Page structure and hero types

- `index.html` always has `body.hero-2type` (legacy name; shown as 1type). `?hero=2` adds `hero-v2`. `?hero=3` adds `hero-v2` + `hero-v3`. Scope type-only changes to the highest class so lower types stay untouched.
- The preview bar switches types by **reloading** with `?hero=N`. Types may differ in structure, and scroll/background setup runs once at load.
- **3type** (Figma "v3 · Landing plan" 147:50759): the menu links to pages (About OHAYO / Tournaments / TradeView). The landing shows `.v3-only` intros with "View more"; `.v3-hide` drops the full Tournament, TradeView and Spotlight sections.
  - `tournament.html`: intro → full Tournament → FAQ → Final.
  - `tradeview.html`: intro → full TradeView → Spotlight → FAQ → Final.
- Detail pages share `landing.css`/`landing.js` and **copy** header, FAQ, Final, footer and dialog markup from `index.html`. Edit every copy when one changes. `landing.js` must keep guarding page-specific blocks (`if ($('id'))`) so it runs on every page.

## 7. Building in Figma

- Use `use_figma` with fonts Pretendard Variable and Doto (no local variables in the file). Build editable layers. Never paste a screenshot as the design.
- Put new work on its own page or next to the source frame, sections stacked with no gaps (y = previous y + height).
- Check the result with one screenshot. Report node ids and the page link.

## 8. Before reporting done

- Load every affected page: index `?hero=1|2|3`, `tournament.html`, `tradeview.html`. Check for no JS errors (headless check script pattern: CDP `Runtime.exceptionThrown`).
- Check at 1440 and under 900px. 1type/2type must be unchanged unless asked.
- State what you didn't verify, and any copy that conflicts with the PRD.
