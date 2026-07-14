// Headless smoke test for index.html game script
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no script found'); process.exit(1); }
let src = m[1];

// --- DOM stubs ---
const errs = [];
const origError = console.error;
console.error = (...a) => { errs.push(a.join(' ')); origError(...a); };
const elStub = () => ({
  addEventListener: () => {}, setPointerCapture: () => {}, classList:{add(){},remove(){},toggle(){}},
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  style: {},
});
const canvasEl = Object.assign(elStub(), {
  width: 160, height: 144,
  getContext: () => ({
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: () => {},
  }),
});
global.document = {
  getElementById: (id) => id === 'screen' ? canvasEl : elStub(),
  querySelector: () => elStub(),
  addEventListener: () => {},
};
global.addEventListener = () => {};
global.innerWidth = 400; global.innerHeight = 800;
global.localStorage = { _d: {}, getItem(k){ return this._d[k] || null; }, setItem(k,v){ this._d[k]=v; } };
let rafCb = null;
global.requestAnimationFrame = (cb) => { rafCb = cb; };
global.location = { hash: '' };

// expose internals for testing
src += `\n;globalThis.__G = { get player(){return player}, get state(){return state}, set state(s){state=s},
  get IN(){return IN}, step, resetLevel, get relics(){return relics}, get beetles(){return beetles},
  get camX(){return camX}, get camY(){return camY}, get SAVE(){return SAVE}, totalShards, LEVEL_W,
  get checkpoint(){return checkpoint}, MAPW: MAPW };`;

// eval is intentional and safe here: this throwaway test harness executes our own
// game script (read from the local repo) in-scope so the __G accessor can reach
// its top-level `let` bindings. No external/untrusted input is involved.
try { eval(src); } catch (e) { console.error('LOAD ERROR:', e.stack); process.exit(1); }
const G = globalThis.__G;
console.log('script loaded. sprite errors:', errs.length, '| map width tiles:', G.MAPW, '| level px:', G.LEVEL_W());

// helper: run n frames with given inputs
function run(n, ins) {
  Object.assign(G.IN, { l:0, r:0, u:0, d:0, a:0, b:0, start:0 }, ins || {});
  for (let i = 0; i < n; i++) G.step();
}

// 1. title -> select -> start game
run(2, { start: 1 });
run(1, {});
run(40, {}); // fade through
console.log('after start: state =', G.state);
run(2, { start: 1 }); run(1, {}); run(40, {}); // menu: PLAY -> level select
run(2, { start: 1 }); run(1, {}); run(40, {}); // level select -> L1
run(120, {}); // intro banner elapses
console.log('after intro: state =', G.state, 'player at', G.player.x.toFixed(1), G.player.y.toFixed(1));

// 2. walk right for 2s
const x0 = G.player.x;
run(120, { r: 1 });
console.log('walked:', (G.player.x - x0).toFixed(1), 'px in 120f (expect ~110-120)', 'grounded:', G.player.grounded);

// 3. jump height test: hold A
const yStart = G.player.y;
let minY = yStart;
Object.assign(G.IN, { l:0,r:0,u:0,d:0,b:0,start:0, a:1 });
for (let i = 0; i < 60; i++) { G.step(); if (G.player.y < minY) minY = G.player.y; }
console.log('full-hold jump height:', (yStart - minY).toFixed(1), 'px (expect ~48-56)', 'landed grounded:', G.player.grounded);

// short hop
run(30, {});
const y2 = G.player.y; let minY2 = y2;
Object.assign(G.IN, { a:1 });
G.step(); G.step(); G.step();
G.IN.a = 0;
for (let i = 0; i < 60; i++) { G.step(); if (G.player.y < minY2) minY2 = G.player.y; }
console.log('short hop height:', (y2 - minY2).toFixed(1), 'px (expect much lower, ~8-20)');

// 4. run the whole level to the right with run held, jumping periodically
let deaths = 0, lastDead = 0, cleared = false;
for (let f = 0; f < 60 * 240 && !cleared; f++) {
  Object.assign(G.IN, { l:0, r:1, u:0, d:0, b:1, start:0, a: (f % 45) < 18 ? 1 : 0 });
  G.step();
  if (G.player.dead === 1 && lastDead !== 1) deaths++;
  lastDead = G.player.dead;
  if (G.state === 'levelup') { Object.assign(G.IN, { a:1 }); for (let k=0;k<50;k++) G.step(); }
  if (G.state === 'clear') { cleared = true; }
}
console.log('auto-run result: cleared =', cleared, '| deaths =', deaths,
  '| x =', G.player.x.toFixed(0), '/', G.LEVEL_W(),
  '| shards =', G.totalShards(), '| checkpoint =', JSON.stringify(G.checkpoint));
console.log('state:', G.state, '| save:', localStorage._d[Object.keys(localStorage._d)[0]]);
console.log(errs.length === 0 ? 'NO SPRITE ERRORS' : 'SPRITE ERRORS: ' + errs.length);

// 5. relic pickup + level-up flow
localStorage._d = {};
G.state = 'title';
run(2, { start: 1 }); run(1, {}); run(40, {});
run(2, { start: 1 }); run(1, {}); run(40, {});
run(2, { start: 1 }); run(1, {}); run(40, {}); run(120, {});
// teleport to the three shard spots and grab each
const spots = G.relics.map(r => ({ x: r.x, y: r.y }));
let lastState = '';
for (const s of spots) {
  G.player.x = s.x - 3; G.player.y = s.y - 8; G.player.vy = 0;
  run(3, {});
  lastState = G.state;
  if (G.state === 'levelup') { run(45, {}); run(5, { a: 1 }); run(5, {}); }
}
console.log('relic test: shards =', G.totalShards(), '(expect 3) | state seen =', lastState,
  '| relics taken =', G.relics.map(r => r.taken).join(','));
console.log('legend save:', localStorage._d['legendary-lemur-save-v1']);
process.exit(0);
