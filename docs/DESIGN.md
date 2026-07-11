# DESIGN.md — Game Boy-Authentic Platformer Reference

Actionable reference for building a GB-authentic HTML5 canvas platformer.
All frame-based values are converted to per-second assuming **60 fps** (the real
DMG runs at ~59.73 fps — close enough that a 60 fps `requestAnimationFrame` loop
with fixed-timestep physics is authentic).

---

## 1. Display & Palette

### Core hardware constraints (emulate these strictly for authenticity)

| Constraint | Value | Implication for canvas |
|---|---|---|
| Resolution | **160 × 144 px** | Render to a 160×144 offscreen canvas, scale up with `image-rendering: pixelated` at integer multiples (×3 = 480×432, ×4 = 640×576) |
| Tile grid | **8×8 px tiles** → 20 × 18 tiles visible | Build all art/levels on an 8px grid; level data as tile indices |
| Colors | **4 shades total**, one palette | Every pixel on screen must be one of exactly 4 colors |
| Sprites (OAM) | **40 sprites max**, 8×8 or 8×16 px | Cap simultaneous movable objects at 40 |
| Sprites per scanline | **10 max** — hardware drops the rest (flicker) | Optional authenticity: hide/flicker sprites when >10 share a row |
| Refresh | **~59.73 Hz** (LCD driven by 4.194 MHz dot clock) | Fixed 60 fps timestep |
| Sprite transparency | Color 0 of a sprite is transparent | 3 usable shades per sprite + transparency |
| Background | 256×256 px (32×32 tile) wrapping map, scrolled by SCX/SCY | Camera = integer pixel scroll offsets; no sub-pixel rendering |

### Palettes (hex)

**Original DMG "pea-soup" green** (the canonical retro look):

| Shade | Hex | Use |
|---|---|---|
| Lightest | `#9bbc0f` | Sky / background |
| Light | `#8bac0f` | Mid highlights |
| Dark | `#306230` | Shading, outlines |
| Darkest | `#0f380f` | Black-equivalent, text, player outline |

