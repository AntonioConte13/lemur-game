// Camera behavior through the P3 floor-cut fall and climb-back
const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const elStub = () => ({ addEventListener(){}, setPointerCapture(){}, classList:{add(){},remove(){},toggle(){}},
  getBoundingClientRect: () => ({left:0,top:0,width:100,height:100}), style:{} });
const canvasEl = Object.assign(elStub(), { width:160, height:144,
  getContext: () => ({ createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}), putImageData(){} }) });
global.document = { getElementById:(id)=>id==='screen'?canvasEl:elStub(), querySelector:()=>elStub(), addEventListener(){} };
global.addEventListener = () => {};
global.innerWidth = 390; global.innerHeight = 844;
global.localStorage = { _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;} };
global.requestAnimationFrame = () => {};
global.location = { hash: '' };
src += `\n;globalThis.__G = { get player(){return player}, get state(){return state}, set state(s){state=s},
  get IN(){return IN}, step, resetLevel, loadLevel, get boss(){return boss},
  get camY(){return camY}, get camX(){return camX}, get MAP(){return MAP}, get MAPW(){return MAPW}, tileAt };`;
// eval of our own local game script for testing - no untrusted input
eval(src);
const G = globalThis.__G;
function run(n, ins) { Object.assign(G.IN, {l:0,r:0,u:0,d:0,a:0,b:0,start:0}, ins||{}); for (let i=0;i<n;i++) G.step(); }

G.loadLevel(4); G.resetLevel(false); G.state = 'play';
// simulate P3: cut the arena floor by hand (cols 17-23, rows 40-41)
for (let c = 17; c <= 23; c++) { G.MAP[40 * G.MAPW + c] = 0; G.MAP[41 * G.MAPW + c] = 0; }
// player in the arena over the gap
G.player.x = 152; G.player.y = 304; G.player.vy = 0;
G.step();
let worstAbove = 0, worstBelow = 0, nan = false;
function watch(frames, ins, label) {
  let above = 0, below = 0;
  for (let i = 0; i < frames; i++) {
    run(1, ins);
    const rel = G.player.y - G.camY;
    if (isNaN(G.camY) || isNaN(G.player.y)) nan = true;
    above = Math.min(above, rel); below = Math.max(below, rel);
  }
  console.log(label, '| player screen-y range:', above.toFixed(0), '..', below.toFixed(0),
    '(visible 0..128) | y=', G.player.y.toFixed(0), 'grounded=', G.player.grounded, 'camY=', G.camY.toFixed(0));
  worstAbove = Math.min(worstAbove, above); worstBelow = Math.max(worstBelow, below);
}
watch(90, {}, 'fall through gap  ');
console.log('landed on catch ledge (expect y=384):', G.player.y.toFixed(0));
// walk left off catch ledge down to ledge C, then to trunk2 and climb back
watch(120, { l: 1 }, 'drop to ledge C   ');
// if we drifted into vine 2 on the way down, release at the bottom like a player would
for (let i = 0; i < 200 && G.player.swing; i++) {
  const v = G.player.swing;
  run(1, Math.abs(v.th) < 0.2 ? { a: 1 } : {});
}
for (let i = 0; i < 300 && Math.abs(G.player.x - 36) > 3; i++) run(1, G.player.x < 36 ? { r: 1 } : { l: 1 });
console.log('at trunk 2 base: x=', G.player.x.toFixed(0), 'y=', G.player.y.toFixed(0));
watch(280, { u: 1 }, 'climb trunk 2     ');
Object.assign(G.IN, {l:0,r:1,u:0,d:0,a:1,b:0,start:0});
for (let i = 0; i < 60; i++) {
  G.step();
  if (i % 4 === 0) console.log('f'+i, 'x=', G.player.x.toFixed(1), 'y=', G.player.y.toFixed(1),
    'vy=', G.player.vy.toFixed(2), 'cl=', +G.player.climbing, 'gr=', +G.player.grounded, 'sw=', !!G.player.swing);
}
console.log('back in arena: y=', G.player.y.toFixed(0), '(floor stand 304) | boss active:', !!G.boss);
console.log(nan ? 'FAIL: NaN in camera!' : 'camera never NaN');
console.log('worst excursion:', worstAbove.toFixed(0), '..', worstBelow.toFixed(0), '(fail if far outside 0..128)');
process.exit(0);
