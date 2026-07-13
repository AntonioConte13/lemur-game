// Level 4: physical racer smoke test - she must actually play the level
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
  get IN(){return IN}, step, resetLevel, loadLevel, get racer(){return racer}, get vines(){return vines},
  get beetles(){return beetles}, LEVEL_W, get SAVE(){return SAVE} };`;
// eval of our own local game script for testing - no untrusted input
try { eval(src); } catch (e) { console.error('LOAD ERROR:', e.stack); process.exit(1); }
const G = globalThis.__G;
function run(n, ins) { Object.assign(G.IN, {l:0,r:0,u:0,d:0,a:0,b:0,start:0}, ins||{}); for (let i=0;i<n;i++) G.step(); }
console.log('loaded, sprite errors:', errs.length);

function raceOnce(label) {
  G.loadLevel(3); G.resetLevel(false); G.state = 'play';
  let frames = 0, lastNode = -1, trace = [];
  while (G.state === 'play' && frames < 60 * 90) {
    run(1, {}); frames++;
    const r = G.racer;
    if (r.node !== lastNode) { trace.push(`n${r.node}@${(frames/60).toFixed(1)}s x=${r.x.toFixed(0)}`); lastNode = r.node; }
  }
  const r = G.racer;
  console.log(`${label}: ${G.state === 'lost' ? 'FINISHED in ' + (frames/60).toFixed(1) + 's' : 'STUCK at x=' + r.x.toFixed(0) + ' y=' + r.y.toFixed(0) + ' node=' + r.node}`);
  console.log('  nodes: ' + trace.join(' | '));
}
raceOnce('run A');
raceOnce('run B');
console.log(errs.length === 0 ? 'NO SPRITE ERRORS' : 'SPRITE ERRORS!');
process.exit(0);
