---
name: ohayo-motion
description: Motion and animation rules for the OHAYO landing page. Use before building or changing any animation, transition, counter, loader, hover/press state, scroll reveal, canvas/Spline scene behaviour or storyboard-driven sequence in this repo (index.html, assets/css/landing.css, assets/js/landing.js), and whenever the user shares a Figma storyboard for motion.
---

# OHAYO motion

The landing's motion should read as one system: time-driven, beat-aware, no bounce, no cuts. These rules come from the hero belt-scroll sequence, the tournament section, and a reference showreel the designer chose (Prompt Motion, "Claude motion design showreel"). When a rule here conflicts with an explicit request in the conversation, the request wins. Note the change for later.

## 1. Principles

1. **Something happens on a beat.** Lay sequences on a grid. The default beat is 0.5s; sub-beats are 0.25s. Scene changes, reveals and number landings fall on beats. No still hold longer than 0.5s *inside* a sequence. End-of-loop holds of 1.2–1.5s are fine, as long as something still breathes or moves.
2. **Transform, don't cut.** Prefer a shape or element becoming the next thing over crossfades and hard cuts. Examples: a word contracts into the dot, a caption shrinks into its slot, a circle expands into the next scene. A plain opacity fade is acceptable only for an element's very first appearance or its exit at loop end.
3. **One idea per beat, one trigger per idea.** Every motion has a cause the viewer can read. Tie dependent elements to the driving value, not to wall-clock time. Example: the grid and the tail start when OHAYO's amount leaves +$0, not "at 5.4s".
4. **Values drive visuals.** Counters, dot fills, bar heights and the % label are all computed from the same underlying number, so they never disagree (+$48 means 48 lit dots).
5. **Restraint.** One typeface family per moment (Pretendard; Doto only for LED/eyebrow). Colours come from DS tokens (`--fg-positive`, `--fg-negative`, `--fg-primary`, neutrals). No new hues.

## 2. Easing (use only these)

| Name | Use | CSS | JS |
|---|---|---|---|
| out | entrances, counters landing, things settling | `cubic-bezier(0.2, 0.7, 0.2, 1)` | `1 - Math.pow(1 - x, 3)` |
| in-out | moving between two resting places (caption to slot) | `cubic-bezier(0.45, 0, 0.55, 1)` | `x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2` |
| smoothstep | continuous drivers (slope, speed ramps) | n/a | `x*x*(3 - 2*x)` |
| linear | belts, marquees, constant scrolls only | `linear` | `x` |

**Banned:** bounce/back/elastic overshoot (`easeBack`, springs with overshoot), `steps()` for anything meant to feel alive, `ease`/`ease-in` on entrances.

## 3. Durations

| Token | ms | Typical use |
|---|---|---|
| micro | 150 | hover, press, focus states |
| short | 300–400 | small reveals, ring/badge pops, 10x landing |
| base | 500–800 | copy slide-in, caption moves, fades of scene elements |
| long | 1000–1600 | breathing loops (LIVE dot 1.6s), brake/stop phases (1.2s) |
| sequence | 10–17s | hero runs (belt run ≈ 16.6s incl. intro, move, brake, hold) |

Stagger siblings by 80ms (copy lines) or 1 beat ÷ n for a group of n cards.

## 4. Build rules (how to implement)

- **Time-driven.** Sequences are a pure `render(t)`/`draw(t)` of elapsed time inside one `requestAnimationFrame` loop. Precompute paths and arrays up front. No `setTimeout` chains, and no state carried between frames other than run counters. This makes any frame reproducible and testable.
- **Compositor-only properties** for DOM motion: `transform`, `opacity` (plus `filter` sparingly). Canvas for anything with many marks (grid, tails, dots).
- **Loop continuity.** Carry world offsets across runs so backgrounds never jump. Fade only the foreground at loop seams.
- **Respect `prefers-reduced-motion`.** Render the meaningful end state, statically. Stop loops, pulses and marquees.
- **Pause what isn't seen.** Spline/WebGPU scenes and canvas loops stop when hidden (IntersectionObserver, `display:none`, other hero type). Never render a 0-size canvas.
- **Hover/press/focus** on every interactive element, built from DS tokens: hover `--bg-selected` and `--bd-control-hover`; press `--bg-pressed`; focus ring `--bd-focus`. Lift at most 2px. Primary-filled controls brighten (`filter: brightness(1.12)`) instead of changing colour.

## 5. House patterns (already in the codebase; reuse, don't reinvent)

