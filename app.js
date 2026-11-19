(() => {
'use strict';

/* ================= Data ================= */
const PUZZLES = [
  ['PHRASE','BETTER LATE THAN NEVER'],['PHRASE','THE EARLY BIRD CATCHES THE WORM'],['PHRASE','PRACTICE MAKES PERFECT'],
  ['PHRASE','EASY COME EASY GO'],['PHRASE','A PENNY SAVED IS A PENNY EARNED'],['PHRASE','ACTIONS SPEAK LOUDER THAN WORDS'],
  ['PHRASE',"TIME FLIES WHEN YOU'RE HAVING FUN"],['PHRASE','ONCE IN A BLUE MOON'],['PHRASE','BACK TO THE DRAWING BOARD'],
  ['PHRASE','EVERY CLOUD HAS A SILVER LINING'],['PHRASE','HIT THE NAIL ON THE HEAD'],['PHRASE','THE BALL IS IN YOUR COURT'],
  ['PHRASE','PIECE OF CAKE'],['PHRASE','BREAK THE ICE'],['PHRASE','LET THE CAT OUT OF THE BAG'],
  ['FOOD & DRINK','CHOCOLATE CHIP COOKIES'],['FOOD & DRINK','FRESHLY SQUEEZED ORANGE JUICE'],['FOOD & DRINK','SPAGHETTI AND MEATBALLS'],
  ['FOOD & DRINK','GRILLED CHEESE SANDWICH'],['FOOD & DRINK','STRAWBERRY SHORTCAKE'],['FOOD & DRINK','HOT AND SOUR SOUP'],
  ['FOOD & DRINK','BLUEBERRY PANCAKES WITH MAPLE SYRUP'],['FOOD & DRINK','MANGO STICKY RICE'],['FOOD & DRINK','ICED LEMON TEA'],
  ['PLACE','THE GRAND CANYON'],['PLACE','A CROWDED SUBWAY STATION'],['PLACE','TROPICAL RAINFOREST'],['PLACE','THE GREAT BARRIER REEF'],
  ['PLACE','MOUNT KILIMANJARO'],['PLACE','A COZY MOUNTAIN CABIN'],['PLACE','NIAGARA FALLS'],['PLACE','THE NORTHERN HEMISPHERE'],
  ['THING','A BRAND NEW PAIR OF SNEAKERS'],['THING','GRANDFATHER CLOCK'],['THING','ROLLER COASTER'],['THING','HOT AIR BALLOON'],
  ['THING','SOLAR PANELS'],['THING','A DECK OF PLAYING CARDS'],['THING','ELECTRIC TOOTHBRUSH'],['THING','PAPER AIRPLANE'],
  ['WHAT ARE YOU DOING?','BAKING BREAD FROM SCRATCH'],['WHAT ARE YOU DOING?','TAKING THE DOG FOR A WALK'],
  ['WHAT ARE YOU DOING?','BUILDING A SANDCASTLE'],['WHAT ARE YOU DOING?','WATCHING THE SUNRISE'],
  ['WHAT ARE YOU DOING?','LEARNING TO PLAY THE GUITAR'],['WHAT ARE YOU DOING?','SINGING IN THE SHOWER'],
  ['WHAT ARE YOU DOING?','PLANTING A VEGETABLE GARDEN'],
  ['EVENT','SURPRISE BIRTHDAY PARTY'],['EVENT','FIREWORKS SHOW'],['EVENT','A TOTAL SOLAR ECLIPSE'],
  ['EVENT',"NEW YEAR'S EVE COUNTDOWN"],['EVENT','SUMMER MUSIC FESTIVAL'],
  ['FUN & GAMES','HIDE AND SEEK'],['FUN & GAMES','A FRIENDLY GAME OF CHESS'],['FUN & GAMES','JIGSAW PUZZLE'],
  ['FUN & GAMES','TUG OF WAR'],['FUN & GAMES','SCAVENGER HUNT'],
  ['OCCUPATION','MARINE BIOLOGIST'],['OCCUPATION','FIREFIGHTER'],['OCCUPATION','ASTRONAUT'],['OCCUPATION','PASTRY CHEF'],
  ['OCCUPATION','AIR TRAFFIC CONTROLLER'],['OCCUPATION','ZOOKEEPER'],
];
const COLS = 14, ROWS = 4;
const VOWELS = new Set(['A','E','I','O','U']);
const FREQ = 'RTNSLCDMHGPBFWYKVXZJQ'.split('');
const SEAT_COLORS = ['#ff4d6d','#ffc94a','#4d8dff'];

const PAL = [
  {bg:'#ff4d6d',fg:'#fff'},{bg:'#ffb703',fg:'#2a1a00'},{bg:'#3a86ff',fg:'#fff'},{bg:'#8e44ec',fg:'#fff'},
  {bg:'#06d6a0',fg:'#04281f'},{bg:'#fb8500',fg:'#fff'},{bg:'#ff66c4',fg:'#fff'},{bg:'#2ec4f1',fg:'#04202b'}
];
const RAW = [2500,300,450,600,'B',700,350,500,800,'L',400,550,900,300,650,'B',500,400,850,600,350,1000,450,750];
let ci = 0;
const WEDGES = RAW.map(r => {
  if (r === 'B') return {type:'bankrupt', label:'BANKRUPT', bg:'#111', fg:'#fff'};
  if (r === 'L') return {type:'lose', label:'LOSE TURN', bg:'#f7f7f7', fg:'#1a1440'};
  if (r === 2500) return {type:'cash', v:r, label:'$2500', bg:'gold', fg:'#3a2000'};
  const c = PAL[ci++ % PAL.length];
  return {type:'cash', v:r, label:'$'+r, bg:c.bg, fg:c.fg};
});
const SEG = Math.PI * 2 / WEDGES.length;

function layout(text){
  const lines = []; let line = '';
  for (const w of text.split(' ')) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= COLS) line += ' ' + w;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}
const VALID = PUZZLES.filter(([,t]) => { const l = layout(t); return l.length <= ROWS && l.every(x => x.length <= COLS); });

/* ================= State ================= */
const S = {
  players: [], cur: 0, roundNo: 1, totalRounds: 4, puzzle: null, letters: new Set(), called: new Set(),
  tiles: [], lines: [], phase: 'idle', value: 0, rot: 0, gen: 0, used: new Set(), muted: false, started: false
};
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
const cur = () => S.players[S.cur];
const isHumanTurn = () => S.players.length && !cur().cpu;
function later(fn, ms){ const g = S.gen; setTimeout(() => { if (g === S.gen) fn(); }, ms); }

/* ================= Audio ================= */
let actx = null;
function ac(){
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume().catch(()=>{});
  return actx;
}
function tone(freq, dur, type='sine', vol=0.15, when=0, slideTo=null){
  if (S.muted) return; const a = ac(); if (!a) return;
  try {
    const o = a.createOscillator(), g = a.createGain(); const t = a.currentTime + when;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch(e) {}
}
function buzzPhone(pattern){ try { if (!S.muted && navigator.vibrate) navigator.vibrate(pattern); } catch(e) {} }
const sfx = {
  tick(){ tone(2200, .025, 'square', .035); },
  land(){ tone(660, .12, 'triangle', .14); tone(990, .2, 'triangle', .12, .08); },
  ding(){ tone(1320, .5, 'sine', .16); tone(1980, .35, 'sine', .05); },
  buzz(){ tone(150, .5, 'sawtooth', .09); tone(146, .5, 'square', .05); },
  bankrupt(){ tone(500, .9, 'sawtooth', .1, 0, 70); buzzPhone([80, 60, 160]); },
  fanfare(){ [523,659,784,1047,1319].forEach((f,i) => tone(f, .35, 'triangle', .14, i*.11)); tone(1047, .9, 'sine', .1, .55); }
};

/* ================= Wheel ================= */
const canvas = $('wheel'), ctx = canvas.getContext('2d');
let size = 0, dpr = 1;
function resizeWheel(){
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  size = canvas.clientWidth;
  if (size < 60) return;
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
  drawWheel();
}
function drawWheel(){
  if (size < 60) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const c = size / 2, R = size / 2 - 4, Rw = R - size * 0.03;
  // rim
  const rim = ctx.createLinearGradient(0, 0, 0, size);
  rim.addColorStop(0, '#fff0b8'); rim.addColorStop(.5, '#e0a21e'); rim.addColorStop(1, '#8a5200');
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI*2); ctx.fillStyle = rim; ctx.fill();
  ctx.beginPath(); ctx.arc(c, c, Rw + 2, 0, Math.PI*2); ctx.fillStyle = '#1a1240'; ctx.fill();

  WEDGES.forEach((w, i) => {
    const a0 = S.rot + i * SEG - Math.PI/2, a1 = a0 + SEG;
    ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, Rw, a0, a1); ctx.closePath();
    if (w.bg === 'gold') {
      const g = ctx.createRadialGradient(c, c, Rw*.2, c, c, Rw);
      g.addColorStop(0, '#fff6cf'); g.addColorStop(.6, '#f5cf55'); g.addColorStop(1, '#c98a10');
      ctx.fillStyle = g;
    } else ctx.fillStyle = w.bg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1.2; ctx.stroke();

    // stacked label
    const chars = w.label.split('');
    const n = chars.filter(ch => ch !== ' ').length + chars.filter(ch => ch === ' ').length * .5;
    const fs = Math.min(Rw * 0.088, (Rw * 0.70) / (n * 0.98));
    ctx.save(); ctx.translate(c, c); ctx.rotate(a0 + SEG/2 + Math.PI/2);
    ctx.fillStyle = w.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 ${fs}px Outfit, system-ui, sans-serif`;
    let y = -Rw * 0.9 + fs/2;
    for (const ch of chars) {
      if (ch === ' ') { y += fs * .5; continue; }
      ctx.fillText(ch, 0, y); y += fs * 0.98;
    }
    ctx.restore();
  });

  // pegs
  for (let i = 0; i < WEDGES.length; i++) {
    const a = S.rot + i * SEG - Math.PI/2;
    const x = c + Math.cos(a) * (Rw - 3), y = c + Math.sin(a) * (Rw - 3);
    ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, size*0.009), 0, Math.PI*2);
    ctx.fillStyle = '#ffe9a6'; ctx.fill(); ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 1; ctx.stroke();
  }
  // hub
  const hr = Rw * 0.17;
  const hg = ctx.createRadialGradient(c - hr*.3, c - hr*.3, hr*.1, c, c, hr);
  hg.addColorStop(0, '#fff6cf'); hg.addColorStop(.7, '#e0a21e'); hg.addColorStop(1, '#8a5200');
  ctx.beginPath(); ctx.arc(c, c, hr, 0, Math.PI*2); ctx.fillStyle = hg; ctx.fill();
  ctx.beginPath(); ctx.arc(c, c, hr*.68, 0, Math.PI*2); ctx.fillStyle = '#1a1240'; ctx.fill();
  ctx.fillStyle = '#ffc94a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${hr*.42}px Bungee, Outfit, sans-serif`; ctx.fillText('SPIN', c, c + 1);
}
function wedgeAt(rot){
  const a = ((-rot) % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
  return Math.floor(a / SEG) % WEDGES.length;
}
const pointer = $('pointer');
function flap(){
  try { pointer.animate([{transform:'rotate(-22deg)'},{transform:'rotate(0deg)'}], {duration:140, easing:'ease-out'}); } catch(e) {}
}

/* ================= Board ================= */
const boardEl = $('board');
function renderBoard(text, revealAllNow){
  boardEl.innerHTML = ''; S.tiles = [];
  const lines = layout(text); S.lines = lines;
  const grid = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  const r0 = Math.floor((ROWS - lines.length) / 2);
  lines.forEach((ln, i) => {
    const c0 = Math.floor((COLS - ln.length) / 2);
    [...ln].forEach((ch, j) => { grid[r0 + i][c0 + j] = ch; });
  });
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const ch = grid[r][c]; const el = document.createElement('div');
    if (!ch || ch === ' ') el.className = 'tile off';
    else if (/[A-Z]/.test(ch)) {
      const t = {ch, el, shown: false}; S.tiles.push(t);
      if (revealAllNow) { t.shown = true; el.className = 'tile shown'; el.textContent = ch; }
      else el.className = 'tile hidden';
    } else { el.className = 'tile shown'; el.textContent = ch; }
    boardEl.appendChild(el);
  }
}
function showTile(t){ t.shown = true; t.el.className = 'tile shown flip'; t.el.textContent = t.ch; }
function reveal(letter, done){
  const list = S.tiles.filter(t => t.ch === letter && !t.shown);
  list.forEach((t, i) => later(() => { t.el.className = 'tile lit'; sfx.ding(); }, i * 420));
  later(() => {
    list.forEach((t, i) => later(() => showTile(t), i * 150));
    later(done, list.length * 150 + 250);
  }, list.length * 420 + 400);
}
function revealAll(){
  S.tiles.filter(t => !t.shown).forEach((t, i) => later(() => showTile(t), i * 45));
}
const allRevealed = () => S.tiles.every(t => t.shown);
const remaining = pred => [...S.letters].filter(l => !S.called.has(l) && pred(l));
const consLeft = () => remaining(l => !VOWELS.has(l)).length;
const vowLeft = () => remaining(l => VOWELS.has(l)).length;

/* ================= UI ================= */
const keysEl = $('keys'), msgEl = $('msg'), playersEl = $('players');
const spinBtn = $('spinBtn'), vowelBtn = $('vowelBtn'), solveBtn = $('solveBtn'), hintEl = $('hint');
const keyBtns = {};
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(l => {
  const b = document.createElement('button'); b.className = 'key' + (VOWELS.has(l) ? ' v' : ''); b.textContent = l; b.disabled = true;
  b.addEventListener('click', () => { if (keyEnabled(l)) guess(l); });
  keysEl.appendChild(b); keyBtns[l] = b;
});
function msg(html, tone){ msgEl.innerHTML = html; msgEl.className = 'msg' + (tone ? ' ' + tone : ''); }
function keyEnabled(l){
  if (!S.started || !isHumanTurn() || S.called.has(l)) return false;
  if (S.phase === 'consonant') return !VOWELS.has(l);
  if (S.phase === 'vowel') return VOWELS.has(l);
  return false;
}
function renderPlayers(bumpIdx){
  playersEl.innerHTML = S.players.map((p, i) => `
    <div class="player ${S.started && i === S.cur ? 'active' : ''}" style="--c:${SEAT_COLORS[i]}">
      <div class="pname"><span>${esc(p.name)}</span>${p.cpu ? '<span class="badge">CPU</span>' : ''}</div>
      <div class="pround ${i === bumpIdx ? 'bump' : ''}">$${fmt(p.round)}</div>
      <div class="pbank">Bank $${fmt(p.bank)}</div>
    </div>`).join('');
}
function updateUI(bumpIdx){
  const act = S.started && S.phase === 'action' && isHumanTurn();
  spinBtn.disabled = !(act && consLeft() > 0);
  if (S.phase === 'vowel' && isHumanTurn()) { vowelBtn.textContent = 'Cancel'; vowelBtn.disabled = false; }
  else { vowelBtn.textContent = 'Buy Vowel · $250'; vowelBtn.disabled = !(act && cur().round >= 250 && vowLeft() > 0); }
  solveBtn.disabled = !act;
  for (const l in keyBtns) { keyBtns[l].classList.toggle('used', S.called.has(l)); keyBtns[l].disabled = !keyEnabled(l); }
  renderPlayers(bumpIdx);
  if (S.started) $('roundPill').textContent = `Round ${S.roundNo} of ${S.totalRounds}`;
  let h = '';
  if (act) {
    const notes = [];
    if (consLeft() === 0) notes.push('No more consonants');
    if (vowLeft() === 0) notes.push('No more vowels');
    else if (cur().round < 250) notes.push('Need $250 to buy a vowel');
    h = notes.join(' · ');
  } else if (S.phase === 'consonant' && isHumanTurn()) h = 'Click a consonant or type it on your keyboard.';
  else if (S.phase === 'vowel' && isHumanTurn()) h = 'Pick a vowel ($250).';
  hintEl.textContent = h;
}
function setPhase(p, bumpIdx){
  S.phase = p; updateUI(bumpIdx);
  if (p === 'action' && S.started && cur().cpu) later(cpuAct, 1150);
}

/* ================= Game flow ================= */
function pickPuzzle(){
  let pool = VALID.filter((_, i) => !S.used.has(i));
  if (!pool.length) { S.used.clear(); pool = VALID; }
  const p = pool[Math.floor(Math.random() * pool.length)];
  S.used.add(VALID.indexOf(p));
  return {cat: p[0], text: p[1]};
}
function startRound(){
  S.puzzle = pickPuzzle();
  S.letters = new Set(S.puzzle.text.replace(/[^A-Z]/g, '').split(''));
  S.called = new Set();
  S.players.forEach(p => p.round = 0);
  S.cur = (S.roundNo - 1) % S.players.length;
  renderBoard(S.puzzle.text, false);
  $('category').textContent = S.puzzle.cat;
  msg(`Round ${S.roundNo}! ${esc(cur().name)} goes first.`);
  setPhase('action');
}
function nextTurn(){
  S.cur = (S.cur + 1) % S.players.length;
  const p = cur();
  msg(p.cpu ? `${esc(p.name)}'s turn.` : `${esc(p.name)}, you're up. Spin, buy a vowel, or solve.`);
  setPhase('action');
}
function doSpin(){
  if (S.phase !== 'action' || consLeft() === 0) return;
  ac();
  setPhase('spinning');
  msg(`${esc(cur().name)} spins…`);
  const start = S.rot;
  const total = Math.PI * 2 * (4 + Math.random() * 2.5) + Math.random() * Math.PI * 2;
  const dur = 4300 + Math.random() * 1200;
  const t0 = performance.now(); const g = S.gen; let last = wedgeAt(start);
  function frame(now){
    if (g !== S.gen) return;
    const t = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - t, 4);
    S.rot = start + total * e; drawWheel();
    const i = wedgeAt(S.rot);
    if (i !== last) { last = i; sfx.tick(); flap(); }
    if (t < 1) requestAnimationFrame(frame);
    else { S.rot = S.rot % (Math.PI * 2); onLand(WEDGES[i]); }
  }
  requestAnimationFrame(frame);
}
function onLand(w){
  const p = cur();
  if (w.type === 'bankrupt') {
    sfx.bankrupt(); const lost = p.round; p.round = 0;
    msg(`<span>BANKRUPT! ${esc(p.name)} ${lost ? 'loses $' + fmt(lost) : 'had nothing to lose'}.</span>`, 'bad');
    updateUI(); later(nextTurn, 2000); return;
  }
  if (w.type === 'lose') {
    sfx.buzz(); msg(`Lose a Turn! Sorry, ${esc(p.name)}.`, 'bad'); later(nextTurn, 1800); return;
  }
  S.value = w.v; sfx.land();
  msg(`$${fmt(w.v)}! ${p.cpu ? esc(p.name) + ' is choosing a consonant…' : 'Pick a consonant.'}`);
  setPhase('consonant');
  if (p.cpu) later(cpuConsonant, 1300);
}
function guess(l){
  const mode = S.phase; if (mode !== 'consonant' && mode !== 'vowel') return;
  const isV = VOWELS.has(l);
  if ((mode === 'consonant') === isV || S.called.has(l)) return;
  const p = cur(), idx = S.cur;
  if (isV) p.round -= 250;
  S.called.add(l);
  const n = S.tiles.filter(t => t.ch === l).length;
  setPhase('reveal');
  if (n === 0) {
    sfx.buzz(); msg(`No ${l}. Sorry, ${esc(p.name)}.`, 'bad'); later(nextTurn, 1600); return;
  }
  const gain = isV ? 0 : S.value * n;
  msg(`Yes! ${n === 1 ? 'One' : n} ${l}${n > 1 ? "'s" : ''}.${gain ? ` <b>+$${fmt(gain)}</b>` : ''}`, 'good');
  reveal(l, () => {
    p.round += gain;
    if (allRevealed()) {
      updateUI(idx); msg(`Every letter is showing. ${esc(p.name)} solves it!`, 'good');
      later(() => solveResult(true), 900);
    } else {
      if (!p.cpu) msg(`${n === 1 ? 'One' : n} ${l}${n > 1 ? "'s" : ''}${gain ? ` for <b>$${fmt(gain)}</b>` : ''}. Spin again, buy a vowel, or solve.`, 'good');
      setPhase('action', idx);
    }
  });
}
function attemptSolve(g){
  const p = cur(); setPhase('reveal');
  msg(`${esc(p.name)} ${p.cpu ? 'would like to solve' : 'is solving'}…`);
  later(() => {
    const ok = g != null && norm(g) === norm(S.puzzle.text);
    solveResult(ok, g);
  }, p.cpu ? 1200 : 500);
}
function solveResult(ok, g){
  const p = cur();
  if (!ok) {
    sfx.buzz();
    msg(g ? `“${esc(g)}” isn't it. Sorry, ${esc(p.name)}.` : `${esc(p.name)} takes a guess… not quite!`, 'bad');
    later(nextTurn, 1800); return;
  }
  sfx.fanfare(); revealAll(); confetti();
  const award = Math.max(p.round, 1000);
  p.bank += award; S.lastWinner = S.cur; S.lastAward = award;
  S.players.forEach(q => q.round = 0);
  msg(`${esc(p.name)} solved it! <b>+$${fmt(award)}</b> banked.`, 'good');
  setPhase('roundEnd');
  later(showRoundEnd, 2300);
}
function showRoundEnd(){
  const last = S.roundNo >= S.totalRounds;
  const max = Math.max(...S.players.map(p => p.bank));
  $('endTitle').textContent = last ? 'Final results' : `Round ${S.roundNo} complete`;
  $('endCat').textContent = S.puzzle.cat;
  $('endAnswer').textContent = S.puzzle.text;
  const order = S.players.map((p, i) => ({p, i})).sort((a, b) => b.p.bank - a.p.bank);
  $('standings').innerHTML = order.map(({p, i}) => `
    <div class="standing ${last && p.bank === max ? 'win' : ''}" style="--c:${SEAT_COLORS[i]}">
      <span>${last && p.bank === max ? '🏆 ' : ''}${esc(p.name)}${i === S.lastWinner && !last ? ` <span class="badge">+$${fmt(S.lastAward)}</span>` : ''}</span>
      <span class="amt">$${fmt(p.bank)}</span>
    </div>`).join('');
  const btns = $('endBtns'); btns.innerHTML = '';
  if (last) {
    const winners = S.players.filter(p => p.bank === max).map(p => esc(p.name));
    $('endTitle').innerHTML = winners.length > 1 ? `It's a tie!` : `${winners[0]} wins!`;
    addBtn(btns, 'Change players', 'ghost', () => { close('endOv'); openSetup(); });
    addBtn(btns, 'Play again', 'spin', () => { close('endOv'); startGame(S.players.map(p => ({name:p.name, cpu:p.cpu})), S.totalRounds); });
  } else {
    addBtn(btns, 'Next round', 'spin', nextRound);
    if (S.players.every(p => p.cpu)) later(nextRound, 4000);
  }
  open('endOv');
}
function nextRound(){
  if (!$('endOv').classList.contains('open')) return;
  close('endOv'); S.roundNo++; startRound();
}
function addBtn(parent, label, cls, fn){
  const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = fn; parent.appendChild(b);
}

/* ================= CPU ================= */
function cpuAct(){
  if (S.phase !== 'action' || !cur().cpu) return;
  const p = cur();
  const r = S.tiles.filter(t => t.shown).length / S.tiles.length;
  const cl = consLeft(), vl = vowLeft();
  let pTry = r > 0.5 ? (r - 0.4) * 1.5 : 0;
  if (cl === 0 && (p.round < 250 || vl === 0)) pTry = 1;
  if (Math.random() < pTry) {
    const correct = Math.random() < 0.35 + r * 0.7;
    return attemptSolve(correct ? S.puzzle.text : null);
  }
  if (cl > 0 && (p.round < 250 || vl === 0 || Math.random() < 0.72)) return doSpin();
  if (p.round >= 250 && vl > 0) return cpuVowel();
  return doSpin();
}
function cpuConsonant(){
  if (S.phase !== 'consonant') return;
  const avail = FREQ.filter(c => !S.called.has(c));
  const inP = avail.filter(c => S.letters.has(c));
  const pick = (inP.length && Math.random() < 0.62) ? inP[Math.floor(Math.random() * Math.min(3, inP.length))] : avail[0];
  msg(`${esc(cur().name)} calls <b>${pick}</b>…`);
  later(() => guess(pick), 700);
}
function cpuVowel(){
  setPhase('vowel'); msg(`${esc(cur().name)} buys a vowel…`);
  later(() => {
    const avail = ['E','A','O','I','U'].filter(v => !S.called.has(v));
    const inP = avail.filter(v => S.letters.has(v));
    const pick = (inP.length && Math.random() < 0.8) ? inP[0] : avail[0];
    guess(pick);
  }, 1100);
}

/* ================= Modals ================= */
function open(id){ $(id).classList.add('open'); }
function close(id){ $(id).classList.remove('open'); }
const anyOpen = () => !!document.querySelector('.overlay.open');

let seatCfg = [{name:'Player 1', cpu:false},{name:'Ada', cpu:true},{name:'Max', cpu:true}];
let roundsCfg = 4;
function renderSeats(){
  $('seats').innerHTML = seatCfg.map((s, i) => `
    <div class="seat">
      <span class="dot" style="background:${SEAT_COLORS[i]}"></span>
      <input class="inp" data-i="${i}" maxlength="14" value="${esc(s.name)}" aria-label="Player ${i+1} name">
      <div class="seg" data-i="${i}">
        <button data-cpu="0" class="${!s.cpu ? 'on' : ''}">Human</button>
        <button data-cpu="1" class="${s.cpu ? 'on' : ''}">CPU</button>
      </div>
    </div>`).join('');
  $('seats').querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { seatCfg[+inp.dataset.i].name = inp.value; }));
  $('seats').querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    seatCfg[+seg.dataset.i].cpu = b.dataset.cpu === '1'; renderSeats();
  })));
}
$('roundsSeg').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
  roundsCfg = +b.dataset.r; $('roundsSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
}));
function openSetup(){
  renderSeats(); $('setupCancel').style.display = S.started && S.phase !== 'roundEnd' ? '' : 'none'; open('setupOv');
}
$('setupCancel').onclick = () => close('setupOv');
$('startBtn').onclick = () => {
  ac();
  const players = seatCfg.map((s, i) => ({name: (s.name || '').trim() || (s.cpu ? ['Ada','Max','Juno'][i] : `Player ${i+1}`), cpu: s.cpu}));
  close('setupOv'); startGame(players, roundsCfg);
};
function startGame(players, rounds){
  S.gen++;
  S.players = players.map(p => ({...p, round: 0, bank: 0}));
  S.totalRounds = rounds; S.roundNo = 1; S.started = true;
  startRound();
}

