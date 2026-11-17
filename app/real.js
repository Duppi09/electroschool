// ElectroSchool – realistický pohled: skutečné přístroje se svorkami propojené barevnými vodiči.
// Přístroje jsou tytéž prvky jako ve schématu (sdílí označení, nastavení i simulaci); jen se
// prvky se stejným označením (cívka + hlavní a pomocné kontakty stykače, tlačítko s více
// kontakty…) skládají do jednoho fyzického přístroje. Jednotky = milimetry.
(function (root) {
'use strict';
const ES = root.ES;

// ---------------------------------------------------------------- barvy
const INK = '#1d1d1f', BODY = '#f5f5f3', DARK = '#2b2b2e', METAL = '#c9ccd2';
const WCOL = [
  ['#7a4a22', 'hnědá'], ['#1b1b1b', 'černá'], ['#8d8d8d', 'šedá'], ['#2f80ed', 'světle modrá'], ['gnye', 'zelenožlutá'],
  ['#d62828', 'červená'], ['#1f3a93', 'tmavě modrá'], ['#f28c28', 'oranžová'], ['#f4f4f4', 'bílá'], ['#8e44ad', 'fialová'],
];
const WNAME = Object.fromEntries(WCOL);
function hexRgb(h) { const m = /rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/.exec(String(h)); if (m) return [+m[1], +m[2], +m[3]]; h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const v = parseInt(h, 16) || 0; return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function shade(h, f) { const m = f < 0 ? 0 : 255, k = Math.abs(f); return 'rgb(' + hexRgb(h).map(v => Math.round(v + (m - v) * k)).join(',') + ')'; }
function lum(h) { const [r, g, b] = hexRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
const inkOn = h => lum(h) < 0.5 ? '#f2f2f2' : INK;
const pnumR = (v, d) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) && x > 0 ? x : d; };
const fmtA = v => !(v > 0.0005) ? '0 A' : v < 0.1 ? Math.round(v * 1000) + ' mA' : (v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3)).replace('.', ',') + ' A';

// ---------------------------------------------------------------- přístroje = skupiny prvků
function famOf(d) {
  if (d.kind === 'contactor' || (d.kind === 'load' && (d.sub === 'coil' || d.sub === 'pulse' || d.sub === 'stair')) || (d.kind === 'contact' && d.src === 'act' && !d.click && !d.deco)) return 'K';
  if ((d.kind === 'load' && (d.sub === 'ton' || d.sub === 'toff')) || (d.kind === 'contact' && (d.deco === 'ton' || d.deco === 'toff'))) return 'T';
  if (d.kind === 'thermal' || d.click === 'trip') return 'F';
  if (d.kind === 'contact' && ['momentary', 'toggle', 'pir', 'clock'].includes(d.click)) return 'S';
  return null;
}
const isReal = it => ES.REAL_KINDS.has(ES.getDef(it.type).kind);
function devices(doc) {
  const map = new Map(), out = [];
  for (const it of doc.items) {
    const d = ES.getDef(it.type); if (!ES.REAL_KINDS.has(d.kind)) continue;
    const f = famOf(d), k = ES.norm(it.t[0]), key = f && k ? f + ':' + k : 'u' + it.uid;
    let g = map.get(key); if (!g) { g = { key, fam: f, items: [] }; map.set(key, g); out.push(g); }
    g.items.push(it);
  }
  for (const g of out) finishDev(g);
  return out;
}
function finishDev(g) {
  const find = f => g.items.find(i => f(ES.getDef(i.type)));
  let main = null;
  if (g.fam === 'K') { const k = find(d => d.kind === 'contactor'), c = find(d => d.kind === 'load'); main = k || c; g.type = k ? 'contactor' : c ? 'relay' : 'aux'; }
  else if (g.fam === 'T') { main = find(d => d.kind === 'load'); g.type = main ? 'timer' : 'aux'; }
  else if (g.fam === 'F') { main = find(d => d.kind === 'thermal'); g.type = main ? 'thermal' : 'aux'; }
  else if (g.fam === 'S') { const d0 = ES.getDef(g.items[0].type); g.type = d0.click === 'pir' ? 'pir' : d0.home ? 'rocker' : 'button'; }
  else { const d = ES.getDef(g.items[0].type); g.type = d.kind === 'load' ? d.sub : d.kind; }
  g.main = main || g.items[0]; g.uid = g.main.uid; g.name = g.main.t[0] || '';
  g.d = ES.getDef(g.main.type);
}
function termLabel(it, ti) {
  const d = ES.getDef(it.type);
  if (d.kind === 'supply') { const p = d.pots[ti]; return p === 'P' ? 'L+' : p === 'M' ? 'L−' : p; }
  return String(it.t[2 + ti] || '').trim() || (d.labels && d.labels[ti]) || String(ti + 1);
}
const BOXED = new Set(['contactor', 'relay', 'timer', 'thermal', 'aux']);
const DIN = new Set(['emeter', 'emeter3', 'breaker', 'rcd', 'fuse', 'mswitch', 'mstarter', 'contactor', 'relay', 'timer', 'thermal', 'aux']);
const memberRank = it => { const d = ES.getDef(it.type); return d.kind === 'load' ? 0 : d.kind === 'contactor' || d.kind === 'thermal' ? 1 : d.poles && d.poles[0] && d.poles[0].nc ? 3 : 2; };

// rozměry přístroje a poloha svorek (vůči levému hornímu rohu)
function layout(g) {
  const T = [], add = (it, ti, x, y, dir) => T.push({ it, ti, x, y, dir, lab: termLabel(it, ti) });
  const d = g.d, ty = g.type; let w, h;
  if (BOXED.has(ty)) {
    const cols = [];
    for (const it of g.items.slice().sort((a, b) => memberRank(a) - memberRank(b))) {
      const e = ES.getDef(it.type);
      if (e.kind === 'load') cols.push({ it, a: 0, b: 1, kind: 'coil' });
      else (e.poles || []).forEach(p => cols.push({ it, a: p.a, b: p.b, kind: e.kind === 'contactor' || e.kind === 'thermal' ? 'main' : 'aux', nc: p.nc }));
    }
    const pitch = 9;
    w = Math.max({ contactor: 45, thermal: 45, relay: 22.5, timer: 22.5, aux: 18 }[ty], cols.length * pitch + 6);
    h = { contactor: 84, relay: 74, timer: 80, thermal: 60, aux: 50 }[ty];
    const x0 = (w - cols.length * pitch) / 2 + pitch / 2;
    cols.forEach((c, i) => { c.x = x0 + i * pitch; add(c.it, c.a, c.x, 7, [0, -1]); add(c.it, c.b, c.x, h - 7, [0, 1]); });
    return { w, h, T, cols };
  }
  if (ty === 'breaker' || ty === 'rcd' || ty === 'fuse' || ty === 'mswitch') {
    const n = d.n || 1; w = n * 18; h = ty === 'fuse' ? 82 : 88;
    for (let i = 0; i < n; i++) { add(g.main, i, 9 + 18 * i, 8, [0, -1]); add(g.main, i + n, 9 + 18 * i, h - 8, [0, 1]); }
    return { w, h, T };
  }
  if (ty === 'mstarter') { w = 45; h = 92; for (let i = 0; i < 3; i++) { add(g.main, i, 10.5 + 12 * i, 8, [0, -1]); add(g.main, i + 3, 10.5 + 12 * i, h - 8, [0, 1]); } return { w, h, T }; }
  if (ty === 'supply') {
    const n = d.pots.length; w = Math.max(34, n * 11 + 4); h = 42; const x0 = (w - n * 11) / 2;
    for (let i = 0; i < n; i++) add(g.main, i, x0 + 5.5 + 11 * i, h - 7, [0, 1]);
    return { w, h, T, x0 };
  }
  if (ty === 'rocker' || ty === 'hsw' || ty === 'pir' || ty === 'socket') {
    w = 52; h = 64; const ts = [];
    for (const it of g.items) (ES.getDef(it.type).terms || []).forEach((_, ti) => ts.push([it, ti]));
    ts.forEach(([it, ti], i) => add(it, ti, w / 2 + (i - (ts.length - 1) / 2) * 10, 58, [0, 1]));
    return { w, h, T };
  }
  if (ty === 'socket3') { w = 70; h = 76; [0, 1, 2, 3, 4].forEach(i => add(g.main, i, 15 + 10 * i, 70, [0, 1])); return { w, h, T }; }
  if (ty === 'load3') { w = 96; h = 84; [0, 1, 2, 3, 4].forEach(i => add(g.main, i, 28 + 10 * i, 78, [0, 1])); return { w, h, T }; }
  if (ty === 'emeter3') { w = 108; h = 100; [[0, 12], [4, 24], [1, 36], [5, 48], [2, 60], [6, 72], [3, 84], [7, 96]].forEach(([ti, x]) => add(g.main, ti, x, 92, [0, 1])); return { w, h, T }; }
  if (ty === 'heater') { w = 50; h = 92; [0, 1, 2].forEach(i => add(g.main, i, 13 + 12 * i, 86, [0, 1])); return { w, h, T }; }
  if (ty === 'fan') { w = 52; h = 64; [0, 1, 2].forEach(i => add(g.main, i, 14 + 12 * i, 58, [0, 1])); return { w, h, T }; }
  if (ty === 'light') { w = 56; h = 62; [0, 1, 2].forEach(i => add(g.main, i, 16 + 12 * i, 6, [0, -1])); return { w, h, T }; }
  if (ty === 'bell') { w = 40; h = 50; add(g.main, 0, 12, 44, [0, 1]); add(g.main, 1, 28, 44, [0, 1]); return { w, h, T }; }
  if (ty === 'emeter') { w = 72; h = 96; [[0, 14], [2, 29], [1, 44], [3, 59]].forEach(([ti, x]) => add(g.main, ti, x, 88, [0, 1])); return { w, h, T }; }
  if (ty === 'clamp') { const n = d.terms.length; w = n * 7 + 5; h = 20; for (let i = 0; i < n; i++) add(g.main, i, 6 + 7 * i, 5, [0, -1]); return { w, h, T }; }
  if (ty === 'button') {
    const mush = g.items.some(i => ES.getDef(i.type).deco === 'mushroom');
    w = mush ? 40 : 34; const top = mush ? 42 : 36; h = top + g.items.length * 15 + 1;
    g.items.forEach((it, i) => { const p = (ES.getDef(it.type).poles || [{ a: 0, b: 1 }])[0], y = top + i * 15 + 6.5, last = i === g.items.length - 1; add(it, p.a, 4, y, last ? [0, 1] : [-1, 0]); add(it, p.b, w - 4, y, last ? [0, 1] : [1, 0]); });
    return { w, h, T, top, mush };
  }
  if (ty === 'lamp' || ty === 'blink' || ty === 'horn' || ty === 'valve') { w = 32; h = 46; add(g.main, 0, 4, 38, [0, 1]); add(g.main, 1, 28, 38, [0, 1]); return { w, h, T }; }
  if (ty === 'motor3' || ty === 'motorYD' || ty === 'motor1') {
    w = 142; h = 84; const m = g.main;
    if (ty === 'motor1') { add(m, 0, 38, 8, [0, -1]); add(m, 1, 54, 8, [0, -1]); add(m, 2, 74, 13, [0, -1]); }
    else {
      for (let i = 0; i < 3; i++) add(m, i, 36 + 12 * i, 8, [0, -1]);
      add(m, 3, 76, 13, [0, -1]);
      if (ty === 'motorYD') { add(m, 4, 42, 20, [0, -1]); add(m, 5, 54, 20, [0, -1]); add(m, 6, 66, 20, [0, -1]); }
    }
    return { w, h, T };
  }
  if (ty === 'meter') { w = 48; h = 58; add(g.main, 0, 14, 52, [0, 1]); add(g.main, 1, 34, 52, [0, 1]); return { w, h, T }; }
  if (ty === 'trafo') { w = 56; h = 66; add(g.main, 0, 14, 7, [0, -1]); add(g.main, 1, 42, 7, [0, -1]); add(g.main, 2, 14, 59, [0, 1]); add(g.main, 3, 42, 59, [0, 1]); return { w, h, T }; }
  w = 30; h = 30; (d.terms || []).forEach((_, i) => add(g.main, i, 5 + i * 8, 25, [0, 1]));
  return { w, h, T };
}

// automatické rozmístění přístrojů, které ještě nemají polohu (lišta / dveře / stroje)
const RANK = { emeter3: 0, socket3: 1, load3: 2, heater: 2, fan: 2, emeter: 0, clamp: 1, rocker: 1, hsw: 1, pir: 1, socket: 1, light: 2, bell: 2, supply: 0, trafo: 0, fuse: 0, breaker: 0, rcd: 0, mstarter: 0, mswitch: 0, contactor: 0, relay: 0, timer: 0, thermal: 0, aux: 0, button: 1, lamp: 1, blink: 1, horn: 1, meter: 1, valve: 2, motor3: 2, motorYD: 2, motor1: 2 };
const ORDER = ['supply', 'emeter', 'emeter3', 'fuse', 'breaker', 'rcd', 'mstarter', 'mswitch', 'trafo', 'contactor', 'relay', 'timer', 'thermal', 'aux', 'button', 'lamp', 'blink', 'horn', 'meter', 'valve', 'motor3', 'motorYD', 'motor1', 'rocker', 'hsw', 'pir', 'socket', 'socket3', 'clamp', 'light', 'bell', 'fan', 'heater', 'load3'];
function scene(doc) {
  if (!doc.real) doc.real = ES.emptyReal();
  const r = doc.real, devs = devices(doc), L = new Map(), T = new Map();
  for (const g of devs) L.set(g, layout(g));
  const rects = [], free = (x, y, w, h) => rects.every(q => x + w + 10 <= q[0] || x >= q[2] + 10 || y + h + 40 <= q[1] || y >= q[3] + 40);
  for (const g of devs) { const p = r.pos[g.uid]; if (p) { const l = L.get(g); rects.push([p[0], p[1], p[0] + l.w, p[1] + l.h]); } }
  const todo = devs.filter(g => !r.pos[g.uid]).sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  for (const g of todo) {
    const l = L.get(g), y0 = [0, 170, 300][RANK[g.type] || 0];
    search: for (let y = y0; y < y0 + 3000; y += 10) for (let x = 0; x <= Math.max(0, 560 - l.w); x += 5) if (free(x, y, l.w, l.h)) { r.pos[g.uid] = [x, y]; rects.push([x, y, x + l.w, y + l.h]); break search; }
  }
  for (const g of devs) {
    const p = r.pos[g.uid], l = L.get(g); g.x = p[0]; g.y = p[1]; g.w = l.w; g.h = l.h; g.L = l;
    for (const t of l.T) { const k = t.it.uid + ':' + t.ti; T.set(k, { key: k, g, it: t.it, ti: t.ti, x: g.x + t.x, y: g.y + t.y, dir: t.dir, lab: t.lab }); }
  }
  return { devs, T };
}
function termName(t) { return (t.it.t[0] || ES.getDef(t.it.type).name) + ':' + t.lab; }

// ---------------------------------------------------------------- geometrie vodiče
// Vodič = rovné úseky se zaoblenými rohy: krátký vývod ze svorky ve směru svorky, rovně
// k vývodu cílové svorky (případně přes lomové body) a zase do svorky.
function wirePts(A, B, bends) {
  const stub = 7, P = [[A.x, A.y], [A.x + A.dir[0] * stub, A.y + A.dir[1] * stub]];
  if (bends && bends.length) P.push(...bends);
  else if (B.dir) {
    // cíl „za zády“ vývodu: obejít bokem, ať vodič nejde přes přístroj
    const ax = P[1][0], ay = P[1][1], bx = B.x + B.dir[0] * stub, by = B.y + B.dir[1] * stub;
    const behindA = (bx - ax) * A.dir[0] + (by - ay) * A.dir[1] < 0, behindB = (ax - bx) * B.dir[0] + (ay - by) * B.dir[1] < 0;
    if (A.dir[0] === B.dir[0] && A.dir[1] === B.dir[1]) {
      // obě svorky na stejné straně: můstek, delší vodič výš, ať se nepřekrývají
      const dist = Math.hypot(B.x - A.x, B.y - A.y), off = 7 + Math.min(28, dist * 0.09);
      if (A.dir[0] === 0) { const y = A.dir[1] < 0 ? Math.min(A.y, B.y) - off : Math.max(A.y, B.y) + off; P.length = 1; P.push([A.x, y], [B.x, y]); }
      else { const x = A.dir[0] < 0 ? Math.min(A.x, B.x) - off : Math.max(A.x, B.x) + off; P.length = 1; P.push([x, A.y], [x, B.y]); }
      P.push([B.x, B.y]);
      return fillet(P);
    }
    if (behindA && behindB && A.dir[0] === 0 && B.dir[0] === 0) { const mx = (ax + bx) / 2 + (Math.abs(bx - ax) < 20 ? 14 : 0); P.push([mx, ay], [mx, by]); }
  }
  if (B.dir) P.push([B.x + B.dir[0] * stub, B.y + B.dir[1] * stub]);
  P.push([B.x, B.y]);
  return fillet(P);
}
function fillet(P, rad) {
  const pts = P.filter((p, i) => i === 0 || Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) > 0.01);
  const out = [pts[0]], R = rad || 5;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const d = Math.min(R, l1 / 2, l2 / 2);
    const s0 = [p1[0] - (p1[0] - p0[0]) / l1 * d, p1[1] - (p1[1] - p0[1]) / l1 * d], e0 = [p1[0] + (p2[0] - p1[0]) / l2 * d, p1[1] + (p2[1] - p1[1]) / l2 * d];
    out.push(s0);
    for (let k = 1; k < 8; k++) { const t = k / 8, u = 1 - t; out.push([u * u * s0[0] + 2 * u * t * p1[0] + t * t * e0[0], u * u * s0[1] + 2 * u * t * p1[1] + t * t * e0[1]]); }
    out.push(e0);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ---------------------------------------------------------------- vedení vodičů (router)
// Vodič vyjde ze svorky ve směru svorky ven z přístroje a dál vede po nepravidelné mřížce
// (čáry mřížky leží i přesně v ose svorek) hledáním nejlevnější cesty A*: přístroje obchází
// s odstupem, s jiným vodičem se nesmí překrýt ani se lomit v jeho bodě, křížit se smí.
// Vodiče od téže svorky (svazek) se překrývat smějí. Výsledek se ukládá do mezipaměti.
const RCACHE = new WeakMap();
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const dirIdx = d => d[0] > 0 ? 0 : d[1] > 0 ? 1 : d[0] < 0 ? 2 : 3;
function routes(doc, sc) {
  const r = doc.real, wires = r.wires;
  const sig = sc.devs.map(g => g.uid + ':' + g.x + ',' + g.y + ',' + g.w + ',' + g.h).join(';') + '|' + wires.map(w => w.a + '-' + w.b + '-' + (w.p || []).join('/')).join(';');
  const hit = RCACHE.get(r); if (hit && hit.sig === sig) return hit.out;
  const out = new Array(wires.length).fill(null);
  const M = 3.5, GAP = 3;                              // odstup od přístroje, rozteč mřížky
  const rects = sc.devs.map(g => [g.x - M, g.y - M, g.x + g.w + M, g.y + g.h + M]);
  // výstup ze svorky: kolmo ven z vlastního přístroje
  const exitOf = t => { const g = t.g, o = M + 2.5, F = v => Math.floor(v / GAP) * GAP, C = v => Math.ceil(v / GAP) * GAP;
    if (t.dir[1] < 0) return [t.x, F(g.y - o)]; if (t.dir[1] > 0) return [t.x, C(g.y + g.h + o)];
    if (t.dir[0] < 0) return [F(g.x - o), t.y]; return [C(g.x + g.w + o), t.y]; };
  const jobs = [];
  wires.forEach((w, i) => {
    const A = sc.T.get(w.a[0] + ':' + w.a[1]), B = sc.T.get(w.b[0] + ':' + w.b[1]); if (!A || !B) return;
    if (w.p && w.p.length) { out[i] = wirePts(A, B, w.p); return; }
    const sa = exitOf(A), sb = exitOf(B);
    jobs.push({ i, A, B, sa, sb, keys: [A.key, B.key], len: Math.abs(sa[0] - sb[0]) + Math.abs(sa[1] - sb[1]) });
  });
  if (!jobs.length) { RCACHE.set(r, { sig, out }); return out; }
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const q of rects) { bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[2]); by1 = Math.max(by1, q[3]); }
  bx0 -= 40; by0 -= 40; bx1 += 40; by1 += 40;
  const axis = (imp, a0, a1) => {
    const v = [...new Set(imp.map(x => Math.round(x * 100) / 100))].sort((p, q) => p - q), res = [];
    let k = 0;
    for (let x = Math.floor(a0 / GAP) * GAP; x <= a1; x += GAP) {
      while (k < v.length && v[k] <= x + GAP / 2) { res.push(v[k]); k++; }
      if (!res.length || Math.abs(res[res.length - 1] - x) > 1.3) { if (!(k < v.length && Math.abs(v[k] - x) < 1.3)) res.push(x); }
    }
    while (k < v.length) res.push(v[k++]);
    return [...new Set(res)].sort((p, q) => p - q);
  };
  const XS = axis(jobs.flatMap(j => [j.sa[0], j.sb[0]]), bx0, bx1), YS = axis(jobs.flatMap(j => [j.sa[1], j.sb[1]]), by0, by1);
  const nx = XS.length, ny = YS.length, N = nx * ny;
  const ix = new Map(XS.map((x, i) => [Math.round(x * 100) / 100, i])), iy = new Map(YS.map((y, i) => [Math.round(y * 100) / 100, i]));
  const nodeOf = p => { const a = ix.get(Math.round(p[0] * 100) / 100), b = iy.get(Math.round(p[1] * 100) / 100); return a === undefined || b === undefined ? -1 : b * nx + a; };
  const lb = (arr, v) => { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; };
  const blocked = new Uint8Array(N);
  for (const q of rects) { const i0 = lb(XS, q[0] + 0.01), i1 = lb(XS, q[2] - 0.01), j0 = lb(YS, q[1] + 0.01), j1 = lb(YS, q[3] - 0.01); for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) blocked[j * nx + i] = 1; }
  // obsazení: hrany (souběh) a uzly (lom / konec / průchod)
  const edgeUse = new Map(), nodeUse = new Map();
  const ekey = (a, d) => d === 0 ? a * 2 : d === 2 ? (a - 1) * 2 : d === 1 ? a * 2 + 1 : (a - nx) * 2 + 1;
  const users = (m, k) => m.get(k) || null;
  jobs.sort((p, q) => p.len - q.len);
  for (const job of jobs) {
    const s = nodeOf(job.sa), t = nodeOf(job.sb);
    const friendly = id => { const o = wires[id]; const ka = o.a[0] + ':' + o.a[1], kb = o.b[0] + ':' + o.b[1]; return job.keys.includes(ka) || job.keys.includes(kb); };
    const hostile = list => list && list.some(id => !friendly(id));
    let path = null;
    if (s >= 0 && t >= 0) {
      const d0 = dirIdx(job.A.dir), dEnd = (dirIdx(job.B.dir) + 2) % 4;
      const G = new Float64Array(N * 4).fill(Infinity), P = new Int32Array(N * 4).fill(-1);
      const heap = [];
      const push = (f, st) => { heap.push([f, st]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr2 = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr2 < heap.length && heap[rr2][0] < heap[m][0]) m = rr2; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
      const tx = XS[t % nx], ty = YS[(t / nx) | 0], hf = n => 1.4 * (Math.abs(XS[n % nx] - tx) + Math.abs(YS[(n / nx) | 0] - ty)); // vážené A*: rychlé, téměř optimální
      G[s * 4 + d0] = 0; push(hf(s), s * 4 + d0);
      let steps = 0, goal = -1;
      while (heap.length && steps++ < 250000) {
        const [f, st] = pop(), u = st >> 2, d = st & 3, g = G[st];
        if (f - hf(u) > g + 1e-9) continue;
        if (u === t) { goal = st; break; }
        const nu = users(nodeUse, u), ux = u % nx, uy = (u / nx) | 0;
        for (let nd = 0; nd < 4; nd++) {
          if (nd === (d + 2) % 4) continue;
          const vx = ux + DIRS[nd][0], vy = uy + DIRS[nd][1]; if (vx < 0 || vy < 0 || vx >= nx || vy >= ny) continue;
          const v = vy * nx + vx;
          const turn = nd !== d;
          if (nu && u !== s) {
            if (turn && hostile(nu.all)) continue;                          // lom v bodě cizího vodiče
            if (!turn && (hostile(nu.t) || hostile(nd & 1 ? nu.v : nu.h))) continue;
          }
          const eu = users(edgeUse, ekey(u, nd)); if (hostile(eu)) continue; // souběh s cizím vodičem
          // souběžná čára těsně vedle (méně než 2,6 mm) obsazená cizím vodičem = vizuální překryv
          let near = false;
          if (nd & 1) { for (const k of [-1, 1]) { const xx = ux + k; if (xx >= 0 && xx < nx && Math.abs(XS[xx] - XS[ux]) < 2.6 && hostile(users(edgeUse, ekey(uy * nx + xx, nd)))) near = true; } }
          else { for (const k of [-1, 1]) { const yy = uy + k; if (yy >= 0 && yy < ny && Math.abs(YS[yy] - YS[uy]) < 2.6 && hostile(users(edgeUse, ekey(yy * nx + ux, nd)))) near = true; } }
          if (near) continue;
          let cost = Math.abs(XS[vx] - XS[ux]) + Math.abs(YS[vy] - YS[uy]);
          if (blocked[v] && v !== t) cost += 80;                            // přes přístroj jen v nouzi
          if (turn) cost += 7;
          if (eu) cost += 2;
          if (nu && !turn && u !== s && hostile(nd & 1 ? nu.h : nu.v)) cost += 5;   // křížení
          if (v === t && nd !== dEnd) cost += 7;
          const ns = v * 4 + nd, ng = g + cost;
          if (ng < G[ns]) { G[ns] = ng; P[ns] = st; push(ng + hf(v), ns); }
        }
      }
      if (goal >= 0) { path = []; for (let st = goal; st >= 0; st = P[st]) path.push(st >> 2); path.reverse(); }
    }
    if (!path) { out[job.i] = wirePts(job.A, job.B); out[job.i].fallback = s < 0 || t < 0 ? 'uzel' : blocked[s] ? 'start v překážce' : 'nenalezeno'; continue; }
    // zapsat obsazení
    const reg = (m, k, field) => { let o = m.get(k); if (!o) m.set(k, o = field ? { all: [], h: [], v: [], t: [] } : []); if (field) { o.all.push(job.i); o[field].push(job.i); } else o.push(job.i); };
    for (let k = 0; k < path.length; k++) {
      const u = path[k], prev = path[k - 1], next = path[k + 1];
      const dIn = prev === undefined ? -1 : (u - prev === 1 ? 0 : u - prev === -1 ? 2 : u > prev ? 1 : 3);
      const dOut = next === undefined ? -1 : (next - u === 1 ? 0 : next - u === -1 ? 2 : next > u ? 1 : 3);
      reg(nodeUse, u, dIn < 0 || dOut < 0 || dIn !== dOut ? 't' : (dIn & 1 ? 'v' : 'h'));
      if (dOut >= 0) reg(edgeUse, ekey(u, dOut));
    }
    const pts = [[job.A.x, job.A.y]];
    const P2 = path.map(n => [XS[n % nx], YS[(n / nx) | 0]]);
    for (let k = 0; k < P2.length; k++) { const a = P2[k - 1], b = P2[k], c = P2[k + 1]; if (!a || !c || (b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0])) pts.push(b); }
    pts.push([job.B.x, job.B.y]);
    out[job.i] = fillet(pts, 4);
  }
  RCACHE.set(r, { sig, out });
  return out;
}

