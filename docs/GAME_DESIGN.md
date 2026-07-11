# GAME_DESIGN.md — Legendary Lemur: Tree Top Tactics

> Personal fan project. VeeFriends characters © VeeFriends LLC / Gary Vaynerchuk.
> Not for sale or distribution.

Companion docs: [BRAND.md](BRAND.md) (characters/lore), [DESIGN.md](DESIGN.md)
(GB hardware, physics numbers, audio).

---

## 1. Concept

A Game Boy Pocket-style platformer. **Legendary Lemur** — "LEAPING INTO LEGEND,
ONE BRANCH AT A TIME" — quests through VeeWorld to recover the **Legendary
Relic** before the chaos fairy **Bad Intentions** corrupts it. Canon hook: the
Lemur is *addicted to treasure hunts and cryptic puzzles*, which is exactly what
the hidden-relic hunt is.

- Rendered at **160×144**, integer-scaled, 4-color **GB Pocket yellow/olive
  palette** to match the Topps Chrome card look.
- One self-contained `index.html`. Vanilla JS + Canvas. Sprites are pixel
  arrays (strings of palette indices) drawn to offscreen canvases at boot.
- Fixed 60 fps timestep; all art on an 8px tile grid (16px metatiles for
  gameplay objects).

## 2. Palette (final)

GB Pocket olive set from DESIGN.md, used everywhere via a 4-entry indexed array:

| Index | Hex | Role |
|---|---|---|
| 0 | `#e0dbcd` | lightest — sky, highlights |
| 1 | `#a89f94` | light — background detail, clouds, far foliage |
| 2 | `#706b66` | dark — platform shading, enemy bodies |
| 3 | `#2b2b26` | darkest — outlines, text, Lemur's rings |

Palette swaps (one array change) give: title-screen "chrome shimmer" cycle,
damage flash (invert), Frowning Forest variant (slightly darker mapping), and
authentic 3-step palette fades between screens — never alpha fades.

## 3. Story Framing (thin, GB-style — told in 1-line NPC quips)

The Legendary Relic rests atop the Great Tree. **Bad Intentions** — corrupted
by the Fear Carrot — wants it. Legendary Lemur leaps branch to branch across
four regions to reach it first, collecting **15 lost relic shards** (the hidden
relics) that grow his legend along the way. Cameos deliver one-liner
encouragements in speech bubbles; no text walls, no tutorial text.

## 4. The Five Levels

Structure follows the GB recipe: 1–3 minutes each, ~12–18 screens wide, one
silent checkpoint at ~55% (marked visually by **Brave Bison** standing guard —
"We're born to be brave!"), calm 2-screen intro, escalate, breather before exit.
Each mechanic is taught the "1-1 way": first appearance is safe (pit with a
floor), second is identical but lethal, then combined.

### L1 — Jungle Canopy (run / jump)
- Lemur's canon home scene (Series metadata: Jungle). Horizontal level across
  canopy platforms and branches.
- Teaches: variable-height jump, enemy bounce. First gap has a leafy floor +
  climb-out ledge; second gap is the same shape but lethal.
- Enemies: snapping plants (stationary, telegraphed), beetles (walkers).
- NPC: **Patient Panda** near a moving-branch section — "Waiting is the hardest
  part." (teaches wait-for-the-platform by placement, not text).

### L2 — The Great Trunks (NEW: tree climbing)
- Vertical slice: climbable trunk surfaces (ivy-textured tiles). Hold toward a
  trunk to grab; up/down to climb; jump to leap off (wall-jump-lite between
  facing trunks).
- First trunk is 3 tiles above soft ground; later climbs run past hazards
  (woodpecker enemies that patrol trunk columns).
- NPC: **Empathy Elephant** ("Empy") — his ears glow when a hidden relic is
  within a screen; placed near the sneakiest shard.

### L3 — Frowning Forest (NEW: vine swinging)
- Canon locale from Comic #4. Darker palette mapping, gnarled trees, drooping
  vines.
- Grab a vine by touching it airborne; Lemur swings as a pendulum, left/right
  pumps amplitude, jump releases with momentum. First vine hangs over solid
  ground; then vines over pits; then vine chains.
- NPC: **Willful Wizard** quest beat — he warns of a "safe path" that isn't
  (the comic's don't-believe-everything moral): a signposted route with a trap,
  the honest route hides a shard.
- Mid-level menace: **Cynical Cat** heckles from the background and springs one
  trap gauntlet ("None of my nine lives are for playing nice").

### L4 — Canopy Rush (all three + rival race)
- **Hustling Hamster** race — "I keep winning because I keep moving!" She runs
  a fixed racing line (ghost-style, no collision); level combines run/jump +
  climbs + vine chains. Beating her to the gate is required; margin of loss
  just restarts the race at the level start (Kirby-style kindness).