function openSolve(){
  if (!(S.phase === 'action' && isHumanTurn())) return;
  setPhase('solving');
  $('solveCat').textContent = 'Category: ' + S.puzzle.cat;
  const shown = new Set(S.tiles.filter(t => t.shown).map(t => t.ch));
  $('pattern').textContent = S.lines.map(ln => [...ln].map(ch => /[A-Z]/.test(ch) ? (shown.has(ch) && S.called.has(ch) ? ch : '_') : (ch === ' ' ? ' ' : ch)).join('')).join('\n');
  $('solveInput').value = ''; open('solveOv');
  setTimeout(() => $('solveInput').focus(), 50);
}
function cancelSolve(){ close('solveOv'); if (S.phase === 'solving') setPhase('action'); }
$('solveForm').addEventListener('submit', e => {
  e.preventDefault(); const v = $('solveInput').value.trim(); if (!v) return;
  close('solveOv'); attemptSolve(v);
});
$('solveCancel').onclick = cancelSolve;
$('solveInput').addEventListener('keydown', e => { if (e.key === 'Escape') cancelSolve(); });

/* ================= Buttons & keys ================= */
spinBtn.onclick = () => { if (!spinBtn.disabled) doSpin(); };
canvas.addEventListener('click', () => { if (!spinBtn.disabled) doSpin(); });
vowelBtn.onclick = () => {
  if (S.phase === 'vowel' && isHumanTurn()) { msg(`${esc(cur().name)}, spin, buy a vowel, or solve.`); setPhase('action'); return; }
  if (vowelBtn.disabled) return;
  msg('Which vowel would you like?'); setPhase('vowel');
};
solveBtn.onclick = openSolve;
$('helpBtn').onclick = () => open('helpOv');
$('helpClose').onclick = () => close('helpOv');
$('newBtn').onclick = openSetup;
function paintMute(){ $('muteBtn').textContent = S.muted ? '🔇 Muted' : '🔊 Sound'; }
try { S.muted = localStorage.getItem('ss-muted') === '1'; } catch(e) {}
paintMute();
$('muteBtn').onclick = () => {
  S.muted = !S.muted; paintMute(); if (!S.muted) ac();
  try { localStorage.setItem('ss-muted', S.muted ? '1' : '0'); } catch(e) {}
};
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || anyOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toUpperCase() : '';
  if (/^[A-Z]$/.test(k) && keyEnabled(k)) { e.preventDefault(); guess(k); }
  else if (e.code === 'Space' && !spinBtn.disabled) { e.preventDefault(); doSpin(); }
});

