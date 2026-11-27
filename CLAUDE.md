# OHAYO landing

Static marketing site for OHAYO (stock perpetuals, tournaments, TradeView). No build step.

**Always answer in Korean.** When English has to be shown (page copy, headlines, UI text, proposals), give it in two versions: the English, and a Korean translation right under it.

## Read first

- `docs/decisions.md` — what was decided and rolled back, and why. Add an entry whenever a decision is made or undone.
- `.claude/skills/ohayo-design` — layout, components, copy and Figma rules. Load before any visual or copy change.
- `.claude/skills/ohayo-motion` — motion rules. Load before any animation change.
- `docs/designer-notes.md` — the intent behind each section.

## Files

```
index.html        landing (hero types 1/2/3 via ?hero=N)
tournament.html   3type Tournament page   } copy header/FAQ/Final/footer/dialog from index.html;
tradeview.html    3type TradeView page    } edit every copy when one changes
assets/css/landing.css
assets/js/landing.js   one IIFE shared by all pages; guard page-specific blocks with if ($('id'))
```

- Hero types: `body.hero-2type` is always set (shown as 1type); `?hero=2` adds `hero-v2`; `?hero=3` adds `hero-v2` and `hero-v3`.
- The preview bar reloads the page to switch types. `?preview=0` hides it.
- Breakpoints (see ohayo-design): desktop ≥1081px is frozen; tablet 601–900px; mobile ≤600px (designed at 390px). When the user asks for a mobile change, change only the tablet/mobile tiers and confirm desktop at 1440 is unchanged.

## Sources

- Figma `ohayo00001`, file key `3TBoB0iMdjtiiIV7KmCAzw`. Page "v3 · Landing plan" (47:52); the 3type structure is node 147:50759.
  - The file mixes old and new designs. Take layout, order and menus from it, not visual style.
- Notion (ShardLab), Project OHAYO:
  - "KOL-Driven Tournament PRD — 수정 목업 기준 기획안 (2026-11-12)" (416795eb277b810bb99fe71869b48a98)
  - "1-Pager · TradeView" (feffab4380e8451b920d5b080cf31f6a)
  - These are large. Fetch them once and read the sections you need.

## Run and verify

- Dev server: `.claude/launch.json` config "landing", port 4173 (start it with preview_start).
- Check `?hero=1|2|3`, `tournament.html` and `tradeview.html` for JS errors after changes to `landing.js`.

## Never commit

`.claude/launch.json`, `assets/img/icon-retry.svg`.

## Commit and deploy

When the user says "커밋 / 배포" ("commit and deploy"):

1. Commit on `hero-3d-design-tokens`, leaving out the files above.
2. `git fetch` and check that `origin/main` is an ancestor of `HEAD`.
3. Push to both branches with the komo-sudo token:
   ```bash
   git -c credential.helper= -c credential.helper='!f() { echo username=komo-sudo; echo "password=$(gh auth token --user komo-sudo)"; }; f' push origin HEAD:hero-3d-design-tokens HEAD:main
   ```
4. The push to `main` triggers `.github/workflows/pages.yml`. Watch the run, then compare the live files byte for byte with local ones:
   - Site: https://komo-sudo.github.io/mk-ohayo-landing/
   - Add a `?v=random` query to bypass the cache.
5. If the deploy fails with an artifact error ("Fetching artifact metadata failed" / "No artifacts named github-pages"), it is GitHub's artifact service lagging, not the site.
   - Don't retry back to back; immediate retries keep failing.
   - Tell the user the commit is pushed but not live yet. Then wait 10 minutes (in the background) and start one fresh `gh workflow run pages.yml`.
   - Verify the live files after it finishes, and report.
   - If that run also fails, stop and ask the user before trying again.
   - Never re-run only the failed job; that creates duplicate artifacts.