function strokePath(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
function drawWire(c, pts, col, sel, live) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (sel) { c.strokeStyle = 'rgba(10,102,232,.6)'; c.lineWidth = 4; strokePath(c, pts); }
  if (live) { c.strokeStyle = 'rgba(255,214,64,.55)'; c.lineWidth = 3.4; strokePath(c, pts); }
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 2.1; strokePath(c, pts);
  c.lineWidth = 1.55;
  if (col === 'gnye') { c.strokeStyle = '#2f9e44'; strokePath(c, pts); c.setLineDash([2.4, 2.4]); c.strokeStyle = '#f3d21c'; strokePath(c, pts); c.setLineDash([]); }
  else { c.strokeStyle = col; strokePath(c, pts); }
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 0.45; strokePath(c, pts);
}

// ---------------------------------------------------------------- kreslení přístrojů
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function box(c, x, y, w, h, r, fill, lw) { rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); c.lineWidth = lw || 0.45; c.strokeStyle = INK; c.stroke(); }
function grad(c, y0, y1, col, a, b) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, shade(col, a)); g.addColorStop(1, shade(col, b)); return g; }
function txt(c, s, x, y, size, col, align, bold) { c.font = (bold ? '600 ' : '') + size + 'px -apple-system, "Helvetica Neue", Arial, sans-serif'; c.fillStyle = col || INK; c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y); }
function circ(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 0.4; c.strokeStyle = stroke; c.stroke(); } }
function screw(c, x, y) {
  box(c, x - 3.3, y - 3.3, 6.6, 6.6, 0.9, '#3a3a3e', 0.3);
  const g = c.createRadialGradient(x - 0.8, y - 0.8, 0.3, x, y, 2.6); g.addColorStop(0, '#fbfbfb'); g.addColorStop(1, '#9ea3ab');
  circ(c, x, y, 2.5, g, '#555', 0.3);
  c.strokeStyle = '#555'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(x - 1.6, y); c.lineTo(x + 1.6, y); c.moveTo(x, y - 1.6); c.lineTo(x, y + 1.6); c.stroke();
}
function nameplate(c, s, x, y, w, base) { if (!s) return; box(c, x - w / 2, y - 3, w, 6, 0.8, '#ffffff', 0.3); txt(c, s, x, y + 0.2, 3.6, INK, 'center', true); }
function termLabels(c, g, ink) {
  for (const t of g.L.T) {
    const up = t.dir[1] < 0, dn = t.dir[1] > 0, lx = t.dir[0] ? t.x - t.dir[0] * 6.5 : t.x, ly = up ? t.y + 6 : dn ? t.y - 6 : t.y;
    txt(c, t.lab, lx, ly, 2.7, ink, 'center', true);
  }
}