- Camera uses stronger forward bias here; her position off-screen is shown by
  an edge arrow marker.

### L5 — The Great Tree (boss: Bad Intentions guarding the Legendary Relic)
- Short vertical approach gauntlet (every mechanic once, one screen each), then
  the boss arena at the crown.
- **Bad Intentions** fight, 3 phases (classic GB 3-hit boss escalation):
  1. Swoops in sine arcs — bounce on him when he dips low.
  2. Drops Fear Carrot bombs that sprout snapping plants — climb the arena's
     side trunks to reach and bounce him.
  3. Cuts vines/floors away — swing across the gap to land the final hit.
- Victory: Lemur claims the Legendary Relic; **Fearless Fairy** cameo takes her
  brother home. "Legends are made with every bold leap."

## 5. Relics & LEVEL UP (persistent upgrades)

- **3 hidden relic shards per level, 15 total.** Hidden the GB way: above the
  visible camera line, behind breakable leaf-blocks, down a "risky" fork, or
  paid for by a detour past the exit. Empy's glow (L2+) hints proximity.
- Collecting shards fills the HUD **LEGEND meter**. Every **3 shards = LEVEL
  UP**: full-screen "LEVEL UP!" jingle + banner, and a permanent upgrade:

| Legend Lv | Shards | Upgrade |
|---|---|---|
| 1 | 3 | **Higher jump** (+0.4 px/f jump v₀ ≈ +1 tile reach) |
| 2 | 6 | **Faster climb** (climb speed ×1.5) |
| 3 | 9 | **Longer swing** (vine release boost ×1.3, wider grab window) |
| 4 | 12 | **Legend Dash** (brief run burst, air-usable once) |
| 5 | 15 | **True Legend** (golden palette flourish + double relic sparkle; unlocks best ending card) |

- Upgrades are **persistent across levels and sessions** (localStorage).
- Levels are tuned so all required paths work at base stats; upgrades open
  shortcut routes and make earlier levels' missed shards reachable (replay via
  level select).

## 6. Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move / climb / pump swing | Arrow keys | On-screen d-pad (left thumb) |
| Jump / vine release (hold = higher) | **Z** | **A** button (right thumb) |
| Run / dash / grab | **X** | **B** button |
| Pause / menu | Enter | Small START pill |

- Touch layout: translucent d-pad bottom-left, A/B bottom-right, sized ≥48px
  hit targets, multi-touch (run while jumping), rendered *outside* the 160×144
  game canvas in the handheld bezel so nothing occludes gameplay.
- Game-feel layer per DESIGN.md: coyote 6f, jump buffer 8f, apex hang, corner
  correction 2px, min-jump clamp.

## 7. Presentation

- **Title screen styled like the Topps Chrome card:** the page renders a
  handheld-console frame (rounded shell, d-pad/buttons — the Pocket look)
  around the screen; the boot shows a card-style title: bordered frame,
  "VeeFriends™" arch, big **LEGENDARY LEMUR** wordmark, Lemur mid-leap pose,
  motto ticker "LEAPING INTO LEGEND, ONE BRANCH AT A TIME", corner tags matching
  the owner's actual card — **"GO-7"** (Game On insert) and serial **"01/10"** —
  and a chrome-refractor palette-cycle shimmer. PRESS START.
- **HUD** (top row, 8px font): hearts ×3, shard count `◆ n/15`, LEGEND meter
  (3-pip fill toward next level-up), level name on entry.
- Fake GB boot "ding + logo drop" on load. Palette-step fades everywhere.

## 8. Save (localStorage key `legendary-lemur-save-v1`)

```json
{ "shards": [[t,f,f],[...]], "legendLevel": 2, "unlockedLevel": 3,
  "bestRaceTime": null, "settings": { "audio": true } }
```
Saved on: shard pickup, level complete, level-up. "ERASE" option on title
screen (hold-to-confirm). Versioned key so future schema changes don't break.

## 9. Tech Plan (build order for Phases 4–9)

1. **Engine core:** fixed-timestep loop, indexed-palette renderer (offscreen
   160×144 → scaled), sprite-array decoder, tilemap collision (AABB, 8px
   tiles), input (keyboard + touch), camera (forward bias + platform snap),
   HUD, localStorage.
2. **L1** complete with enemies, shards, level-up flow. *(Phase 4 checkpoint)*
3. **L2 climbing → L3 vines → L4 race → L5 boss**, one phase each, feedback
   between. Physics constants live in one `TUNING` object at the top of the
   file for fast checkpoint iteration.
4. **Polish:** Web Audio chip driver (2 pulse + wave + noise, SFX steal CH2/4),
   title/level/game-over/victory screens, transitions.

Authenticity guardrails: 4 colors only, integer pixels, no rotation/alpha,
≤10 sprites per row where feasible, 8px font, mono audio.