- **Belt scroll (hero 2type):** fixed dot, 10% white grid scrolls right-to-left (long: grid moves down; short: up). The belt accelerates through the move (up to 2.2x), then brakes.
- **Tail** = the dot's own recent path. Its length follows speed: 85px at cruise, about 3x at full speed, 0 when stopped. Linear gradient from transparent at the tail end to solid by 65%.
- **Start gating:** while the driving amount reads zero, show only the round dot. No tail, no grid. Both grow in over 0.7–0.8s from the first non-zero moment.
- **Grid alpha** = 10% × speed factor × start gate. It is invisible at rest.
- **Ignition intro** (beats 0–3, after the reference showreel's opening): a core dot at 1/3 size lights. Coloured arc segments in the showreel's palette (cream #f4f1e8, lime #c8e34b, violet #8a7cff, cobalt #3b57e6, coral #ff6a4d, amber #f2b84b, plus the run colour; the user approved going beyond DS tokens for this effect only) orbit it on several radii (~3–11 dot radii), each with its own speed and direction. Three thin full rings expand from the core and fade. On beats 2–3 the orbit spins up, pulls inward and collapses while the core swells to the full dot. Then the label slides out. (This replaced the earlier "L O N G" / "S H O R T" title.)
- **Captions:** typed in at 2x (character by character), then scale down to 1x into their slot with in-out over ~350ms.
- **LED dots:** one dot per unit ($1). Rows fill bottom-up (losses hang top-down). The amount label rides on top of the lit stack. Progress tracks show whole 7px columns only, and fills round to whole dots (`round()` to the pitch). **Never show a half dot.**
- **LED wipe between runs** (modelled on the showreel's dot grid): a full-stage matrix of whole dots on a 24px pitch, on its own canvas above the belt.
  - A crest of near-touching circles (0.95 of the half-pitch) travels out from the stage centre, with a Gaussian swell of about ±0.075 of the corner distance.
  - Dots away from the crest are small rounded diamonds; large ones are circles.
  - Colour follows the crest: cream on it; lime, amber, coral, then the next run's colour inside it; near-black LEDs (#2b2b2b, #1c1c1c) outside and far behind. No blue/violet in the wipe.
  - Cover (last beat): the crest sweeps out and leaves a medium, gently rippling field lit behind it.
  - Reveal (first beat of the next run): a second crest sweeps out and switches the field off behind it.
  - The hero copy stays above as the anchor.
- **Multiplier landing** (10x / 20x): appears the moment the OHAYO stack completes. 400ms, 0.8→1 scale, out easing, no overshoot.
- **LIVE indicator:** breathing dot (100%↔45%, 1.6s, in-out) plus a ring spreading to 2.6x and fading.
- **Page intro (kinetic type, 2type):** runs once whenever the 2type hero is shown, before the belt. Evidence before the claim, using the belt's numbers:
  - A cream plate rises: "SK HYNIX · SHARES", and the number counts +0.0% to +4.8%.
  - At 1s an OHAYO-orange plate wipes over it: "OHAYO · LONG 10x", and the same number keeps counting +4.8% to +48% with a speed trail, then lands extruded (lime/cobalt stack).
  - Numbers slam in with an 8px blur and a 1.15 to 1 scale.
  - At 2s the stack wipes up and "Same move. Ten times." drops in word by word (70ms stagger) at centre stage.
  - At 2.5–3.05s it FLIPs into the real h1 box (pixel-exact, same line breaks), the h1 takes over without a fade, and the rest of the copy rises in its 80ms stagger.
  - `herointrodone` then starts the belt. (Chosen over word-per-plate because showing the move before naming it is more persuasive.)
- **3D backgrounds** (Spline): sit behind content with a transparent→black gradient burying the lower part. Zoom via camera FOV from the canvas aspect so the field always fills the frame, never exposing its edges.

## 6. Reading storyboards (Figma)

1. Pull frame metadata and screenshots for every cut. List each element's position per cut and the deltas between cuts.
2. For each cut, write `time | trigger | what changes | easing`. Ask only if a trigger is genuinely ambiguous. Otherwise infer from the numbers on screen (which value changed between cuts).
3. Positions are relative to the content column (copy left edge = storyboard x 180 on a 1440 frame). Convert to offsets from that edge, not absolute pixels.
4. If the storyboard is a Figma prototype/animation, prefer the `figma-implement-motion` skill to read exact timings instead of interpolating between stills.
5. Static storyboards don't show motion between cuts. Fill the gaps with these rules, then report what you assumed.

## 7. Banned (from the reference showreel and this project)

Particle bursts, glows, lens flares, camera shake, RGB split, crossfades between scenes, generic gradients, bouncy easing, `steps()` blinking, holds over 0.5s mid-sequence, partially lit dots, tails or grids shown at zero, anything that reads as a template.

## 8. Verify before reporting done

- **Sample, don't eyeball.** Read values every 100–250ms over a full loop (opacity, transforms, label text, canvas pixel alpha/extent). Report a short table of time → values.
- **Check every variant:** both runs (long and short), 1type and 2type, ~1920 and ~1280 widths, reduced motion.
- **Check for errors:** console clean (no WebGPU 0-size errors). No layout shift in the surrounding page.
- **Be honest about what you can't do.** You can't watch motion in real time. Say so, and leave "feel" judgments (smoothness, rhythm) to the user after showing the sampled numbers.