function drawDevice(c, g, S) {
  const L = g.L, w = L.w, h = L.h, base = (S.col && S.col.b) || BODY, ink = inkOn(base), ty = g.type, it = g.main, d = g.d;
  c.save(); c.translate(g.x, g.y);
  c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = S.icon ? 0 : 6; c.shadowOffsetY = S.icon ? 0 : 1.5;
  const body = (x, y, ww, hh, r) => { rr(c, x, y, ww, hh, r); c.fillStyle = grad(c, y, y + hh, base, 0.18, -0.06); c.fill(); c.shadowColor = 'transparent'; c.lineWidth = 0.45; c.strokeStyle = INK; c.stroke(); };
  if (BOXED.has(ty)) {
    body(0, 0, w, h, 3);
    box(c, 1.2, 1.2, w - 2.4, 12.6, 1.5, shade(base, -0.08), 0.3); box(c, 1.2, h - 13.8, w - 2.4, 12.6, 1.5, shade(base, -0.08), 0.3);
    // oddělení bočních pomocných bloků
    let prev = null; c.strokeStyle = shade(base, -0.4); c.lineWidth = 0.35;
    for (const col of L.cols) { if (prev && prev.kind !== 'aux' && col.kind === 'aux' && ty !== 'aux') { const x = col.x - 4.5; c.beginPath(); c.moveTo(x, 1); c.lineTo(x, h - 1); c.stroke(); } prev = col; }
    const mx = w / 2, my = h / 2;
    box(c, 4, 16.5, w - 8, h - 33, 2, shade(base, 0.35), 0.3);
    nameplate(c, g.name, mx, 21.5, Math.min(w - 10, 20), base);
    if (ty === 'contactor' || ty === 'relay' || ty === 'aux') {
      const act = !!S.act, ww = Math.min(14, w - 12);
      box(c, mx - ww / 2, my - 4, ww, 10, 1, '#222', 0.3);
      box(c, mx - ww / 2 + 1, act ? my + 0.5 : my - 3, ww - 2, 4.5, 0.6, act ? '#e8e8e8' : '#777', 0.2);
      txt(c, act ? 'I' : 'O', mx, act ? my + 2.8 : my - 0.8, 3.2, act ? INK : '#eee', 'center', true);
      txt(c, ty === 'contactor' ? 'AC-3' : ty === 'relay' ? ({ pulse: 'impulsní relé', stair: 'schod. automat' }[d.sub] || 'relé') : 'pom. kontakty', mx, h - 20.5, 2.3, ink);
      if (S.sim && d.sub === 'stair' && S.left > 0) txt(c, Math.ceil(S.left) + ' s', mx, my + 11, 3, '#0a66e8', 'center', true);
    }
    if (ty === 'timer') {
      const tm = S.tm || {}, sec = ES.secondsOf(it);
      circ(c, mx, my + 1, 6.5, shade(base, 0.5), INK, 0.4);
      const ang = -Math.PI * 0.75 + Math.min(1, sec / 60) * Math.PI * 1.5; c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(mx, my + 1); c.lineTo(mx + Math.cos(ang - Math.PI / 2) * 5.5, my + 1 + Math.sin(ang - Math.PI / 2) * 5.5); c.stroke();
      circ(c, mx - 5, my - 9, 1.3, S.on ? '#38d14a' : '#2b4a2e', '#111', 0.25); circ(c, mx + 5, my - 9, 1.3, tm.done ? '#ffcc22' : '#4a4325', '#111', 0.25);
      txt(c, 'U', mx - 5, my - 12, 2.2, ink); txt(c, 'R', mx + 5, my - 12, 2.2, ink);
      txt(c, (tm.left > 0 ? tm.left.toFixed(1) : String(sec)).replace('.', ',') + ' s', mx, my + 11.5, 3, ink, 'center', true);
      txt(c, d.sub === 'ton' ? 'zpožď. přítah' : 'zpožď. odpad', mx, h - 20.5, 2.3, ink);
    }
    if (ty === 'thermal') {
      const tr = !!S.trip, M = S.meas || {};
      circ(c, mx - 8, my + 1, 5.5, shade(base, 0.5), INK, 0.4); txt(c, 'Ir', mx - 8, my - 0.6, 2.4, INK); txt(c, (it.t[8] || '–') + ' A', mx - 8, my + 2.4, 2.4, INK, 'center', true);
      circ(c, mx + 7, my - 1, 3.4, '#2f6fd6', INK, 0.4); txt(c, 'R', mx + 7, my - 0.9, 2.6, '#fff', 'center', true);
      box(c, mx + 3.5, my + 4.5, 7, 3.6, 0.6, tr ? '#ff9d1a' : '#3b3b3b', 0.25);
      if (S.sim && M.I !== undefined) txt(c, fmtA(M.I) + (M.heat > 0.02 ? ' · ' + Math.round(Math.min(1, M.heat) * 100) + ' %' : ''), mx, h - 20.5, 2.5, M.heat >= 1 ? '#c62828' : ink, 'center', true);
    }
    termLabels(c, g, inkOn(shade(base, -0.08)));
    // popis kontaktů u bočních bloků
    for (const col of L.cols) if (col.kind === 'aux') txt(c, col.nc ? 'NC' : 'NO', col.x, h / 2 + (ty === 'aux' ? 0 : 13), 2.2, ink, 'center', true);
  } else if (ty === 'breaker' || ty === 'rcd' || ty === 'fuse' || ty === 'mswitch') {
    body(0, 0, w, h, 2);
    box(c, 1, 1, w - 2, 15, 1.2, shade(base, -0.08), 0.3); box(c, 1, h - 16, w - 2, 15, 1.2, shade(base, -0.08), 0.3);
    box(c, 2, 21, w - 4, h - 42, 2, shade(base, 0.3), 0.35);
    const on = !!S.on, mx = w / 2, lev = (S.col && S.col.h) || DARK;
    nameplate(c, g.name, mx, 26, Math.min(w - 6, 16), base);
    if (ty === 'fuse') {
      box(c, 4, 31, w - 8, h - 54, 2, shade(base, -0.15), 0.4);
      for (let i = 0; i < (d.n || 1); i++) { const x = 9 + 18 * i; box(c, x - 3, 36, 6, 14, 1.4, '#e9e3d0', 0.35); circ(c, x, 54, 1.5, S.blown ? '#e53935' : '#888', '#222', 0.25); }
      txt(c, S.blown ? 'přepálená' : 'gG', mx, h - 25, 2.6, S.blown ? '#c62828' : ink, 'center', true);
    } else if (ty === 'mswitch') {
      const r = Math.min(9, w / 2 - 3), cy = h / 2 + 2;
      circ(c, mx, cy, r + 2, shade(base, -0.1), INK, 0.35); txt(c, '0', mx - r - 0.5, cy - r - 1, 2.6, ink); txt(c, 'I', mx + r + 0.5, cy - r - 1, 2.6, ink);
      c.save(); c.translate(mx, cy); c.rotate(on ? Math.PI / 4 : -Math.PI / 4); box(c, -2.4, -r, 4.8, 2 * r, 2.2, lev, 0.4); c.restore();
    } else {
      const ly = h / 2 + (on ? -6 : 4);
      box(c, 4, h / 2 - 9, w - 8, 18, 1.5, '#2a2a2a', 0.3);
      box(c, 5.5, ly, w - 11, 7, 1.4, lev, 0.4); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(6.5, ly + 0.8, w - 13, 1.2);
      box(c, mx - 3, h / 2 + 12, 6, 3.4, 0.6, on ? '#43a047' : '#e53935', 0.25);  // zapnuto zelená, vypnuto červená
      txt(c, on ? 'I ON' : 'O OFF', mx, h / 2 + 18.5, 2.4, ink, 'center', true);
      if (ty === 'rcd') { box(c, w - 10, 30, 7, 5.5, 1, '#ffe14d', 0.35); txt(c, 'T', w - 6.5, 32.9, 3, INK, 'center', true); txt(c, 'IΔn 30 mA', mx - (w > 40 ? 6 : 2), 33, 2.4, ink); }
      else txt(c, (d.n || 1) + 'P', mx, 33, 2.6, ink, 'center', true);
    }
    termLabels(c, g, inkOn(shade(base, -0.08)));
  } else if (ty === 'mstarter') {
    body(0, 0, w, h, 2.5);
    box(c, 1, 1, w - 2, 15, 1.2, shade(base, -0.08), 0.3); box(c, 1, h - 16, w - 2, 15, 1.2, shade(base, -0.08), 0.3);
    box(c, 3, 20, w - 6, h - 40, 2, shade(base, 0.3), 0.35);
    nameplate(c, g.name, w / 2, 25, 18, base);
    const on = !!S.on, M = S.meas || {}, cy = h / 2 + 6;
    circ(c, w / 2 + 11, 33, 4.5, shade(base, 0.5), INK, 0.35); txt(c, (it.t[8] || '–') + ' A', w / 2 + 11, 33, 2.3, INK, 'center', true); txt(c, 'Ir', w / 2 + 3, 33, 2.4, ink);
    circ(c, w / 2, cy, 12, '#3a3a3a', INK, 0.4);
    c.save(); c.translate(w / 2, cy); c.rotate(on ? 0 : -Math.PI / 2); box(c, -3.5, -12.5, 7, 25, 3, (S.col && S.col.h) || DARK, 0.45); circ(c, 0, -9.5, 1, '#fff'); c.restore();
    txt(c, 'O', w / 2 - 15, cy, 2.6, ink); txt(c, 'I', w / 2, cy - 15, 2.6, ink);
    if (S.sim) txt(c, fmtA(M.I) + (M.heat > 0.02 ? ' · ' + Math.round(Math.min(1, M.heat) * 100) + ' %' : ''), w / 2, h - 23, 2.5, M.heat >= 1 ? '#c62828' : ink, 'center', true);
    termLabels(c, g, inkOn(shade(base, -0.08)));
  } else if (ty === 'supply') {
    body(0, 0, w, 15, 2);
    const lbl = { 3007: '3×400/230 V 50 Hz', 3005: '3×400/230 V', 3004: '3×400 V', 3006: '3×400 V + PE', 3008: '230 V 50 Hz', 3003: '230 V 50 Hz', 3009: '24 V DC' }[it.type] || 'napájení';
    txt(c, lbl, w / 2, 5.2, 3.1, ink, 'center', true); txt(c, g.name || '-X', w / 2, 10.6, 2.6, ink);
    d.pots.forEach((p, i) => {
      const x = L.x0 + 11 * i;
      rr(c, x + 0.5, 16, 10, h - 16, 1.2); c.fillStyle = grad(c, 16, h, base, 0.12, -0.12); c.fill(); c.lineWidth = 0.4; c.strokeStyle = INK; c.stroke();
      txt(c, termLabel(it, i), x + 5.5, 22.5, 3.2, ink, 'center', true);
    });
    c.shadowColor = 'transparent';
  } else if (ty === 'button') {
    const top = L.top, cx = w / 2, cy = top / 2 - 1, deco = ES.getDef(g.items[0].type).deco, act = !!S.act;
    body(1, 1, w - 2, top - 2, 3);
    const head = (S.col && S.col.h) || DARK;
    if (deco === 'toggle') {
      circ(c, cx, cy, 13, '#d9d9d9', INK, 0.5); circ(c, cx, cy, 10, '#3a3a3a', INK, 0.4);
      txt(c, '0', cx - 12, 4.8, 3, inkOn(base), 'center', true); txt(c, '1', cx + 12, 4.8, 3, inkOn(base), 'center', true);
      c.save(); c.translate(cx, cy); c.rotate(act ? Math.PI / 4 : -Math.PI / 4); box(c, -2.6, -10, 5.2, 20, 2.4, head, 0.45); c.fillStyle = '#fff'; c.fillRect(-0.4, -9, 0.8, 4); c.restore();
    } else if (deco === 'limit') {
      box(c, cx - 9, cy - 3, 18, 15, 1.5, shade(base, -0.06), 0.4);
      c.save(); c.translate(cx, cy); c.rotate(act ? -0.5 : 0); c.strokeStyle = '#555'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -12); c.stroke(); circ(c, 0, -13, 3, head, INK, 0.4); c.restore();
      circ(c, cx, cy, 1.8, METAL, INK, 0.3);
    } else {
      const R = L.mush ? 17 : 12.5;
      circ(c, cx, cy, R * 0.9 + 1.5, '#c4c6ca', INK, 0.5);
      const r = act ? R * 0.84 : R * 0.9, gg = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      gg.addColorStop(0, shade(head, act ? 0.05 : 0.35)); gg.addColorStop(1, shade(head, act ? -0.35 : -0.1));
      circ(c, cx, cy, L.mush ? R : r * (act ? 1 : 0.92), gg, INK, 0.5);
      if (act) circ(c, cx, cy, r * 0.82, null, 'rgba(0,0,0,.35)', 0.8);
    }
    nameplate(c, g.name, cx, top - 3.5, 14, base);
    g.items.forEach((m, i) => {
      const y = top + i * 15, nc = ES.getDef(m.type).poles[0].nc;
      rr(c, 2, y + 0.5, w - 4, 13, 1.5); c.fillStyle = grad(c, y, y + 13, base, 0.05, -0.15); c.fill(); c.lineWidth = 0.4; c.strokeStyle = INK; c.stroke();
      txt(c, nc ? 'NC' : 'NO', w / 2, y + 4.3, 2.6, ink, 'center', true);
    });
    c.shadowColor = 'transparent';
    for (const t of L.T) txt(c, t.lab, t.x + (t.x < w / 2 ? 8.5 : -8.5), t.y + 3.4, 2.5, ink, 'center', true);
  } else if (ty === 'lamp' || ty === 'blink' || ty === 'horn' || ty === 'valve') {
    body(3, 26, w - 6, 18, 2);
    const cx = w / 2, cy = 14;
    if (ty === 'valve') {
      box(c, cx - 11, 2, 22, 22, 2, shade(base, -0.05), 0.45); box(c, cx - 7, 6, 14, 14, 1.5, shade(base, 0.25), 0.35);
      circ(c, cx, 13, 2, S.on ? '#ffd23f' : '#5b5130', '#111', 0.3); txt(c, 'Y', cx, 20.5, 2.4, ink, 'center', true);
    } else {
      circ(c, cx, cy, 13, '#bfc2c7', INK, 0.5); circ(c, cx, cy, 11, '#3a3a3a');
      if (ty === 'horn') {
        circ(c, cx, cy, 9.5, '#2d2d2d'); c.strokeStyle = '#666'; c.lineWidth = 0.6; for (let r = 2.5; r < 9; r += 2.2) circ(c, cx, cy, r, null, '#5c5c5c', 0.6);
        if (S.on) { c.strokeStyle = '#e53935'; c.lineWidth = 0.8; for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(cx, cy, 11 + i * 3, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(cx, cy, 11 + i * 3, Math.PI - 0.6, Math.PI + 0.6); c.stroke(); } }
      } else {
        const col = ES.LAMP[(parseInt(it.t[4]) || 0) % ES.LAMP.length], blinkOff = ty === 'blink' && S.sim && Math.floor(S.sim.t * 2.5) % 2 === 1;
        const lvl = S.sim && !blinkOff ? (S.lvl || 0) : 0, lit = lvl > 0.04;
        const g2 = c.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 9.5);
        if (lit) { g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.35, shade(col, 0.25)); g2.addColorStop(1, col); c.shadowColor = col; c.shadowBlur = 25 * lvl; c.globalAlpha = 0.55 + 0.45 * lvl; }
        else { g2.addColorStop(0, shade(col, 0.55)); g2.addColorStop(1, shade(col, -0.45)); }
        circ(c, cx, cy, 9.5, g2); c.shadowBlur = 0; c.shadowColor = 'transparent'; c.globalAlpha = 1;
        c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(cx - 3, cy - 4, 3.5, 2, -0.5, 0, 7); c.fill();
      }
    }
    nameplate(c, g.name, cx, 31.5, 14, base);
    c.shadowColor = 'transparent';
    for (const t of L.T) txt(c, t.lab, t.x + (t.x < w / 2 ? 7.5 : -7.5), t.y + 3.6, 2.4, ink, 'center', true);
  } else if (ty === 'rocker' || ty === 'hsw' || ty === 'pir' || ty === 'socket') {
    // domovní přístroj: rámeček 50×50 s kolébkou / zásuvkou, svorky vespod
    rr(c, 1, 1, 50, 50, 5); c.fillStyle = grad(c, 1, 51, base, 0.2, -0.05); c.fill(); c.shadowColor = 'transparent'; c.lineWidth = 0.45; c.strokeStyle = INK; c.stroke();
    const inner = shade(base, -0.04), key = (S.col && S.col.h) || base;
    box(c, 8, 8, 36, 36, 3, inner, 0.35);
    const rocker = (x, y, ww, hh, on) => {
      const gg = c.createLinearGradient(0, y, 0, y + hh); gg.addColorStop(0, shade(key, on ? -0.12 : 0.25)); gg.addColorStop(1, shade(key, on ? 0.25 : -0.12));
      rr(c, x, y, ww, hh, 2); c.fillStyle = gg; c.fill(); c.lineWidth = 0.4; c.strokeStyle = INK; c.stroke();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + ww / 2 - 2.5, on ? y + hh - 5 : y + 3, 5, 1.2);
    };
    if (ty === 'socket') {
      circ(c, 26, 26, 16, shade(base, -0.08), INK, 0.4); circ(c, 26, 26, 13.5, shade(base, 0.15), INK, 0.3);
      circ(c, 20, 27, 2, '#222'); circ(c, 32, 27, 2, '#222'); box(c, 24.6, 13, 2.8, 6, 1, METAL, 0.3);
      if (S.plug) { circ(c, 26, 27, 10, '#2d2d2d', INK, 0.4); box(c, 23.5, 36, 5, 14, 1.5, '#2d2d2d', 0.3); txt(c, (it.t[9] || 1000) + ' W', 26, 26, 2.8, '#fff', 'center', true); }
      if (S.sim && S.meas) txt(c, Math.round(S.meas.U) + ' V' + (S.meas.pe ? '' : ' ⚠ PE'), 26, 47.5, 2.6, S.meas.pe ? '#0a66e8' : '#c62828', 'center', true);
    } else if (ty === 'pir') {
      const act = !!S.act; circ(c, 26, 26, 13, act ? '#fff6d0' : '#fafafa', INK, 0.45);
      c.strokeStyle = '#bbb'; c.lineWidth = 0.4; for (let r = 4; r < 13; r += 3) circ(c, 26, 26, r, null, '#c8c8c8', 0.4);
      circ(c, 36, 36, 1.4, act ? '#e53935' : '#666');
      if (S.sim && act) txt(c, 'pohyb', 26, 47.5, 2.6, '#c62828', 'center', true);
    } else if (['thermo', 'dusk', 'clock'].includes(ES.getDef(g.items[0].type).deco)) {
      const deco = ES.getDef(g.items[0].type).deco, act = !!S.act;
      circ(c, 26, 26, 14, shade(base, 0.25), INK, 0.45);
      if (deco === 'thermo') { circ(c, 26, 26, 10, (S.col && S.col.h) || shade(base, -0.05), INK, 0.4); c.save(); c.translate(26, 26); c.rotate(-0.6); box(c, -1, -10, 2, 6, 0.8, INK, 0.2); c.restore(); txt(c, act ? 'topí' : '21 °C', 26, 29, 3, act ? '#c62828' : ink, 'center', true); }
      if (deco === 'dusk') { if (act) { c.beginPath(); c.arc(26, 26, 7, 0.5, Math.PI * 2 - 0.5); c.quadraticCurveTo(22, 26, 26 + 7 * Math.cos(0.5), 26 + 7 * Math.sin(0.5)); c.fillStyle = '#3d4a7a'; c.fill(); } else { circ(c, 26, 26, 5, '#ffc93c'); c.strokeStyle = '#e0a800'; c.lineWidth = 0.7; for (let k = 0; k < 8; k++) { const q = k * Math.PI / 4; c.beginPath(); c.moveTo(26 + Math.cos(q) * 7, 26 + Math.sin(q) * 7); c.lineTo(26 + Math.cos(q) * 9.5, 26 + Math.sin(q) * 9.5); c.stroke(); } } txt(c, act ? 'noc' : 'den', 26, 43, 2.6, ink, 'center', true); }
      if (deco === 'clock') {
        const on = pnumR(it.t[5], 10), off = pnumR(it.t[6], 10), per = on + off, ph = S.sim ? (S.sim.t % per) / per : 0;
        c.beginPath(); c.moveTo(26, 26); c.arc(26, 26, 12, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * on / per); c.closePath(); c.fillStyle = 'rgba(67,160,71,.35)'; c.fill();
        c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(26, 26); c.lineTo(26 + Math.cos(-Math.PI / 2 + ph * 2 * Math.PI) * 11, 26 + Math.sin(-Math.PI / 2 + ph * 2 * Math.PI) * 11); c.stroke();
        circ(c, 26, 26, 1.2, INK); txt(c, on + '/' + off + ' s', 26, 45, 2.4, ink, 'center', true); if (act) circ(c, 40, 12, 1.5, '#43a047');
      }
    } else if (ty === 'hsw' && d.bits === 2) {
      const m = S.mask | 0; rocker(10, 10, 15.5, 32, m & 1); rocker(26.5, 10, 15.5, 32, m & 2);
    } else {
      const on = ty === 'hsw' ? !!(S.mask & 1) : !!S.act; rocker(10, 10, 32, 32, on);
      const d0 = ES.getDef(g.items[0].type);
      if (d0.click === 'momentary') { circ(c, 26, 26, 4, null, shade(key, -0.5), 0.6); c.beginPath(); c.arc(26, 25, 2.2, Math.PI, 0); c.lineTo(28.2, 27); c.lineTo(23.8, 27); c.closePath(); c.fillStyle = shade(key, -0.5); c.fill(); }
    }
    const deco0 = ES.getDef(g.items[0].type).deco;
    const tag = ty === 'socket' ? '' : deco0 === 'thermo' ? 'termostat' : deco0 === 'dusk' ? 'soumrak' : deco0 === 'clock' ? 'hodiny' : ty === 'pir' ? 'PIR' : ty === 'hsw' ? 'č. ' + d.v : (ES.getDef(g.items[0].type).click === 'momentary' ? 'č. 1/0' : g.items.length > 1 ? '' : (ES.getDef(g.items[0].type).poles.length > 1 ? 'č. 2' : 'č. 1'));
    if (g.name) txt(c, g.name, 4, 5, 2.6, ink, 'left', true);
    if (tag) txt(c, tag, 48, 5, 2.4, ink, 'right');
    box(c, 6, 52, 40, 11, 1.5, shade(base, -0.12), 0.35);
    for (const t of L.T) txt(c, t.lab, t.x, t.y - 4.4, 2.2, inkOn(shade(base, -0.12)), 'center', true);
  } else if (ty === 'socket3' || ty === 'load3') {
    const M = S.meas || {};
    if (ty === 'socket3') {
      body(0, 0, w, 62, 5); c.shadowColor = 'transparent';
      circ(c, w / 2, 30, 24, shade(base, -0.06), INK, 0.45); circ(c, w / 2, 30, 20, (S.col && S.col.h) || shade(base, 0.15), INK, 0.4);
      for (let i = 0; i < 5; i++) { const q = -Math.PI / 2 + (i - 2) * 0.62 + Math.PI; circ(c, w / 2 + Math.cos(q) * 12.5, 30 + Math.sin(q) * 12.5, i === 4 ? 2.6 : 2, '#222'); }
      txt(c, d.amp + ' A  400 V  6h', w / 2, 56, 2.4, ink, 'center', true);
      if (S.plug) { circ(c, w / 2, 30, 17, '#2d2d2d', INK, 0.4); box(c, w / 2 - 4, 44, 8, 18, 2, '#2d2d2d', 0.3); txt(c, (it.t[9] || 3000) + ' W', w / 2, 30, 3, '#fff', 'center', true); }
      if (g.name) txt(c, g.name, 4, 5, 2.6, ink, 'left', true);
    } else {
      body(0, 0, w, 64, 4); c.shadowColor = 'transparent';
      box(c, 4, 4, w - 8, 52, 3, '#1f1f22', 0.4);
      const hot = S.sim && S.plug && (M.live === 3);
      [[30, 20, 9], [66, 20, 7], [30, 42, 7], [66, 42, 9]].forEach(([x, y, r]) => { circ(c, x, y, r, hot ? '#d84315' : '#3a3a3e', '#555', 0.5); if (hot) { c.shadowColor = '#ff6d00'; c.shadowBlur = 12; circ(c, x, y, r * 0.6, '#ff8a50'); c.shadowBlur = 0; c.shadowColor = 'transparent'; } });
      txt(c, (g.name || '') + '  ' + (it.t[9] || 7000) + ' W', w / 2, 60, 2.6, ink, 'center', true);
    }
    box(c, ty === 'socket3' ? 6 : 20, h - 13, ty === 'socket3' ? w - 12 : 56, 12, 1.5, shade(base, -0.12), 0.35);
    for (const t of L.T) txt(c, t.lab, t.x, t.y - 4.6, 2.1, inkOn(shade(base, -0.12)), 'center', true);
    if (S.sim && ty === 'socket3') txt(c, M.rot === 'R' ? '↻ pravotočivé' : M.rot === 'L' ? '↺ levotočivé!' : M.live ? 'chybí fáze' : 'bez napětí', w / 2, -3, 2.8, M.rot === 'R' ? '#2e7d32' : '#c62828', 'center', true);
  } else if (ty === 'emeter3') {
    body(0, 0, w, h, 2.5);
    box(c, 1, h - 16, w - 2, 15, 1.2, shade(base, -0.08), 0.3);
    box(c, 10, 10, w - 20, 18, 1.5, '#1c2a1d', 0.4);
    const M = S.meas || {};
    txt(c, S.sim ? (M.Wh || 0).toFixed(3).replace('.', ',') : '0,000', w - 26, 19.5, 6.5, S.sim ? '#7dff8a' : '#3d5a3f', 'right', true); txt(c, 'Wh', w - 14, 21, 2.6, '#7dff8a', 'right');
    txt(c, 'kWh  3×230/400 V  10(80) A', w / 2, 33, 2.6, ink);
    if (S.sim) { txt(c, Math.round(M.P || 0) + ' W', w / 2, 42, 4, '#0a66e8', 'center', true); txt(c, 'L1 ' + fmtA((M.I || [])[0]) + '  L2 ' + fmtA((M.I || [])[1]) + '  L3 ' + fmtA((M.I || [])[2]), w / 2, 49, 2.4, ink); }
    nameplate(c, g.name, w / 2, 60, 16, base);
    for (const t of L.T) txt(c, t.lab, t.x, t.y - 6, 2.5, inkOn(shade(base, -0.08)), 'center', true);
    ['L1', 'L2', 'L3', 'N'].forEach((n, i) => txt(c, n, 18 + 24 * i, h - 22, 2.2, ink, 'center', true));
  } else if (ty === 'heater') {
    body(4, 0, w - 8, 76, 14); c.shadowColor = 'transparent';
    const on = !!S.on; box(c, w / 2 - 9, 26, 18, 16, 2, shade(base, 0.25), 0.4);
    txt(c, on ? 'ohřev' : 'teplota OK', w / 2, 34, 2.4, on ? '#c62828' : ink, 'center', true); circ(c, w / 2, 48, 2, on ? '#ff7043' : '#5a3a30', '#111', 0.3);
    txt(c, (g.name || '') + '  ' + (it.t[9] || 2000) + ' W', w / 2, 66, 2.5, ink, 'center', true);
    box(c, 6, 78, w - 12, 13, 1.5, shade(base, -0.12), 0.35);
    for (const t of L.T) txt(c, t.lab, t.x, t.y - 4.6, 2.1, inkOn(shade(base, -0.12)), 'center', true);
  } else if (ty === 'fan') {
    body(1, 1, 50, 50, 6); c.shadowColor = 'transparent';
    circ(c, 26, 26, 19, shade(base, -0.1), INK, 0.4);
    const a = S.sim && S.on ? S.sim.t * 14 : 0;
    c.save(); c.translate(26, 26); c.rotate(a); for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.ellipse(9, 0, 8, 3.2, 0.3, 0, 7); c.fillStyle = (S.col && S.col.h) || '#888'; c.fill(); } c.restore();
    circ(c, 26, 26, 3, INK);
    if (g.name) txt(c, g.name, 4, 5, 2.6, ink, 'left', true);
    box(c, 6, 52, 40, 11, 1.5, shade(base, -0.12), 0.35);
    for (const t of L.T) txt(c, t.lab, t.x, t.y - 4.4, 2.1, inkOn(shade(base, -0.12)), 'center', true);
  } else if (ty === 'light') {
    box(c, 6, 0, 44, 12, 2, shade(base, -0.06), 0.4);
    c.shadowColor = 'transparent';
    c.strokeStyle = '#555'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(28, 12); c.lineTo(28, 22); c.stroke();
    const lvl = S.sim ? (S.lvl || 0) : 0, lit = lvl > 0.04, col = '#ffd45a';
    c.beginPath(); c.moveTo(10, 40); c.quadraticCurveTo(28, 14, 46, 40); c.closePath(); c.fillStyle = grad(c, 22, 40, base, 0.15, -0.15); c.fill(); c.lineWidth = 0.45; c.strokeStyle = INK; c.stroke();
    const g2 = c.createRadialGradient(28, 44, 1, 28, 44, 9);
    if (lit) { g2.addColorStop(0, '#fff'); g2.addColorStop(0.4, col); g2.addColorStop(1, shade(col, -0.2)); c.shadowColor = col; c.shadowBlur = 40 * lvl; c.globalAlpha = 0.5 + 0.5 * lvl; }
    else { g2.addColorStop(0, '#fbfbf6'); g2.addColorStop(1, '#cfcfc8'); }
    circ(c, 28, 45, 8, g2, lit ? null : '#888', 0.3); c.shadowBlur = 0; c.shadowColor = 'transparent'; c.globalAlpha = 1;
    txt(c, (g.name || '') + '  ' + (it.t[9] || 60) + ' W', 28, 58.5, 2.6, '#333', 'center', true);
    for (const t of L.T) txt(c, t.lab, t.x, t.y + 4.6, 2.2, inkOn(shade(base, -0.06)), 'center', true);
  } else if (ty === 'bell') {
    body(0, 0, w, 38, 3); c.shadowColor = 'transparent';
    c.beginPath(); c.arc(20, 22, 11, Math.PI, 0); c.lineTo(31, 26); c.lineTo(9, 26); c.closePath(); c.fillStyle = S.on ? '#ffd23f' : shade(base, -0.15); c.fill(); c.lineWidth = 0.45; c.strokeStyle = INK; c.stroke();
    circ(c, 20, 28, 2, INK);
    if (S.on && S.sim && Math.floor(S.sim.t * 8) % 2) { c.strokeStyle = '#e53935'; c.lineWidth = 0.7; for (const sx of [-1, 1]) { c.beginPath(); c.arc(20, 20, 15, sx < 0 ? Math.PI + 0.4 : -0.9, sx < 0 ? Math.PI + 0.9 : -0.4); c.stroke(); } }
    txt(c, g.name, 20, 34, 2.6, ink, 'center', true);
    box(c, 4, 38, 32, 11, 1.5, shade(base, -0.12), 0.35);
    for (const t of L.T) txt(c, t.lab, t.x + 6.5, t.y, 2.3, ink, 'center', true);
  } else if (ty === 'emeter') {
    body(0, 0, w, h, 2.5);
    box(c, 1, h - 16, w - 2, 15, 1.2, shade(base, -0.08), 0.3);
    box(c, 6, 10, w - 12, 18, 1.5, '#1c2a1d', 0.4);
    const M = S.meas || {};
    txt(c, S.sim ? (M.Wh || 0).toFixed(3).replace('.', ',') : '0,000', w - 18, 19.5, 6.5, S.sim ? '#7dff8a' : '#3d5a3f', 'right', true);
    txt(c, 'Wh', w - 9, 21, 2.6, '#7dff8a', 'right');
    txt(c, 'kWh  1f  230 V  5(60) A', w / 2, 33, 2.6, ink);
    if (S.sim) txt(c, Math.round(M.P || 0) + ' W', w / 2, 42, 4, '#0a66e8', 'center', true);
    circ(c, w / 2 - 14, 52, 1.6, S.sim && M.P > 1 && Math.floor(S.sim.t * Math.max(1, M.P / 200)) % 2 ? '#ff3b30' : '#5a2a2a', '#111', 0.3); txt(c, 'imp/kWh', w / 2 - 10, 52, 2.2, ink, 'left');
    nameplate(c, g.name, w / 2, 63, 16, base);
    for (const t of L.T) txt(c, t.lab, t.x, t.y - 6, 2.7, inkOn(shade(base, -0.08)), 'center', true);
    txt(c, 'L in', 21.5, h - 22, 2.1, ink); txt(c, 'N', 51.5, h - 22, 2.1, ink);
  } else if (ty === 'clamp') {
    body(0, 0, w, h, 2); c.shadowColor = 'transparent';
    for (let i = 0; i < d.terms.length; i++) box(c, 3 + 7 * i, 10, 6, 8, 1, (S.col && S.col.h) || '#f28c28', 0.35);
    txt(c, g.name, w / 2, -2.5, 2.4, '#333', 'center', true);
  } else if (ty === 'motor3' || ty === 'motorYD' || ty === 'motor1') {
    const m = (S.sim && S.m) || { ang: 0, rpm: 0 };
    // patky, tělo s žebry, ložiskové štíty, hřídel
    c.shadowColor = 'transparent';
    box(c, 22, h - 6, 22, 5, 1, shade(base, -0.25), 0.4); box(c, 78, h - 6, 22, 5, 1, shade(base, -0.25), 0.4);
    c.shadowColor = 'rgba(0,0,0,.28)';
    body(14, 26, 96, 52, 7);
    c.strokeStyle = shade(base, -0.3); c.lineWidth = 0.5;
    for (let x = 24; x < 102; x += 5) { c.beginPath(); c.moveTo(x, 29); c.lineTo(x, 75); c.stroke(); }
    box(c, 6, 31, 10, 42, 3, shade(base, -0.12), 0.45);
    box(c, 108, 33, 8, 38, 2.5, shade(base, -0.12), 0.45);
    box(c, 116, 49.5, 9, 5, 0.8, METAL, 0.35);
    // čelní pohled na spojku – ukazuje otáčení
    const cx = 130, cy = 52, R = 11;
    circ(c, cx, cy, R, '#d6d8dc', INK, 0.5);
    c.save(); c.translate(cx, cy); c.rotate(m.ang || 0);
    for (let i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); c.fillStyle = '#4a4a4a'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -3, 9.5, -1.5); c.lineTo(9.5, 2); c.closePath(); c.fill(); }
    circ(c, 9, 0, 1.4, '#e53935'); c.restore(); circ(c, cx, cy, 2.2, METAL, INK, 0.3);
    // svorkovnice
    body(28, 0, 56, 27, 2.5);
    box(c, 30, 2, 52, 23, 1.5, shade(base, -0.1), 0.3);
    if (ty === 'motorYD') { c.strokeStyle = '#999'; c.lineWidth = 0.3; }
    for (const t of L.T) txt(c, t.lab, t.x + (t.lab === 'PE' ? 0 : 0), t.y + (t.y > 15 ? 5.2 : 5.2), 2.3, inkOn(shade(base, -0.1)), 'center', true);
    box(c, 40, 40, 44, 16, 1, '#e8e8e8', 0.3);
    const P = parseFloat(String(it.t[9] || '').replace(',', '.')) || (ty === 'motor1' ? 0.75 : ty === 'motorYD' ? 7.5 : 4);
    txt(c, (ty === 'motor1' ? '1~ 230 V' : ty === 'motorYD' ? '3~ 400 V Δ' : '3~ 400 V'), 62, 44.5, 2.6, INK, 'center', true);
    txt(c, String(P).replace('.', ',') + ' kW  1450 min⁻¹', 62, 49, 2.4, INK);
    txt(c, g.name, 62, 53.3, 2.6, INK, 'center', true);
    if (S.sim) {
      const rpm = Math.round(Math.abs(m.rpm || 0));
      txt(c, (m.dir > 0 ? '↻ ' : m.dir < 0 ? '↺ ' : '') + rpm + ' ot/min', 62, 66, 3.6, rpm ? '#0a66e8' : '#666', 'center', true);
      if (m.mode) txt(c, m.mode === 'Y' ? 'hvězda' : m.mode === 'D' ? 'trojúhelník' : '', 62, 71.5, 2.6, ink);
      if (m.fault) txt(c, 'chybí fáze!', 62, 71.5, 3, '#c62828', 'center', true);
    }
  } else if (ty === 'meter') {
    body(0, 0, w, 48, 2.5);
    box(c, 3, 3, w - 6, 42, 1.5, shade(base, 0.2), 0.3);
    box(c, 7, 9, w - 14, 17, 1.2, '#1c2a1d', 0.4);
    const M = S.meas || {}, isV = d.sub === 'V';
    let v = '0';
    if (S.sim) v = isV ? (M.V >= 100 ? String(Math.round(M.V)) : (M.V || 0).toFixed(1).replace('.', ',')) : (M.I >= 10 ? M.I.toFixed(1) : (M.I || 0).toFixed(2)).replace('.', ',');
    txt(c, S.sim ? v : '- - -', w - 10, 17.8, 7, S.sim ? '#7dff8a' : '#3d5a3f', 'right', true);
    txt(c, isV ? 'V' : 'A', w / 2, 32, 5, ink, 'center', true); txt(c, isV ? (M.dc ? 'DC' : 'AC') : 'AC', w / 2, 38, 2.4, ink);
    nameplate(c, g.name, w / 2, 42.5, 14, base);
    box(c, 8, 47, w - 16, 10, 1, shade(base, -0.12), 0.35);
    for (const t of L.T) txt(c, t.lab, t.x + 6.5, t.y, 2.5, INK, 'center', true);
  } else if (ty === 'trafo') {
    body(0, 0, w, h, 2.5);
    box(c, 1, 1, w - 2, 13, 1.2, shade(base, -0.08), 0.3); box(c, 1, h - 14, w - 2, 13, 1.2, shade(base, -0.08), 0.3);
    box(c, 6, 17, w - 12, h - 34, 1.5, '#55585e', 0.4);
    c.strokeStyle = '#6c7078'; c.lineWidth = 0.3; for (let y = 19; y < h - 18; y += 1.6) { c.beginPath(); c.moveTo(7, y); c.lineTo(w - 7, y); c.stroke(); }
    box(c, 13, 20, w - 26, h - 40, 3, shade(base, -0.02), 0.4);
    const M = S.meas || {};
    txt(c, (it.t[6] || '230') + ' / ' + (it.t[7] || '24') + ' V', w / 2, h / 2 - 3, 3, ink, 'center', true);
    txt(c, g.name, w / 2, h / 2 + 2, 2.8, ink, 'center', true);
    if (S.sim) txt(c, (M.Us || 0).toFixed(1).replace('.', ',') + ' V', w / 2, h / 2 + 7, 2.8, M.Us > 1 ? '#0a66e8' : '#777', 'center', true);
    termLabels(c, g, inkOn(shade(base, -0.08)));
  } else {
    body(0, 0, w, h, 2); txt(c, g.name || d.name, w / 2, h / 2 - 3, 3, ink);
  }
  c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
  for (const t of L.T) screw(c, t.x, t.y);
  c.restore();
}