/* ================= Confetti ================= */
function confetti(){
  const colors = ['#ffc94a','#ff4d6d','#4d8dff','#06d6a0','#ff66c4','#ffffff'];
  for (let i = 0; i < 90; i++) {
    const d = document.createElement('div'); d.className = 'conf';
    d.style.left = Math.random() * 100 + 'vw';
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
    d.style.animationDelay = (Math.random() * .6) + 's';
    d.style.transform = `rotate(${Math.random()*360}deg)`;
    document.body.appendChild(d); setTimeout(() => d.remove(), 5000);
  }
}

/* ================= PWA ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker failed to register', err));
  });
}
let deferredInstall = null;
const installBtn = $('installBtn');
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e; installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!deferredInstall) { open('helpOv'); return; }
  deferredInstall.prompt();
  try { await deferredInstall.userChoice; } catch(e) {}
  deferredInstall = null; installBtn.hidden = true;
});
window.addEventListener('appinstalled', () => { installBtn.hidden = true; deferredInstall = null; });

/* ================= Init ================= */
renderBoard('SPIN AND SOLVE', true);
S.players = seatCfg.map(s => ({...s, round: 0, bank: 0}));
renderPlayers(); renderSeats(); updateUI();
resizeWheel();
window.addEventListener('resize', resizeWheel);
try { new ResizeObserver(resizeWheel).observe($('wheelWrap')); } catch(e) {}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel);
})();
