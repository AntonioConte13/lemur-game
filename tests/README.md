# Headless smoke tests

Each file stubs the DOM/localStorage, loads the game script out of
`../index.html`, and drives real game logic frame by frame.

| Test | Covers |
|---|---|
| `smoke.js` | Menu flow, L1: walk/jump physics numbers, auto-run clear, relics + level-up |
| `smoke2.js` | L2: climbing, ladder-top stop, woodpecker damage, clear |
| `smoke3.js` | L3: vine grab, pump amplitude, release velocity/flight |
| `smoke4.js` | L4: physical racer completes the course solo (twice), node trace |
| `smoke5.js` | L5: boss — tells before attacks, 3 phases, carrots/plants, floor cut+restore, victory |
| `smoke5cam.js` | L5: camera through the P3 fall → catch ledge → climb-back loop |

Run: `node smoke.js` etc. Expect `NO SPRITE ERRORS` and no `FAIL`/`ERROR`
lines. These are development aids, not a CI gate — read the numbers.