// stav přístroje ze simulace (pro kreslení)
function stateOf(g, sim, col) {
  const S = { col };
  if (!sim) return S;
  const m = g.main, u = m.uid, key = ES.keyOf(m); S.sim = sim;
  switch (g.type) {
    case 'contactor': case 'relay': S.act = !!sim.coil[key]; S.left = sim.meas[u] && sim.meas[u].left; break;
    case 'aux': { const c = sim.byUid && sim.byUid.get(u); S.act = c ? ES.isActuated(sim, c) : false; break; }
    case 'timer': { const coil = g.items.find(i => ES.getDef(i.type).kind === 'load'); S.on = !!(coil && sim.on[coil.uid]); S.tm = sim.timers[key]; break; }
    case 'thermal': S.trip = !!sim.trip[key]; S.meas = sim.meas[u]; break;
    case 'breaker': case 'rcd': case 'mswitch': case 'mstarter': S.on = !!sim.brk[u]; S.meas = sim.meas[u]; break;
    case 'fuse': S.blown = !!sim.blown[u]; break;
    case 'button': case 'rocker': case 'pir': S.act = !!sim.man[key]; break;
    case 'hsw': S.mask = sim.sw[u] | 0; break;
    case 'socket': case 'socket3': case 'load3': S.plug = !!sim.plug[u]; S.meas = sim.meas[u]; break;
    case 'emeter3': S.meas = sim.meas[u]; break;
    case 'heater': case 'fan': S.on = !!sim.on[u]; break;
    case 'light': case 'bell': S.on = !!sim.on[u]; S.lvl = sim.lvl[u] || 0; break;
    case 'emeter': S.meas = sim.meas[u]; break;
    case 'lamp': case 'blink': case 'horn': case 'valve': S.on = !!sim.on[u]; S.lvl = sim.lvl[u] || 0; break;
    case 'motor3': case 'motorYD': case 'motor1': S.m = sim.motor[u]; break;
    case 'meter': case 'trafo': S.meas = sim.meas[u]; break;
  }
  return S;
}

