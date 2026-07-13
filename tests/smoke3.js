// Level 3 vine swinging smoke test
const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const errs = [];
const oe = console.error; console.error = (...a) => { errs.push(a.join(' ')); oe(...a); };
const elStub = () => ({ addEventListener(){}, setPointerCapture(){}, classList:{add(){},remove(){},toggle(){}},
  getBoundingClientRect: () => ({left:0,top:0,width:100,height:100}), style:{} });
const canvasEl = Object.assign(elStub(), { width:160, height:144,
  getContext: () => ({ createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}), putImageData(){} }) });
global.document = { getElementById:(id)=>id==='screen'?canvasEl:elStub(), querySelector:()=>elStub(), addEventListener(){} };
global.addEventListener = () => {};
global.innerWidth = 400; global.innerHeight = 800;
global.localStorage = { _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;} };
global.requestAnimationFrame = () => {};
global.location = { hash: '' };
src += `\n;globalThis.__G = { get player(){return player}, get state(){return state}, set state(s){state=s},
  get IN(){return IN}, step, resetLevel, loadLevel, get vines(){return vines}, get relics(){return relics},
  get npcs(){return npcs}, get signs(){return signs}, totalShards, LEVEL_W, get checkpoint(){return checkpoint},
  get SAVE(){return SAVE}, get curLevel(){return curLevel} };`;
// eval of our own local game script for testing - no untrusted input
try { eval(src); } catch (e) { console.error('LOAD ERROR:', e.stack); process.exit(1); }
const G = globalThis.__G;
function run(n, ins) { Object.assign(G.IN, {l:0,r:0,u:0,d:0,a:0,b:0,start:0}, ins||{}); for (let i=0;i<n;i++) G.step(); }
console.log('loaded, sprite errors:', errs.length);

G.loadLevel(2); G.resetLevel(false); G.state = 'play';
console.log('L3: width', G.LEVEL_W(), '| vines:', G.vines.length, '| npcs:', G.npcs.map(n=>n.kind).join(','), '| signs:', G.signs.length);

// vine 0 anchor (teaching vine over ground)
const v = [...G.vines].sort((a,b)=>a.x-b.x)[0];
console.log('teach vine anchor:', v.x, v.y, 'bob rest y ~', (v.y + v.len).toFixed(0));
// stand under it and jump up
G.player.x = v.x - 8; G.player.y = 144; G.player.vy = 0;
run(2, {});
let grabbed = false;
Object.assign(G.IN, {l:0,r:0,u:0,d:0,b:0,start:0,a:1});
for (let i = 0; i < 50 && !grabbed; i++) { G.step(); if (G.player.swing) grabbed = true; }
console.log('jump-to-grab: swing =', !!G.player.swing, '(expect true)');

// pump for 3 seconds alternating with the swing direction
let maxTh = 0;
for (let f = 0; f < 240; f++) {
  const sv = G.player.swing; if (!sv) break;
  Object.assign(G.IN, {l: sv.om < 0 ? 1 : 0, r: sv.om >= 0 ? 1 : 0, u:0,d:0,a:0,b:0,start:0});
  G.step();
  maxTh = Math.max(maxTh, Math.abs(sv.th));
}
console.log('pumped amplitude:', (maxTh * 57.3).toFixed(0), 'deg (want 45-80)');

// release at max forward speed: wait for bottom crossing with om>0, then release
let rel = null;
for (let f = 0; f < 200 && !rel; f++) {
  const sv = G.player.swing;
  if (sv && sv.om > 0.05 && Math.abs(sv.th) < 0.25) {
    Object.assign(G.IN, {a:1,l:0,r:0,u:0,d:0,b:0,start:0}); G.step();
    rel = { vx: G.player.vx, vy: G.player.vy };
  } else { Object.assign(G.IN, {l: sv && sv.om < 0 ? 1:0, r: sv && sv.om >= 0 ? 1:0, a:0,u:0,d:0,b:0,start:0}); G.step(); }
}
console.log('release velocity:', rel ? rel.vx.toFixed(2) + ',' + rel.vy.toFixed(2) : 'FAILED', '(want vx ~2-3, vy < 0)');
// measure flight distance until landing
if (rel) {
  const x0 = G.player.x;
  for (let f = 0; f < 120 && !G.player.grounded && !G.player.swing; f++) run(1, {});
  console.log('flight distance:', (G.player.x - x0).toFixed(0), 'px | landed grounded =', G.player.grounded, '| regrabbed =', !!G.player.swing);
}
console.log(errs.length === 0 ? 'NO SPRITE ERRORS' : 'SPRITE ERRORS!');
process.exit(0);
