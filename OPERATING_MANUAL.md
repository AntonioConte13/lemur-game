# OPERATING MANUAL — Legendary Lemur: Tree Top Tactics

Personal VeeFriends fan project (not for sale/distribution). GB Pocket-style
platformer in a single self-contained HTML file.

## Play it

- **URL:** https://antonioconte13.github.io/lemur-game/
- **Repo:** https://github.com/AntonioConte13/lemur-game (branch `main`)
- **iPhone fullscreen:** open the URL in Safari → Share → *Add to Home Screen*.
  The icon launches the game fullscreen (PWA manifest + apple-touch-icon).
- Controls: arrows + Z (jump) + X (run/dash) + Enter (start/pause), or the
  on-screen d-pad and A/B/START on touch. M or the SND button toggles audio.
- Debug: append `#play` … `#play5` to the URL to jump straight into a level.

## Deployment (GitHub Pages only)

There is **no server**. Deploy = commit + `git push` on `main`; GitHub Pages
rebuilds in ~30–60 s. If push is denied with 403, the gh CLI account flipped:
`gh auth switch -u AntonioConte13`.

## File layout

| File | Purpose |
|---|---|
| `index.html` | The entire game: engine, sprites, levels, audio, save system |
| `manifest.webmanifest` | PWA manifest (fullscreen, icons, theme) |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | PWA / home-screen icons |
| `docs/BRAND.md` | VeeFriends research (characters, lore, quotes) |
| `docs/DESIGN.md` | Game Boy hardware/physics/audio research |
| `docs/GAME_DESIGN.md` | The game design document |
| `tests/smoke*.js` | Headless regression tests (see tests/README.md) |

Inside `index.html`, top-to-bottom: TUNING constants → palette/framebuffer →
sprites → font → input → save → **audio driver + songs** → level builders →
entities/physics (`moveActor` is shared by player and racer) → boss → camera
→ rendering → state machine → main loop.

## Save data

`localStorage` key `legendary-lemur-save-v1`: shards per level, unlocked
levels, audio preference, beat/trueLegend flags. Per-origin (Pages URL).
Erase via DevTools: `localStorage.removeItem('legendary-lemur-save-v1')`.

## Versioning & rollback

Each milestone is tagged when its checkpoint passes:

| Tag | Milestone |
|---|---|
| `v1.0` | Final base game: 5 levels, boss, audio, PWA (this file's version) |
| `v1.1` | Card Collector update (planned) |
| `v1.2` | Level Depth update (planned) |
| `v1.3` | Trait Worlds update (planned) |
| `v1.4` | Racer update (planned) |
| `v1.5` | Feel & Art update (planned) |

Roll back the live site to a tag:

```bash
git checkout main
git revert --no-edit <bad-commit>..HEAD   # preferred: keeps history
git push
# or hard rollback:
git reset --hard v1.0 && git push --force-with-lease
```

Pages serves whatever `main` holds — no other action needed.

## Tests

```bash
cd tests && for f in smoke*.js; do node "$f"; done
```

Headless smoke tests stub the DOM and drive the real game logic: physics
numbers, each level's mechanic, the racer completing her course, and the full
boss fight (tells → 3 phases → victory). Run before every push.