// lišta DIN za modulárními přístroji
function drawRails(c, devs) {
  for (const g of devs) if (DIN.has(g.type)) {
    const y = g.y + g.h / 2 - 17.5;
    const gr = c.createLinearGradient(0, y, 0, y + 35); gr.addColorStop(0, '#e9ebee'); gr.addColorStop(0.15, '#b9bdc4'); gr.addColorStop(0.85, '#b9bdc4'); gr.addColorStop(1, '#8d929a');
    c.fillStyle = gr; c.fillRect(g.x - 4, y, g.w + 8, 35);
    c.fillStyle = '#7e838b'; for (let x = g.x - 2; x < g.x + g.w + 2; x += 25) { rr(c, x, y + 15, 12, 5, 2.5); c.fill(); }
  }
}

function drawScene(c, doc, sc, opt) {
  const r = doc.real, sim = opt.sim;
  drawRails(c, sc.devs);
  for (const g of sc.devs) {
    drawDevice(c, g, stateOf(g, sim, r.col[g.uid]));
    if (opt.sel && opt.sel.has(g.uid)) { c.strokeStyle = '#0a66e8'; c.lineWidth = 0.9; c.setLineDash([2, 1.4]); rr(c, g.x - 2, g.y - 2, g.w + 4, g.h + 4, 3); c.stroke(); c.setLineDash([]); }
  }
  const RT = opt.fast ? null : routes(doc, sc);
  r.wires.forEach((w, i) => {
    const A = sc.T.get(w.a[0] + ':' + w.a[1]), B = sc.T.get(w.b[0] + ':' + w.b[1]); if (!A || !B) return;
    let live = false;
    if (sim && opt.showLive) { const net = sim.nets.ofKey.get(A.key); live = net !== undefined && !!sim.netPot[net]; }
    const pts = (RT && RT[i]) || wirePts(A, B, w.p);
    if (opt.wbad && opt.wbad.has(i)) { c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(229,57,53,.55)'; c.lineWidth = 5; c.setLineDash([3, 2]); strokePath(c, pts); c.setLineDash([]); }
    drawWire(c, pts, w.c || '#1b1b1b', opt.wsel === i, live);
  });
}

// ---------------------------------------------------------------- statický potenciál (barvy vodičů)
function staticPot(doc, nets) {
  const n = nets.count, par = Int32Array.from({ length: n }, (_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const comps = [];
  for (const it of doc.items) { const d = ES.getDef(it.type); if (!d.terms || !d.terms.length) continue; comps.push([it, d, ES.termsOf(it).map(([x, y]) => nets.ofKey.get(x + ',' + y))]); }
  for (const [, d, tn] of comps) for (const p of d.poles || []) { const a = find(tn[p.a]), b = find(tn[p.b]); if (a !== b) par[a] = b; }
  const bits = new Int32Array(n);
  for (const [, d, tn] of comps) {
    if (d.kind === 'supply') d.pots.forEach((p, i) => { bits[find(tn[i])] |= ES.POT[p]; });
    if (d.kind === 'trafo') { bits[find(tn[2])] |= 256; bits[find(tn[3])] |= 512; }
  }
  return i => bits[find(i)];
}
function colorFor(b) {
  if (b & 16) return 'gnye';
  if (b & 8) return '#2f80ed';
  if (b & 512) return '#2f80ed';
  if (b & 64) return '#1f3a93';
  if (b & 1) return '#7a4a22';
  if (b & 2) return '#1b1b1b';
  if (b & 4) return '#8d8d8d';
  if (b & 32) return '#d62828';
  if (b & 256) return '#d62828';
  return '#1b1b1b';
}

// Zapojení reality podle schématu: každá síť schématu = řetěz vodičů mezi svorkami
function wiresFromSchema(doc) {
  const sc = scene(doc), nets = ES.buildNets(doc), pot = staticPot(doc, nets), by = new Map();
  for (const it of doc.items) {
    if (!isReal(it)) continue;
    ES.termsOf(it).forEach(([x, y], ti) => { const n = nets.ofKey.get(x + ',' + y), t = sc.T.get(it.uid + ':' + ti); if (n === undefined || !t) return; if (!by.has(n)) by.set(n, []); by.get(n).push(t); });
  }
  const wires = [];
  for (const [n, ts] of by) {
    if (ts.length < 2) continue;
    const col = colorFor(pot(n)), left = ts.slice().sort((a, b) => a.y - b.y || a.x - b.x);
    let cur = left.shift();
    while (left.length) { // řetěz od nejbližší svorky k nejbližší
      let bi = 0, bd = Infinity; left.forEach((t, i) => { const dd = Math.hypot(t.x - cur.x, t.y - cur.y); if (dd < bd) { bd = dd; bi = i; } });
      const nx = left.splice(bi, 1)[0]; wires.push({ a: [cur.it.uid, cur.ti], b: [nx.it.uid, nx.ti], c: col, p: [] }); cur = nx;
    }
  }
  return wires;
}

// ---------------------------------------------------------------- porovnání zapojení
function compare(doc) {
  const sn = ES.buildNets(doc), rn = ES.buildRealNets(doc), sc = scene(doc), ts = [];
  for (const it of doc.items) if (isReal(it)) ES.termsOf(it).forEach(([x, y], ti) => { const t = sc.T.get(it.uid + ':' + ti); if (t) ts.push({ t, s: sn.ofKey.get(x + ',' + y), r: rn.ofKey.get(it.uid + ':' + ti) }); });
  const diff = (ka, kb) => {
    const out = [], by = new Map();
    for (const x of ts) { if (!by.has(x[ka])) by.set(x[ka], new Map()); const m = by.get(x[ka]); if (!m.has(x[kb])) m.set(x[kb], []); m.get(x[kb]).push(x.t); }
    for (const m of by.values()) if (m.size > 1) { const reps = [...m.values()].map(a => a[0]); for (let i = 1; i < reps.length; i++) out.push([reps[0], reps[i]]); }
    return out;
  };
  return { missing: diff('s', 'r'), extra: diff('r', 's') };
}

// ---------------------------------------------------------------- umístění nových prvků do schématu
function schemaBox(it) {
  const d = ES.getDef(it.type), n = it.n;
  if (ES.WIRE.has(it.type) || d.kind === 'gfx') return [Math.min(n[8], n[10]), Math.min(n[9], n[11]), Math.max(n[8], n[10]), Math.max(n[9], n[11])];
  if (d.kind === 'text') return [n[8], n[9], n[8] + Math.max(6, (it.extra || '').length * 2.2), n[9] + 4];
  if (d.kind === 'node') return [n[8], n[9], n[8], n[9]];
  const b = ES.bboxOf(it); return [n[8] + b[0], n[9] + b[1], n[8] + b[2], n[9] + b[3]];
}
function placeInSchema(doc, items) {
  const boxes = doc.items.map(schemaBox), rel = items.map(it => ES.bboxOf(it)), gap = 9;
  const total = rel.reduce((s, b) => s + b[2] - b[0], 0) + gap * (items.length - 1);
  const maxY = boxes.length ? Math.max(...boxes.map(b => b[3])) : 0, maxX = Math.max(390, ...boxes.map(b => b[2]));
  const fits = (x, y) => { let cx = x; for (const b of rel) { const q = [cx, y, cx + b[2] - b[0], y + b[3] - b[1]]; if (boxes.some(o => !(q[2] + 6 < o[0] || q[0] - 6 > o[2] || q[3] + 6 < o[1] || q[1] - 6 > o[3]))) return false; cx += b[2] - b[0] + gap; } return true; };
  let at = null;
  search: for (let y = 12; y <= maxY + 30; y += 6) for (let x = 12; x + total <= maxX; x += 6) if (fits(x, y)) { at = [x, y]; break search; }
  if (!at) at = [12, Math.ceil((maxY + 18) / 6) * 6];
  let cx = at[0];
  items.forEach((it, i) => { const b = rel[i]; it.n[8] = cx - b[0]; it.n[9] = at[1] - b[1]; cx += b[2] - b[0] + gap; });
}

// ---------------------------------------------------------------- překreslení schématu podle reality
// Vodiče schématu se nahradí: každá síť reality = strom kolmých vodičů (hledání cesty A*),
// který nesmí vést přes cizí svorky, souběžně s cizím vodičem ani se na něm lomit.
const ROUTED = new Set([4000, 4009, 4010]);
function schemaFromReal(doc) {
  doc.items = doc.items.filter(it => !(ROUTED.has(it.type) || it.type === ES.NODE));
  const rn = ES.buildRealNets(doc);
  // barva -> typ vodiče
  const colOf = new Map();
  for (const w of doc.real.wires) { const n = 'r' + rn.ofKey.get(w.a[0] + ':' + w.a[1]); if (!colOf.has(n)) colOf.set(n, {}); const m = colOf.get(n); m[w.c] = (m[w.c] || 0) + 1; }
  const typeOf = n => { const m = colOf.get(n) || {}; const top = Object.keys(m).sort((a, b) => m[b] - m[a])[0]; return top === 'gnye' ? 4010 : top === '#2f80ed' ? 4009 : 4000; };
  const res = routeSchema(doc, it => isReal(it) ? (ti => 'r' + rn.ofKey.get(it.uid + ':' + ti)) : null, typeOf);
  const cmp = compare(doc);
  return { wires: res.wires, failed: res.failed, conflicts: res.conflicts, missing: cmp.missing, extra: cmp.extra };
}

// Přetrasuje všechny vodiče schématu (L, N, PE) tak, aby se vodiče různých sítí nepřekrývaly
// a nevedly přes cizí svorky. Spojení zůstanou zachována; join = další spojení [bodA, bodB, typ]
// (bod = [x, y] svorky nebo bodu na vodiči). Vodiče nevedoucí k žádné svorce zaniknou.
function rerouteSchema(doc, join) {
  const sn = ES.buildNets(doc), par = new Map();
  const find = a => { while (par.has(a) && par.get(a) !== a) a = par.get(a); return a; };
  const netAt = p => { let n = sn.ofKey.get(p[0] + ',' + p[1]); if (n !== undefined) return n;
    for (const it of doc.items) if (ROUTED.has(it.type) && ES.onSeg(p[0], p[1], [it.n[8], it.n[9], it.n[10], it.n[11]])) return sn.ofKey.get(it.n[8] + ',' + it.n[9]);
    return undefined; };
  const types = new Map(), forced = new Map();
  for (const it of doc.items) if (ROUTED.has(it.type)) { const n = sn.ofKey.get(it.n[8] + ',' + it.n[9]); if (!types.has(n)) types.set(n, {}); const m = types.get(n); m[it.type] = (m[it.type] || 0) + Math.abs(it.n[10] - it.n[8]) + Math.abs(it.n[11] - it.n[9]); }
  for (const [a, b, t] of join || []) {
    const na = netAt(a), nb = netAt(b); if (na === undefined || nb === undefined) continue;
    const ra = find(na), rb = find(nb); if (ra !== rb) par.set(ra, rb);
    if (t) forced.set(rb, t);
  }
  const typeOf = key => {
    const r = +key.slice(1);
    for (const [k, t] of forced) if (find(k) === r) return t;
    const m = {}; for (const [n, tm] of types) if (find(n) === r) for (const t in tm) m[t] = (m[t] || 0) + tm[t];
    const top = Object.keys(m).sort((a, b) => m[b] - m[a])[0]; return top ? +top : 4000;
  };
  doc.items = doc.items.filter(it => !(ROUTED.has(it.type) || it.type === ES.NODE));
  return routeSchema(doc, it => ti => { const p = ES.termsOf(it)[ti], n = sn.ofKey.get(p[0] + ',' + p[1]); return n === undefined ? null : 's' + find(n); }, typeOf);
}

// Jádro trasování: netFn(it) -> (ti -> klíč sítě | null) nebo null; typeOf(klíč) -> typ vodiče.
function routeSchema(doc, netFn, typeOf) {
  const G = 3, K = (x, y) => x + ',' + y;
  const comps = doc.items.filter(it => { const d = ES.getDef(it.type); return d.terms && d.terms.length; });
  const occ = new Map(), nets = new Map(); let conflicts = 0;
  const mark = (x, y, n, hard, hz, vt) => { const k = K(x, y); let o = occ.get(k); if (!o) occ.set(k, o = { n, hard: false, h: false, v: false }); o.hard = o.hard || hard; o.h = o.h || hz; o.v = o.v || vt; return o; };
  for (const it of comps) {
    const f = netFn(it);
    ES.termsOf(it).forEach(([x, y], ti) => {
      const nn = f && f(ti), n = nn || 'x' + it.uid + ':' + ti, o = occ.get(K(x, y));
      if (o && o.n !== n) conflicts++; else mark(x, y, n, true, false, false);
      if (nn) { if (!nets.has(n)) nets.set(n, []); const a = nets.get(n); if (!a.some(p => p[0] === x && p[1] === y)) a.push([x, y]); }
    });
  }
  for (const it of doc.items) if (ES.WIRE.has(it.type)) { // ponechané spojnice GRAFCET
    const [x1, y1, x2, y2] = [it.n[8], it.n[9], it.n[10], it.n[11]];
    if (x1 !== x2 && y1 !== y2) continue;
    const st = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / G));
    for (let i = 0; i <= st; i++) mark(Math.round((x1 + (x2 - x1) * i / st) / G) * G, Math.round((y1 + (y2 - y1) * i / st) / G) * G, 'g', true, true, true);
  }
  const body = new Set(); let bb = null;
  for (const it of doc.items) {
    const b = schemaBox(it); bb = bb ? [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])] : b.slice();
    if (!ES.getDef(it.type).terms || ES.WIRE.has(it.type)) continue;
    for (let x = Math.ceil(b[0] / G) * G; x <= b[2]; x += G) for (let y = Math.ceil(b[1] / G) * G; y <= b[3]; y += G) body.add(K(x, y));
  }
  if (!bb) return { wires: 0, failed: 0, conflicts, missing: [], extra: [] };
  const X0 = Math.floor(bb[0] / G) * G - 30, Y0 = Math.floor(bb[1] / G) * G - 30, X1 = bb[2] + 30, Y1 = bb[3] + 30;
  const edges = [];
  for (const [n, pts] of nets) {
    if (pts.length < 2) continue;
    const inT = [0], rest = pts.map((_, i) => i).slice(1);
    while (rest.length) {
      let best = null;
      for (const i of inT) for (const j of rest) { const dd = Math.abs(pts[i][0] - pts[j][0]) + Math.abs(pts[i][1] - pts[j][1]); if (!best || dd < best[2]) best = [i, j, dd]; }
      edges.push({ n, a: pts[best[0]], b: pts[best[1]], len: best[2] }); inT.push(best[1]); rest.splice(rest.indexOf(best[1]), 1);
    }
  }
  edges.sort((p, q) => p.len - q.len);
  const DX = [G, 0, -G, 0], DY = [0, G, 0, -G];
  function astar(s, t, n) {
    const heap = [], push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const hfun = (x, y) => (Math.abs(x - t[0]) + Math.abs(y - t[1])) / G;
    const best = new Map(), prev = new Map(); let steps = 0;
    push([hfun(s[0], s[1]), 0, s[0], s[1], -1]); best.set(K(s[0], s[1]) + ',-1', 0);
    while (heap.length && steps++ < 120000) {
      const [, g, x, y, dir] = pop(), sk = K(x, y) + ',' + dir;
      if (g > best.get(sk)) continue;
      if (x === t[0] && y === t[1]) { const path = [[x, y]]; let k = sk; while (prev.has(k)) { k = prev.get(k); const p = k.split(','); path.push([+p[0], +p[1]]); } return path.reverse(); }
      const o = occ.get(K(x, y)), foreign = o && o.n !== n && !(x === s[0] && y === s[1]);
      for (let d = 0; d < 4; d++) {
        if (dir >= 0 && d === (dir + 2) % 4) continue;
        if (foreign && d !== dir) continue;
        const nx = x + DX[d], ny = y + DY[d]; if (nx < X0 || nx > X1 || ny < Y0 || ny > Y1) continue;
        const q = occ.get(K(nx, ny)), isT = nx === t[0] && ny === t[1];
        let cost = 1;
        if (q && q.n !== n && !isT) { if (q.hard || ((d & 1) === 0 ? q.h : q.v)) continue; cost += 2; } else if (q && !isT && ((d & 1) === 0 ? q.h : q.v)) cost += 0.5;
        if (body.has(K(nx, ny)) && !isT) cost += 6;
        if (dir >= 0 && d !== dir) cost += 3;
        const ng = g + cost, nk = K(nx, ny) + ',' + d;
        if (best.has(nk) && best.get(nk) <= ng) continue;
        best.set(nk, ng); prev.set(nk, sk); push([ng + hfun(nx, ny), ng, nx, ny, d]);
      }
    }
    return null;
  }
  let failed = 0, count = 0;
  const addSeg = (a, b, type) => { if (a[0] === b[0] && a[1] === b[1]) return; const w = ES.newItem(type, a[0], a[1]); w.n[10] = b[0]; w.n[11] = b[1]; doc.items.push(w); count++; };
  for (const e of edges) {
    let path = astar(e.a, e.b, e.n);
    if (!path) { failed++; path = [e.a, [e.b[0], e.a[1]], e.b]; }
    const cor = [path[0]];
    for (let i = 1; i < path.length - 1; i++) { const a = path[i - 1], b = path[i], c2 = path[i + 1]; if ((b[0] - a[0]) * (c2[1] - b[1]) !== (b[1] - a[1]) * (c2[0] - b[0])) cor.push(b); }
    cor.push(path[path.length - 1]);
    const type = typeOf(e.n);
    for (let i = 1; i < cor.length; i++) {
      const a = cor[i - 1], b = cor[i], hz = a[1] === b[1]; addSeg(a, b, type);
      const st = Math.round((Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1])) / G);
      for (let k = 1; k < st; k++) mark(a[0] + Math.sign(b[0] - a[0]) * G * k, a[1] + Math.sign(b[1] - a[1]) * G * k, e.n, false, hz, !hz);
    }
    for (const p of cor) mark(p[0], p[1], e.n, true, false, false);
  }
  return { wires: count, failed, conflicts };
}

