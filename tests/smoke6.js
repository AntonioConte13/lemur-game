// v1.1 Card Collector: difficulties, hidden cards, album data, chrome mode
const fs = require('fs');
let src = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const errs = [];
const oe = console.error; console.error = (...a) => { errs.push(a.join(' ')); oe(...a); };
const elStub = () => ({ addEventListener(){}, setPointerCapture(){}, classList:{add(){},remove(){},toggle(){}},
  getBoundingClientRect: () => ({left:0,top:0,width:100,height:100}), style:{}, textContent:'' });
const canvasEl = Object.assign(elStub(), { width:160, height:144,
  getContext: () => ({ createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}), putImageData(){} }) });
global.document = { getElementById:(id)=>id==='screen'?canvasEl:elStub(), querySelector:()=>elStub(), addEventListener(){} };
global.addEventListener = () => {};
global.innerWidth = 400; global.innerHeight = 800;
global.localStorage = { _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;} };
global.requestAnimationFrame = () => {};
global.location = { hash: '' };
src += `\n;globalThis.__G = { get player(){return player}, get state(){return state}, set state(s){state=s},
  get IN(){return IN}, step, resetLevel, loadLevel, get cardPks(){return cardPks}, get SAVE(){return SAVE},
  get boss(){return boss}, tileAt, CARDS, CARDS_BY_LEVEL, DIFFS, DIFF, get curLevel(){return curLevel},
  get PAL32(){return PAL32}, chromeOn };`;
// eval of our own local game script for testing - no untrusted input
try { eval(src); } catch (e) { console.error('LOAD ERROR:', e.stack); process.exit(1); }
const G = globalThis.__G;
function run(n, ins) { Object.assign(G.IN, {l:0,r:0,u:0,d:0,a:0,b:0,start:0}, ins||{}); for (let i=0;i<n;i++) G.step(); }
console.log('loaded, sprite errors:', errs.length);

// 1. card data integrity
console.log('cards:', G.CARDS.length, '(expect 20) | mapping covers:',
  new Set(G.CARDS_BY_LEVEL.flat()).size, 'unique ids');
let badSprite = 0;
for (const c of G.CARDS) { try { if (!c.s().w) badSprite++; } catch (e) { badSprite++; } }
console.log('card sprites resolve:', badSprite === 0);

// 2. every level places 4 pickups, none inside solid tiles
let totalPks = 0, buried = 0;
for (let lv = 0; lv < 5; lv++) {
  G.loadLevel(lv); G.resetLevel(false);
  totalPks += G.cardPks.length;
  for (const cp of G.cardPks) {
    const c = Math.floor((cp.x + 5) / 8), r = Math.floor((cp.y + 6) / 8);
    if (G.tileAt(c, r) === 1) { buried++; console.log('  BURIED card', cp.id, 'level', lv + 1, 'at', cp.x, cp.y); }
  }
}
console.log('pickups placed:', totalPks, '(expect 20) | buried in solid:', buried);

// 3. difficulty: hearts + foe speeds
for (let d = 0; d < 4; d++) {
  G.SAVE.diff = d;
  G.loadLevel(0); G.resetLevel(false);
  console.log(G.DIFFS[d].name, '-> hearts:', G.player.hearts);
}
// 4. card pickup collect + persistence
G.SAVE.diff = 1; G.loadLevel(0); G.resetLevel(false); G.state = 'play';
const cp0 = G.cardPks[0];
G.player.x = cp0.x - 2; G.player.y = cp0.y - 4; G.player.vy = 0;
run(3, {});
console.log('card collected:', cp0.taken, '| saved:', G.SAVE.cards[cp0.id] === 1, '| id:', cp0.id, '=', G.CARDS[cp0.id].n);

// 5. superfractor: death -> gameover, not respawn
G.SAVE.diff = 3; G.loadLevel(0); G.resetLevel(false); G.state = 'play';
console.log('superfractor hearts:', G.player.hearts);
G.player.y = 400; // fall into pit
run(80, {});
console.log('superfractor death -> state:', G.state, '(expect gameover)');

// 6. chrome palettes: valid + applied
G.SAVE.diff = 1; G.SAVE.beat = 1; G.SAVE.chrome = 1;
G.loadLevel(2); // forest: chrome overrides the dark pal
const p32 = Array.from(G.PAL32);
G.SAVE.chrome = 0; G.loadLevel(2);
const p32b = Array.from(G.PAL32);
console.log('chromeOn toggles palette:', JSON.stringify(p32) !== JSON.stringify(p32b));
console.log(errs.length === 0 ? 'NO SPRITE ERRORS' : 'SPRITE ERRORS: ' + errs.length);
process.exit(0);
