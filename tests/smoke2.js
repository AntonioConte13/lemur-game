// Headless smoke test for Level 2 (climbing). Same stub approach as smoke.js.
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
let src = html.match(/<script>([\s\S]*)<\/script>/)[1];
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
  get IN(){return IN}, step, resetLevel, loadLevel, get relics(){return relics}, get peckers(){return peckers},
  get curLevel(){return curLevel}, get camY(){return camY}, totalShards, LEVEL_W, LEVEL_H,
  get gate(){return gate}, get checkpoint(){return checkpoint}, get SAVE(){return SAVE} };`;
// eval of our own local game script for testing - no untrusted input
try { eval(src); } catch (e) { console.error('LOAD ERROR:', e.stack); process.exit(1); }
const G = globalThis.__G;
function run(n, ins) { Object.assign(G.IN, {l:0,r:0,u:0,d:0,a:0,b:0,start:0}, ins||{}); for (let i=0;i<n;i++) G.step(); }
console.log('loaded, sprite errors:', errs.length);

// menu flow: title -> select -> intro -> play
run(2,{start:1}); run(1,{}); run(40,{});
console.log('after title start:', G.state);
run(2,{start:1}); run(1,{}); run(40,{});
console.log('after select start:', G.state, '| level:', G.curLevel);
run(120,{});
console.log('after intro:', G.state);

// jump into L2 directly
G.loadLevel(1); G.resetLevel(false); G.state = 'play';
console.log('L2 size px:', G.LEVEL_W(), 'x', G.LEVEL_H(), '| peckers:', G.peckers.length, '| player:', G.player.x, G.player.y);

// walk right to trunk A (col8-9, x=64..80) and climb
run(60, {r:1});
console.log('at trunk base? x =', G.player.x.toFixed(0), 'y =', G.player.y.toFixed(0));
G.player.x = 64; G.player.vx = 0; // stand in trunk A column
run(2, {});
const yBefore = G.player.y;
run(60, {u:1});
console.log('climb test: y', yBefore.toFixed(0), '->', G.player.y.toFixed(0), '| climbing =', G.player.climbing, '(expect y decreased ~42)');
// climb to top and step right onto ledge 1 (surface row 60, y=464)
run(80, {u:1});
run(30, {r:1});
console.log('stepped off: y =', G.player.y.toFixed(0), 'grounded =', G.player.grounded, '(ledge stand y=464)');

// pecker damage: teleport onto trunk B beside pecker
const wp = G.peckers[0];
G.player.x = wp.x - 4; G.player.y = wp.y; G.player.vy = 0; G.player.invuln = 0;
const h0 = G.player.hearts;
run(10, {u:1});
console.log('pecker contact: hearts', h0, '->', G.player.hearts, '(expect -1)');

// climb full route sanity: teleport to summit ledge and walk to gate
G.player.x = 24*8; G.player.y = 14*8-16; G.player.vy = 0; G.player.hearts = 3; G.player.dead = 0;
run(20, {r:1});
console.log('gate reach: state =', G.state, '(expect clear)');
console.log('unlocked =', G.SAVE.unlocked);
console.log(errs.length === 0 ? 'NO SPRITE ERRORS' : 'SPRITE ERRORS!');
process.exit(0);