// ---------------------------------------------------------------- paleta (sestavy prvků)
const PRESETS = [
  ['Napájení', [['Síť 3×400/230 V (L1 L2 L3 N PE)', [3007]], ['Síť 230 V (L N PE)', [3008]], ['Zdroj 24 V DC', [3009]], ['Transformátor 230/24 V', [20003]]]],
  ['Jištění', [['Jistič 1P', [6010]], ['Jistič 2P', [6008]], ['Jistič 3P', [6009]], ['Pojistkový odpojovač 1P', [5008]], ['Pojistkový odpojovač 3P', [5001]],
    ['Proudový chránič 2P', [20005]], ['Proudový chránič 4P', [20006]], ['Motorový spouštěč', [20004]], ['Tepelné relé (95-96, 97-98)', [6007, 8018]], ['Vypínač 3P', [2004]]]],
  ['Stykače a relé', [['Stykač 3P + 1 NO', [2001, 9000, 7000]], ['Stykač 3P + NO + NC', [2001, 9000, 7000, 7001]], ['Pomocné relé NO + NC', [9000, 7000, 7001]],
    ['Časové relé – zpožděný přítah', [9004, 7004]], ['Časové relé – zpožděný odpad', [9005, 7008]],
    ['Pomocný kontakt NO (položte na stykač)', [7000]], ['Pomocný kontakt NC (položte na stykač)', [7001]]]],
  ['Ovládání', [['Tlačítko NO', [8000]], ['Tlačítko NC', [8001]], ['Tlačítko NO + NC', [8000, 8001]], ['Hřibové tlačítko NC (aretace)', [8005]],
    ['Přepínač 0-1', [8008]], ['Koncový spínač NO', [8012]], ['Koncový spínač NC', [8013]]]],
  ['Signalizace a akční členy', [['Signálka', [9008]], ['Blikající signálka', [9009]], ['Houkačka', [9010]], ['Elektromagnetický ventil', [9003]]]],
  ['Motory', [['Třífázový motor', [1000]], ['Motor Y/Δ (6 svorek)', [1001]], ['Jednofázový motor', [1002]]]],
  ['Měření', [['Voltmetr', [20001]], ['Ampérmetr', [20002]]]],
  // ---- domovní instalace
  ['Rozvodnice', [['Přípojka 230 V (L N PE)', [3008]], ['Přípojka 3×400/230 V', [3007]], ['Elektroměr 1f', [20116]], ['Elektroměr 3f', [20130]], ['Jistič 1P (B10 světla / B16 zásuvky)', [6010]], ['Jistič 3P', [6009]], ['Hlavní vypínač 3P', [2004]],
    ['Proudový chránič 2P 30 mA', [20005]], ['Proudový chránič 4P 30 mA', [20006]]], 'home', 'ČSN 33 2000-4-41 · ČSN 33 2000-5-53'],
  ['Spínače', [['Spínač č. 1 (jednopólový)', [20101]], ['Spínač č. 2 (dvoupólový)', [20102]], ['Spínač č. 5 (sériový)', [20105]], ['Spínač č. 6 (střídavý / schodišťový)', [20106]],
    ['Spínač č. 7 (křížový)', [20107]], ['Tlačítko č. 1/0 (zvonkové, ovladač)', [20108]]], 'home', 'řazení dle ČSN EN 60669-1'],
  ['Zásuvky', [['Zásuvka 230 V s ochranným kolíkem', [20110]], ['Zásuvka 400 V 16 A (CEE, motorová)', [20131]], ['Zásuvka 400 V 32 A (CEE)', [20132]]], 'home', 'ČSN EN 60884-1 · ČSN 35 4516'],
  ['Svítidla a spotřebiče', [['Svítidlo', [20111]], ['Zvonek', [20112]], ['Sporák / varná deska 3f', [20133]], ['Ohřívač vody (bojler)', [20134]], ['Ventilátor', [20135]]], 'home', 'ČSN EN 60598 · ČSN EN 62080'],
  ['Ovládací přístroje', [['Impulsní relé', [20113, 7000]], ['Schodišťový automat', [20114, 7000]], ['Pohybové čidlo', [20115]], ['Časové relé – zpožděný přítah', [9004, 7004]], ['Časové relé – zpožděný odpad', [9005, 7008]],
    ['Instalační stykač 2P (bojler, HDO)', [2000, 9000]], ['Termostat', [20136]], ['Soumrakový spínač', [20137]], ['Spínací hodiny', [20138]]], 'home', 'ČSN EN 60669-2-1, -2-2, -2-3'],
  ['Spojování', [['Spojovací svorka 3×', [20117]], ['Spojovací svorka 5×', [20118]]], 'home', 'ČSN EN 60998'],
];
function presetDevice(types, name) {
  const items = types.map(t => { const it = ES.newItem(t, 0, 0); if (ES.getDef(t).pre !== undefined) it.t[0] = name || ''; return it; });
  const g = { key: 'tmp', fam: famOf(ES.getDef(types[0])), items }; finishDev(g); g.L = layout(g); g.w = g.L.w; g.h = g.L.h; g.x = 0; g.y = 0;
  return g;
}


