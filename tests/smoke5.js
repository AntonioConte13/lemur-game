// Level 5 boss smoke test
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
  get IN(){return IN}, step, resetLevel, loadLevel, get boss(){return boss}, get carrots(){return carrots},
  get plants(){return plants}, get vines(){return vines}, get bigRelic(){return bigRelic},
  tileAt, get SAVE(){return SAVE}, get relics(){return relics} };`;
// eval of our own local game script for testing - no untrusted input
try { eval(src); } catch (e) { console.error('LOAD ERROR:', e.stack); process.exit(1); }
const G = globalThis.__G;
function run(n, ins) { Object.assign(G.IN, {l:0,r:0,u:0,d:0,a:0,b:0,start:0}, ins||{}); for (let i=0;i<n;i++) G.step(); }
console.log('loaded, sprite errors:', errs.length);

G.loadLevel(4); G.resetLevel(false); G.state = 'play';
console.log('L5: spawn', G.player.x, G.player.y, '| vines:', G.vines.length, '| relics:', G.relics.length);

// enter arena
G.player.x = 120; G.player.y = 304; G.player.vy = 0;
run(3, {});
console.log('boss spawned:', !!G.boss, '| st:', G.boss && G.boss.st);

// P1: verify tell precedes swoop, then stomp him during the swoop
let sawTell = false, telFrames = 0, f = 0;
while (G.boss && G.boss.st !== 'swoop' && f < 600) { run(1,{}); f++; if (G.boss.st === 'tell') { sawTell = true; telFrames++; } }
console.log('P1: tell before swoop =', sawTell, '(' + telFrames + 'f) | st:', G.boss.st);
// drop the player onto his head mid-swoop
let hit1 = false;
for (let i = 0; i < 400 && !hit1; i++) {
  const b = G.boss;
  if (b.st === 'swoop' && b.y > 260) {
    G.player.x = b.x; G.player.y = b.y - 15; G.player.vy = 2; G.player.invuln = 0;
    run(1, {});
    if (G.boss.st === 'hurt') hit1 = true;
  } else run(1, {});
}
console.log('P1 stomp landed:', hit1, '| hp:', G.boss.hp, '| phase ->', G.boss.phase);

// P2: wait for windup (tell), verify markers exist before any carrot flies
f = 0; let sawWindup = false, markersBeforeFlight = false;
while (G.boss && G.boss.st !== 'taunt' && f < 1200) {
  run(1,{}); f++;
  if (G.boss && G.boss.st === 'windup') { sawWindup = true;
    if (G.carrots.length && G.carrots.every(c => !c.flying)) markersBeforeFlight = true; }
  G.player.x = 60; G.player.y = 304; G.player.vy = 0; G.player.hearts = 3; G.player.dead = 0; // keep out of the way
}
console.log('P2: windup tell =', sawWindup, '| markers before flight =', markersBeforeFlight, '| st:', G.boss && G.boss.st);
console.log('    fear plants sprouted:', G.plants.filter(p=>p.life).length);
// stomp during taunt
let hit2 = false;
for (let i = 0; i < 300 && !hit2; i++) {
  const b = G.boss;
  if (b.st === 'taunt') {
    G.player.x = b.x; G.player.y = b.y - 15; G.player.vy = 2; G.player.invuln = 0;
    run(1, {});
    if (G.boss.st === 'hurt') hit2 = true;
  } else run(1, {});
}
console.log('P2 stomp landed:', hit2, '| phase ->', G.boss.phase);

// P3: floor cut + vines, dash tell, tired stomp
f = 0; let cutDone = false, sawDashTell = false;
while (G.boss && f < 1500) {
  run(1,{}); f++;
  G.player.x = 60; G.player.y = 304; G.player.vy = 0; G.player.hearts = 3; G.player.dead = 0;
  if (!cutDone && G.tileAt(20, 40) === 0) { cutDone = true; console.log('P3: floor cut confirmed | arena vines now:', G.vines.length); }
  if (G.boss && G.boss.st === 'dashTell') sawDashTell = true;
  if (G.boss && G.boss.st === 'tired') break;
}
console.log('P3: dash tell seen =', sawDashTell, '| tired reached =', G.boss && G.boss.st === 'tired');
let win = false;
for (let i = 0; i < 300 && !win; i++) {
  const b = G.boss;
  if (b && b.st === 'tired') {
    G.player.x = b.x; G.player.y = b.y - 13; G.player.vy = 2; G.player.invuln = 0;
    run(1, {});
  } else run(1, {});
  if (!G.boss) win = true;
}
console.log('boss defeated:', win, '| relic spawned:', !!G.bigRelic);
// touch the relic
if (G.bigRelic) { G.player.x = G.bigRelic.x; G.player.y = G.bigRelic.y; run(2, {}); }
console.log('victory state:', G.state, '| SAVE.beat:', G.SAVE.beat);
// death reset restores floor
G.resetLevel(true);
console.log('floor restored after reset:', G.tileAt(20, 40) === 1, '| boss cleared:', !G.boss, '| relic persists:', !!G.bigRelic);
console.log(errs.length === 0 ? 'NO SPRITE ERRORS' : 'SPRITE ERRORS!');
process.exit(0);