**Game Boy Pocket** (yellower/olive-gray screen — grays with a warm beige cast;
GrafxKid's widely used approximation from Lospec):

| Shade | Hex | Use |
|---|---|---|
| Lightest | `#e0dbcd` | warm off-white |
| Light | `#a89f94` | warm light gray |
| Dark | `#706b66` | warm dark gray |
| Darkest | `#2b2b26` | near-black with olive tint |

Implementation tips:
- Store the palette as a 4-entry array and index into it everywhere (exactly
  like the hardware's BGP register). A palette swap (DMG ↔ Pocket, or a
  "damage flash" that inverts the mapping) is then one array change.
- Authentic GB fades are **palette steps, not alpha fades**: fade out = remap
  all 4 indices toward index 0 over 3–4 steps (~4–8 frames per step).
- Never anti-alias; disable `imageSmoothingEnabled`.

---

## 2. Physics Reference

Hard numeric data for Super Mario Land itself is thin (TASvideos documents that
SML stores Mario's speed **in whole pixels per frame with no subpixels** — the
game's physics are chunkier than SMB's), so the reference numbers below combine
what is documented for SML/SMB-family games with modern game-feel research.

### Documented GB-era characteristics

- **SML speeds are integer px/frame.** SML2 achieves in-between speeds by
  oscillating 1,2,1,2 px/frame (~90 px/s effective). Practical targets:
  walk ≈ **1 px/frame (60 px/s)**, run ≈ **1.5–2 px/frame (90–120 px/s)**.
- **Variable jump height via button hold** is core to the whole Mario family:
  an instant upward velocity on press, then gravity — with **weaker gravity
  while A is held and ascending**, stronger once released or falling.
  TASvideos notes SML enemy-bounces give "a much larger jump boost by holding
  the A button" — hold-sensitivity applies even to bounces.
- **Gravity asymmetry (fall faster than you rise)** is measured across Mario
  games: video analysis finds roughly **3.5g-equivalent during held jumps vs
  ~5.7–6.9g when falling/short-jumping** — i.e. falling gravity ~1.6–2×
  rising gravity. SML even has a quirk where clipping a platform edge switches
  Mario to the faster "cliff-fall" descent rate.
- **Jump height:** SMB standing jump ≈ **4 tiles** (5 with run speed); SML is
  comparable (Mario clears 4-block walls from a standstill). Design levels so
  a standing jump clears 3 tiles comfortably and 4 at max hold.
- **DK'94** layers verb-rich movement (handstands, backflips) on the same
  hold-to-jump-higher core; its levels are tuned so specific moves reach
  specific heights — decide your max jump in tiles first, then build levels
  around it.

### Recommended starting values (16px "metatile" = 2×2 hardware tiles; tune by feel)

Using px/frame internally at 60 fps (multiply by 60 for px/s):

| Parameter | px/frame | px/s | Notes |
|---|---|---|---|
| Max walk speed | 1.0 | 60 | ~1 hardware tile per 8 frames |
| Max run speed | 1.75 | 105 | reach full screen crossing in ~1.5 s |
| Ground acceleration | 0.0625/f² | 225 px/s² | ~16 frames to full walk speed |
| Deceleration (release) | 0.0625/f² | 225 px/s² | symmetric feels GB-authentic |
| Skid (reverse held) | 0.125/f² | 450 px/s² | 2× decel + optional skid dust/sfx |
| Jump initial velocity | −3.6 | −216 | tune so max jump ≈ 4 tiles (32 px) |
| Gravity (A held, rising) | 0.12/f² | 432 px/s² | |
| Gravity (released / falling) | 0.25/f² | 900 px/s² | ~2× rise gravity = snappy descent |
| Terminal velocity cap | 3.5–4.0 | 210–240 | never exceed ~ jump speed; keeps falls readable on a 144px-tall screen |

Sanity check: with v₀ = 3.6 px/f and held gravity 0.12 px/f², max jump height
= v₀²/2g = 54 px ≈ 3.4 metatiles... adjust v₀/g in tandem to hit your target
tile height; the *shape* (hold-gravity < fall-gravity, hard velocity cap,
integer-pixel rendering) matters more than exact magnitudes.

Minimum-jump rule: on button release while rising, clamp upward velocity (e.g.
`vy = max(vy, -1.0)`), giving a short hop of ~1 tile.

### Modern game-feel layer (invisible, retro-compatible)

From Celeste's published forgiveness design and general platformer-feel
practice — all invisible to the player, all worth adding:

| Technique | Value | At 60 fps |
|---|---|---|
| **Coyote time** (jump allowed after walking off a ledge) | Celeste uses 5 frames; 5–8 recommended | **~83–133 ms** |
| **Jump buffering** (press just before landing still jumps) | 6–9 frames | **~100–150 ms** |
| **Apex hang** | Halve gravity while `abs(vy) < ~0.5 px/f` and jump held | brief float at the arc's top; makes jumps feel controllable |
| **Corner correction** | Nudge player sideways up to 2–4 px around head-bonk collisions | prevents "unfair" ceiling clips |
| **Terminal velocity** | cap fall speed (see table) | with only 144 px vertical, uncapped falls are unreadable |

---

## 3. Camera

The 160×144 viewport is the defining design constraint: at 1.75 px/f run speed
the player crosses the whole screen in ~1.5 s, so look-ahead is scarce.

Techniques (terminology from Itay Keren's GDC 2015 "Scroll Back" survey of
side-scroller cameras):

- **Position the player at ~1/3 from the leading edge.** When moving right,
  lock the player around x ≈ 56–64 on screen, leaving ~100 px (6+ tiles) of
  look-ahead. SML-style simplest option: forward-biased horizontal lock.
- **Camera window (dead zone):** don't scroll for small movements; scroll only
  when the player pushes against a window (e.g. 16 px wide horizontally).
  Prevents jitter from direction taps.
- **Platform snapping for vertical:** never track the player's y during a
  jump — the whole world would bounce on every hop at this resolution. Keep
  vertical camera fixed; when the player *lands* on ground at a new height,
  smoothly move the camera to frame it (introduced by SMW, essential at
  144 px tall). Use a wide vertical dead zone (~4–6 tiles).
- **Integer pixel positions only** when blitting — subpixel camera positions
  cause tile shimmer at low resolution. Keep float positions internally,
  `Math.round()` at render time.
- **Design consequence — limited look-ahead:** never require a reaction to a
  hazard that enters the screen less than ~1 s before it matters. Telegraph
  off-screen dangers (SML places enemies so they're visible before they're
  threats; forced-scroll sections make speed itself the telegraph). Avoid
  blind leaps of faith: put a coin/banana trail marking safe landing spots
  below the screen edge.

---

## 4. Level Pacing (GB school)

- **Super Mario Land:** 12 levels (4 worlds × 3), each completable in roughly
  1–2 minutes. **Unmarked checkpoints** mid-level: die past the midpoint,
  respawn there — no flag, no fanfare. Each world's third level ends in a
  boss/setpiece (twice an auto-scrolling shooter — a full mechanic changeup as
  a reward/pacing break).
- **Kirby's Dream Land:** 5 levels, each subdivided into **rooms connected by
  doors** — doors are natural soft checkpoints and let each room be a
  self-contained idea at 160×144. Sakurai's stated philosophy: the base game
  is deliberately easy so anyone can finish it; depth comes from a post-clear
  **hard mode** and optional challenges, not from gating progress.
- **DK '94:** ~100 tiny levels in 4-stage packs with a time limit each; every
  4th stage is a boss/DK confrontation. Levels are "puzzles in a box" — often
  barely more than a screen or two. New tools (temporary platforms, ladders,
  levers) arrive one per world, then get combined.
- **Practical recipe for this game:**
  - Level length: **1–3 minutes**; width ~10–20 screens (1600–3200 px,
    200–400 tiles).
  - One silent checkpoint at ~55% of each level.
  - Difficulty ramp per level: calm intro (first 2 screens hazard-free) →
    core challenge repeated with escalation → breather before the exit.
  - Per-game ramp: world 1 forgiving (pits have visible bottoms/rescue
    ledges), later worlds combine mechanics and remove safety nets.
  - Change the *verb* every 3rd level (auto-scroll, vertical climb, chase)
    the way SML's shooter levels do.

---

## 5. Tutorial-Free Teaching (the "1-1 school")

Pattern, as documented from SMB 1-1 analyses: **introduce in safety → test
with stakes → combine → escalate.**

- **Safe intro:** 1-1 opens with a flat, enemy-free walkway — the player
  learns move/jump with zero risk. The first "gap" has a filled-in bottom, so
  a failed jump costs nothing; the *very next* gap is lethal but identical in
  shape. Copy this literally: first pit in world 1 has a floor with a
  climb-out route.
- **Affordance + forced encounter:** the first Goomba approaches on flat
  ground where jumping over/on it is the natural response; the first ?-block
  hangs where a jump for it is irresistible. Introduce each mechanic where the
  *only obvious action* is the correct one.
- **Repetition, then combination:** each mechanic appears solo 2–3 times, then
  paired with a previous one (jump + moving enemy, then jump + enemy + pit).
  Mini-bosses/setpieces demonstrate combinations the player wouldn't try
  unprompted.
- **GB exemplar — DK '94's curriculum:** world 1's only mechanic is
  "key → door." Then, one at a time: temporary horizontal platforms →
  temporary ladders → levers/switches → interplay of all of them. Nothing is
  ever explained in text; each new object first appears in a level where it's
  the only thing to interact with.
- **Kirby's exemplar:** inhale is taught by placing slow, harmless enemies in
  wide open rooms long before any enemy that punishes hesitation.
- **Rule of thumb:** if a mechanic needs explaining, redesign the room that
  introduces it, not the UI.

---

## 6. Audio (Game Boy character → Web Audio API)

### The 4 channels

| Channel | Hardware | Typical musical role |
|---|---|---|
| CH1 — Pulse A | Square wave, 4 duty cycles, volume envelope, **frequency sweep** | Lead melody; sweep enables laser/slide SFX |
| CH2 — Pulse B | Same minus sweep | Harmony / counter-melody / echo of lead |
| CH3 — Wave | 32-sample × 4-bit programmable wavetable, coarse volume (100/50/25%) | Bass lines; also usable for soft leads, weird timbres |
| CH4 — Noise | LFSR (linear-feedback shift register) pseudo-random noise; 15-bit "white" mode and 7-bit "metallic/tonal" mode; envelope | All percussion: short high-pitch burst = hi-hat, longer low = snare/kick |

### What makes it sound "Game Boy"

- **Pulse duty cycles: 12.5%, 25%, 50%, 75%.** 12.5% = thin/nasal, 25% = the
  classic bright chiptune lead, 50% = full/hollow square, 75% ≡ 25% in timbre
  (inverted phase). Switching duty mid-note is a signature expressive trick.
- **Only one note per channel, 4 channels total** — chords are faked with
  **arpeggios**: cycle a single pulse channel through chord tones very fast,
  typically changing pitch every 1–2 frames (**60–30 Hz**). That shimmer *is*
  the chiptune chord sound.
- **Stepped volume envelopes, not smooth ADSR:** hardware envelopes step the
  16 volume levels at multiples of 1/64 s. Emulate with staircase gain
  automation (e.g. `setValueAtTime` steps every ~15.6 ms), not linear ramps.
- **Echo on a budget:** repeat the lead line on CH2 delayed by ~2–6 frames at
  lower volume — the classic GB pseudo-reverb.
- **Noise percussion:** every GB drum is an envelope on the noise channel;
  pitch (LFSR clock rate) sets kick vs snare vs hat. The 7-bit LFSR mode gives
  the recognizable metallic/robotic buzz.

### Web Audio mapping

- **Pulse channels:** `OscillatorNode` has no duty-cycle control — either
  (a) build a `PeriodicWave` from the Fourier series of a pulse wave at each
  duty, or (b) sum two phase-offset sawtooth oscillators (offset = duty), or
  (c) generate one-cycle `AudioBuffer`s and loop them. Option (a) or (c) is
  simplest; pre-build 3 waves (12.5/25/50%).
- **Wave channel:** loopable 32-sample `AudioBuffer`, values quantized to 16
  levels (4-bit) — the quantization grit is part of the sound.
- **Noise channel:** pre-generate LFSR output (both 15-bit and 7-bit variants)
  into `AudioBuffer`s; play with a stepped `GainNode` envelope, vary
  `playbackRate` for kick/snare/hat.
- **Global discipline:** enforce the 4-voice limit in your sound driver — SFX
  should *steal* a music channel (typically CH2 or CH4) and give it back, just
  like real GB games; that interruption is authentic. Keep everything mono (or
  hard L/C/R panning only, mimicking the GB's crude per-channel L/R switches).
- Quantize note timing to the 60 Hz frame grid (music drivers ran in the
  vblank interrupt).

---

## 7. Sources

- Pan Docs (definitive GB hardware reference — palettes, OAM, LCD): https://gbdev.io/pandocs/ , https://gbdev.io/pandocs/OAM.html , https://gbdev.io/pandocs/Palettes.html
- DMG palette hex values: https://www.designpieces.com/palette/game-boy-original-color-palette-hex-and-rgb/ , https://www.pixel-editor.com/palettes/gameboy-green
- GB Pocket gray/olive palette (GrafxKid): https://lospec.com/palette-list/grafxkid-gameboy-pocket-gray
- Console palette overview: https://en.wikipedia.org/wiki/List_of_video_game_console_palettes
- TASvideos Super Mario Land game resources (integer px/frame speeds, hold-A bounce boost, cliff-fall gravity quirk): https://tasvideos.org/GameResources/GB/SuperMarioLand , https://tasvideos.org/GameResources/GB/SuperMarioLand2
- Mario-family gravity asymmetry measurements: https://hypertextbook.com/facts/2007/mariogravity.shtml , https://blog.hamaluik.ca/posts/super-mario-world-physics/
- Platformer physics equations: https://error454.com/2013/10/23/platformer-physics-101-and-the-3-fundamental-equations-of-platformers/
- Celeste forgiveness mechanics (Maddy Thorson): https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html
- Coyote time / buffering windows: https://www.gamejuice.co.uk/articles/coyote-time-input-buffering
- Camera design ("Scroll Back", Itay Keren, GDC 2015): https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers
- DK '94 design/teaching: https://en.wikipedia.org/wiki/Donkey_Kong_(1994_video_game) , https://www.inverse.com/gaming/donkey-kong-94-anniversary-game-boy-mario , https://www.resetera.com/threads/rttp-donkey-kong-1994-a-game-boy-classic.171692/
- Kirby's Dream Land structure/difficulty philosophy: https://en.wikipedia.org/wiki/Kirby%27s_Dream_Land
- SMB 1-1 teaching design: https://medium.com/creating-immersive-worlds/super-mario-bros-1-1-bd6d66e3738a , https://mainstream404.wordpress.com/2018/01/03/how-super-mario-bros-world-1-1-teaches-you-everything-you-need-to-know/
- SML checkpoints (unmarked): https://www.mariowiki.com/Checkpoint
- GB audio channels & duty cycles: https://hackaday.io/project/164161-retrochallenge-2019-gameboy-audiohacks/log/160487-channelhacking-the-gameboy , https://aselker.github.io/gameboy-sound-chip/ , https://nightshade256.github.io/2021/03/27/gb-sound-emulation.html
- GB chiptune technique (arpeggios, duty, echo): https://www.woovebox.com/support/guides--tutorials/genres/chiptune/gameboy