// ---------------------------------------------------------------- barvy vodičů podle normy
// Funkce vodiče se určí z realistického zapojení: síť se „protáhne“ přes všechny póly
// (vypínače, jističe, kontakty – jako by byly sepnuté), takže i spínaný vodič za spínačem
// má barvu fáze, ze které je napájen. Podle zvolené normy se pak přiřadí barva.
const NORMS = {
  '60445': { name: 'ČSN EN IEC 60445 / ČSN 33 2000-5-51 (instalace)', short: 'ČSN EN IEC 60445' },
  '60204': { name: 'ČSN EN 60204-1 (stroje, rozvaděče)', short: 'ČSN EN 60204-1' },
};
const POWER_KINDS = new Set(['supply', 'contactor', 'motor3', 'motorYD', 'motor1', 'thermal', 'mstarter', 'rcd', 'emeter', 'emeter3', 'socket3', 'load3', 'mswitch']);
const CONTROL_KINDS = new Set(['load', 'contact', 'hsw', 'meter']);
function wireFunc(doc) {
  const rn = ES.buildRealNets(doc), n = rn.count, par = Int32Array.from({ length: n }, (_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const bits = new Int32Array(n), power = new Uint8Array(n), control = new Uint8Array(n), peT = new Uint8Array(n), nT = new Uint8Array(n);
  const comps = [];
  for (const it of doc.items) { const d = ES.getDef(it.type); if (!d.terms || !d.terms.length || !ES.REAL_KINDS.has(d.kind)) continue; comps.push([it, d, d.terms.map((_, i) => rn.ofKey.get(it.uid + ':' + i))]); }
  for (const [it, d, tn] of comps) {
    tn.forEach((t, i) => {
      if (t === undefined) return;
      const lab = String(it.t[2 + i] || (d.labels || [])[i] || '');
      if (lab === 'PE') peT[t] = 1; else if (/^N′?$/.test(lab) && d.kind !== 'load') nT[t] = 1;
      if (d.kind === 'supply') { bits[t] |= ES.POT[d.pots[i]]; return; }
      if (POWER_KINDS.has(d.kind) || ((d.kind === 'breaker' || d.kind === 'fuse') && (d.n || 1) >= 3)) power[t] = 1;
      else if (CONTROL_KINDS.has(d.kind)) control[t] = 1;
    });
    if (d.kind === 'trafo') { bits[tn[2]] |= 256; bits[tn[3]] |= 512; }
  }
  const own = { bits: Int32Array.from(bits) };
  for (const [, d, tn] of comps) for (const p of d.poles || []) { const a = find(tn[p.a]), b = find(tn[p.b]); if (a !== b) par[a] = b; }
  const gb = new Int32Array(n); for (let i = 0; i < n; i++) gb[find(i)] |= bits[i];
  return { rn, net: k => rn.ofKey.get(k), info: t => ({ bits: gb[find(t)], own: own.bits[t], power: !!power[t], control: !!control[t], pe: !!peT[t], n: !!nT[t] }) };
}
const C = { br: '#7a4a22', bk: '#1b1b1b', gy: '#8d8d8d', lb: '#2f80ed', pe: 'gnye', rd: '#d62828', db: '#1f3a93', or: '#f28c28' };
function normColorOf(f, t, std) {
  const x = f.info(t), b = x.bits;
  if (b & 16 || x.pe) return [C.pe, 'ochranný vodič PE'];
  if (b & 8 || x.n) return [C.lb, 'střední (nulový) vodič N'];
  const phases = [1, 2, 4].filter(p => b & p);
  if (std === '60204') {
    if (b & 64 && !(b & 39)) return [C.db, 'řídicí obvod DC, záporný pól (L−)'];
    if (b & 32 && !(b & 7)) return [C.db, 'řídicí obvod DC (L+)'];
    if (b & 512 && !(b & 256)) return [C.rd, 'řídicí obvod AC – společný vodič sekundáru'];
    if (b & 256) return [C.rd, 'řídicí obvod AC (sekundár transformátoru)'];
    if (phases.length && x.control && !x.power) return [C.rd, 'řídicí obvod AC (' + phases.map(p => ES.POT_NAME[p]).join('+') + ')'];
    if (phases.length) return [C.bk, 'silový obvod AC (' + phases.map(p => ES.POT_NAME[p]).join('+') + ')'];
    return [C.bk, 'vodič bez přímého napájení (mezi spotřebiči)'];
  }
  if (phases.length === 1) return [[C.br, C.bk, C.gy][[1, 2, 4].indexOf(phases[0])], 'fázový vodič ' + ES.POT_NAME[phases[0]]];
  if (phases.length > 1) return [C.bk, 'fázový vodič (' + phases.map(p => ES.POT_NAME[p]).join('+') + ' – zkrat?)'];
  if (b & 32) return [C.rd, 'stejnosměrný L+ (norma pro instalace barvu nestanoví – zvolena červená)'];
  if (b & 64) return [C.db, 'stejnosměrný L− (zvolena tmavě modrá)'];
  if (b & 256) return [C.rd, 'sekundár transformátoru SELV (norma barvu nestanoví – zvolena červená)'];
  if (b & 512) return [C.lb, 'společný vodič sekundáru (zvolena světle modrá)'];
  return [C.bk, 'vodič bez přímého napájení (mezi spotřebiči)'];
}
// barva pro vodič w podle normy; vrací [barva, popis funkce]
function normColor(doc, w, std, f) { f = f || wireFunc(doc); const t = f.net(w.a[0] + ':' + w.a[1]); return t === undefined ? [C.bk, ''] : normColorOf(f, t, std); }
function colorCheck(doc, std) {
  const f = wireFunc(doc), bad = [];
  doc.real.wires.forEach((w, i) => { const [c, why] = normColor(doc, w, std, f); if (c !== w.c) bad.push({ i, want: c, why }); });
  return bad;
}

ES.Real = { rerouteSchema, NORMS, normColor, colorCheck, wireFunc, WCOL, WNAME, PRESETS, devices, famOf, layout, scene, wirePts, routes, drawWire, drawDevice, drawScene, stateOf, termName, wiresFromSchema, compare, schemaFromReal, placeInSchema, presetDevice, isReal, colorFor };
})(typeof window !== 'undefined' ? window : globalThis);
