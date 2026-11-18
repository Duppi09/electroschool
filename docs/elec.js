// ElectroSchool – elektrotechnika (elektronika) a desky Arduino:
// značky, stejnosměrná simulace (uzlová metoda + Newton) a interpret zjednodušeného jazyka Arduino.
// Kódy 20200+ jsou rozšíření ElectroSchool. Bez DOM – kreslí se do předaného canvasu.
(function (root) {
'use strict';
const ES = root.ES;
const INK = '#1d1d1f';
const E = {};
const C = { src: 'Zdroje a měření', pas: 'Pasivní součástky', semi: 'Polovodiče', sw: 'Spínače a relé', out: 'Výstupy', logic: 'Logická hradla (5 V)', ard: 'Arduino' };
const NORM = { [C.src]: 'značky ČSN EN 60617', [C.pas]: 'ČSN EN 60617-4', [C.semi]: 'ČSN EN 60617-5', [C.sw]: 'ČSN EN 60617-7', [C.out]: 'ČSN EN 60617-8', [C.logic]: 'ČSN EN 60617-12 (obdélníkové značky)', [C.ard]: 'Uno, Nano, Mega 2560 – program dvojklikem' };

// ------------------------------------------------------------ hodnoty s předponami SI
const MULT = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };
function si(s, d) {
  if (s == null) return d; let t = String(s).trim().replace(',', '.').replace(/Ω|ohm/gi, '');
  if (!t) return d;
  const m4 = t.match(/^(\d+)([pnuµmkKMGR])(\d+)/); if (m4) t = m4[1] + '.' + m4[3] + (m4[2] === 'R' ? '' : m4[2]);
  const m = t.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)\s*([pnuµmkKMG]?)/); if (!m) return d;
  const v = parseFloat(m[1]) * MULT[m[2]]; return isFinite(v) ? v : d;
}
function fmt(v, unit, dig) {
  if (!isFinite(v)) return '–';
  const a = Math.abs(v); if (a < 1e-15) return '0 ' + unit;
  const P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  let [k, p] = P.find(([k]) => a >= k * 0.9995) || P[P.length - 1];
  const x = v / k, s = Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(dig == null ? 1 : Math.max(0, dig - 1)) : x.toFixed(dig == null ? 2 : dig);
  return s.replace(/\.?0+$/, m => m.includes('.') ? '' : m).replace('.', ',') + ' ' + p + unit;
}
E.si = si; E.fmt = fmt;

// ------------------------------------------------------------ kreslení
function line(c, a, b, d, e) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }
function circ(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, 7); if (fill) { c.fillStyle = fill; c.fill(); } c.stroke(); }
function arrow(c, x1, y1, x2, y2, s) {
  s = s || 1; line(c, x1, y1, x2, y2); const a = Math.atan2(y2 - y1, x2 - x1);
  c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)); c.lineTo(x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)); c.closePath(); c.fillStyle = c.strokeStyle; c.fill();
}
function txt(c, s, x, y, size, col, al) { c.save(); c.font = size + 'px -apple-system, "Helvetica Neue", Arial, sans-serif'; c.textAlign = al || 'center'; c.textBaseline = 'middle'; c.fillStyle = col || INK; c.fillText(s, x, y); c.restore(); }
const name = it => it.t[0];
function labels(T, it, val, x) { T.push([-(x || 2.6), 4.8, name(it), 2.4, 'right']); if (val) T.push([-(x || 2.6), 7.6, val, 2.1, 'right', '#0b4aa8']); }
function resBox(c, y0, y1, fill) { line(c, 0, 0, 0, y0); line(c, 0, y1, 0, 12); if (fill) { c.fillStyle = fill; c.fillRect(-1.2, y0, 2.4, y1 - y0); } c.strokeRect(-1.2, y0, 2.4, y1 - y0); }
function diodeSym(c, y, zener, fill) {
  line(c, 0, 0, 0, y - 1.8); line(c, 0, y + 1.8, 0, 12);
  c.beginPath(); c.moveTo(-2, y - 1.8); c.lineTo(2, y - 1.8); c.lineTo(0, y + 1.8); c.closePath(); c.fillStyle = fill || c.strokeStyle; c.fill(); c.stroke();
  line(c, -2, y + 1.8, 2, y + 1.8); if (zener) { line(c, -2, y + 1.8, -2.6, y + 1.1); line(c, 2, y + 1.8, 2.6, y + 2.5); }
}
const LEDC = [['červená', '#ff2a1f', 1.9], ['zelená', '#22d14a', 2.2], ['žlutá', '#ffd21f', 2.0], ['modrá', '#2b7bff', 3.0], ['bílá', '#fff1a8', 3.1], ['oranžová', '#ff8a1a', 2.0]];
E.LEDC = LEDC;
function glow(c, x, y, r, col, a) { if (a <= 0.02) return; c.save(); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = Math.min(1, a); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore(); }
function burntMark(c, x, y) { c.save(); c.strokeStyle = '#d92b2b'; c.lineWidth = 0.5; line(c, x - 2, y - 2, x + 2, y + 2); line(c, x - 2, y + 2, x + 2, y - 2); c.restore(); }
const hiCol = (S, v) => !S.sim ? INK : v ? '#d92b2b' : '#2b5fd9';
function contactLever(c, x, closed, nc) {
  line(c, x, 0, x, 3.5); line(c, x, 8.5, x, 12);
  if (nc) { line(c, x, 3.5, x + 2.1, 3.5); if (closed) line(c, x, 8.5, x + 2.3, 2.9); else line(c, x, 8.5, x - 2.9, 3.6); }
  else if (closed) line(c, x, 8.5, x, 3.5); else line(c, x, 8.5, x - 2.9, 3.6);
}

// ------------------------------------------------------------ knihovna
function el(code, cat, d) { return ES.def(code, Object.assign({ kind: 'el', set: 'el', cat, norm: NORM[cat], labels: [], noAuto: true, terms: [[0, 0], [0, 12]], bbox: [-6, -3, 6, 15] }, d)); }
const V2 = [[0, 0], [0, 12]];

// --- zdroje a měření
el(20200, C.src, { name: 'Baterie (článek)', pre: 'G', sub: 'bat', params: [[6, 'Napětí (V)', '9'], [7, 'Vnitřní odpor (Ω)', '0.5']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 5); line(c, -2.8, 5, 2.8, 5); c.save(); c.lineWidth = 0.9; line(c, -1.4, 7, 1.4, 7); c.restore(); line(c, 0, 7, 0, 12);
    txt(c, '+', 2.6, 3.2, 2.2); txt(c, '−', 2.6, 9, 2.2); labels(T, it, fmt(si(it.t[6], 9), 'V')); } });
el(20201, C.src, { name: 'Zdroj stejnosměrného napětí', pre: 'G', sub: 'dc', params: [[6, 'Napětí (V)', '5'], [7, 'Vnitřní odpor (Ω)', '0.05']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12); circ(c, 0, 6, 3, '#fff'); line(c, 0, 3, 0, 9); txt(c, '+', 2.3, 2, 2); labels(T, it, fmt(si(it.t[6], 5), 'V'), 3.8); } });
el(20206, C.src, { name: 'Generátor obdélníku', pre: 'G', sub: 'sq', params: [[6, 'Napětí (V)', '5'], [7, 'Kmitočet (Hz)', '1']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12); circ(c, 0, 6, 3, '#fff'); c.beginPath(); c.moveTo(-1.8, 7); c.lineTo(-1.8, 5); c.lineTo(0, 5); c.lineTo(0, 7); c.lineTo(1.8, 7); c.lineTo(1.8, 5); c.stroke(); txt(c, '+', 2.3, 2, 2);
    labels(T, it, fmt(si(it.t[6], 5), 'V') + ' ' + fmt(si(it.t[7], 1), 'Hz'), 3.8); } });
el(20202, C.src, { name: 'Zem (GND, 0 V)', sub: 'gnd', terms: [[0, 0]], bbox: [-3, -1, 3, 6],
  draw(c) { line(c, 0, 0, 0, 2.5); line(c, -3, 2.5, 3, 2.5); line(c, -2, 3.6, 2, 3.6); line(c, -1, 4.7, 1, 4.7); } });
el(20203, C.src, { name: 'Napájecí bod +5 V (VCC)', sub: 'vcc', terms: [[0, 0]], bbox: [-4, -8, 4, 1], params: [[6, 'Napětí (V)', '5']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, -3); line(c, -2.4, -3, 2.4, -3); T.push([0, -5, '+' + fmt(si(it.t[6], 5), 'V').replace(' ', ' '), 2.2, 'center', '#d92b2b']); } });
el(20204, C.src, { name: 'Voltmetr', pre: 'PV', sub: 'vm',
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12); circ(c, 0, 6, 3, '#fff'); txt(c, 'V', 0, 6.1, 3.2); txt(c, '+', 2.3, 2, 2);
    T.push([-3.6, 5, name(it), 2.4, 'right']); if (S.r) T.push([3.6, 6, fmt(S.r.V, 'V', 2), 2.6, 'left', '#0b4aa8']); } });
el(20205, C.src, { name: 'Ampérmetr', pre: 'PA', sub: 'am',
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12); circ(c, 0, 6, 3, '#fff'); txt(c, 'A', 0, 6.1, 3.2); txt(c, '+', 2.3, 2, 2);
    T.push([-3.6, 5, name(it), 2.4, 'right']); if (S.r) T.push([3.6, 6, fmt(S.r.I, 'A', 2), 2.6, 'left', '#0b4aa8']); } });

// --- pasivní součástky
el(20210, C.pas, { name: 'Rezistor', pre: 'R', sub: 'res', params: [[6, 'Odpor (Ω)', '1k'], [8, 'Zatížitelnost (W)', '0.25']],
  draw(c, it, d, S, T) { const r = S.r, hot = r && r.P > si(it.t[8], 0.25); resBox(c, 3, 9, r && r.burnt ? '#555' : hot ? '#ffb4a8' : null); if (r && r.burnt) burntMark(c, 0, 6); labels(T, it, fmt(si(it.t[6], 1000), 'Ω')); } });
el(20211, C.pas, { name: 'Potenciometr', pre: 'RP', sub: 'pot', click: 'adjust', terms: [[0, 0], [0, 12], [6, 6]], bbox: [-6, -3, 9, 15], params: [[6, 'Odpor (Ω)', '10k'], [7, 'Poloha jezdce (%)', '50']],
  draw(c, it, d, S, T, sim) { resBox(c, 2, 10); const p = S.r ? S.r.pos : Math.min(1, Math.max(0, si(it.t[7], 50) / 100)), y = 2.4 + 7.2 * p; c.beginPath(); c.moveTo(6, 6); c.lineTo(4, 6); c.lineTo(4, y); c.stroke(); arrow(c, 4, y, 1.4, y, 1);
    labels(T, it, fmt(si(it.t[6], 10000), 'Ω')); if (S.sim) T.push([6.5, 9.5, Math.round((1 - p) * 100) + ' %', 2, 'left', '#0b4aa8']); } });
el(20212, C.pas, { name: 'Fotorezistor (LDR)', pre: 'R', sub: 'ldr', click: 'adjust',
  draw(c, it, d, S, T) { resBox(c, 3, 9); arrow(c, 5, 2, 1.8, 4.6, 0.9); arrow(c, 5, 4.6, 1.8, 7.2, 0.9); labels(T, it, 'LDR'); if (S.r) T.push([3.5, 10, S.r.lvlName, 2, 'left', '#0b4aa8']); } });
el(20213, C.pas, { name: 'Termistor NTC', pre: 'RT', sub: 'ntc', click: 'adjust', params: [[6, 'Odpor při 25 °C (Ω)', '10k']],
  draw(c, it, d, S, T) { resBox(c, 3, 9); c.beginPath(); c.moveTo(-3.6, 10); c.lineTo(-2.6, 10); c.lineTo(2.6, 2); c.stroke(); txt(c, '−t°', 3.6, 9.6, 1.9, INK, 'left'); labels(T, it, fmt(si(it.t[6], 10000), 'Ω'), 4.2); if (S.r) T.push([3.5, 2.5, S.r.lvlName, 2, 'left', '#0b4aa8']); } });
el(20214, C.pas, { name: 'Kondenzátor', pre: 'C', sub: 'cap', params: [[6, 'Kapacita (F)', '100n']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 5.3); line(c, 0, 6.7, 0, 12); c.save(); c.lineWidth = 0.55; line(c, -2.6, 5.3, 2.6, 5.3); line(c, -2.6, 6.7, 2.6, 6.7); c.restore(); labels(T, it, fmt(si(it.t[6], 1e-7), 'F'), 3.2); if (S.r) T.push([3.2, 9.5, fmt(S.r.V, 'V', 2), 2, 'left', '#0b4aa8']); } });
el(20215, C.pas, { name: 'Elektrolytický kondenzátor', pre: 'C', sub: 'ecap', params: [[6, 'Kapacita (F)', '1000u'], [8, 'Jmenovité napětí (V)', '16']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 5.3); line(c, 0, 6.9, 0, 12); c.save(); c.lineWidth = 0.55; line(c, -2.6, 5.3, 2.6, 5.3); c.fillStyle = S.r && S.r.bad ? '#d92b2b' : c.strokeStyle; c.fillRect(-2.6, 6.5, 5.2, 0.9); c.restore(); txt(c, '+', 2.4, 3.6, 2.2);
    labels(T, it, fmt(si(it.t[6], 1e-3), 'F'), 3.2); if (S.r) T.push([3.2, 9.5, fmt(S.r.V, 'V', 2), 2, 'left', '#0b4aa8']); } });
el(20216, C.pas, { name: 'Cívka (indukčnost)', pre: 'L', sub: 'ind', params: [[6, 'Indukčnost (H)', '10m'], [7, 'Odpor vinutí (Ω)', '1']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 2); line(c, 0, 10, 0, 12); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 3 + 2 * i, 1, -Math.PI / 2, Math.PI / 2); c.stroke(); } labels(T, it, fmt(si(it.t[6], 0.01), 'H')); } });
el(20217, C.pas, { name: 'Pojistka (trubičková)', pre: 'F', sub: 'fuse', click: 'adjust', params: [[6, 'Jmenovitý proud (A)', '0.5']],
  draw(c, it, d, S, T) { const b = S.r && S.r.burnt; line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12); c.fillStyle = b ? '#ffc9c2' : '#fff'; c.fillRect(-1.2, 3, 2.4, 6); c.strokeRect(-1.2, 3, 2.4, 6); if (b) { line(c, 0, 3, 0, 5); line(c, 0, 7, 0, 9); } else line(c, 0, 3, 0, 9); labels(T, it, fmt(si(it.t[6], 0.5), 'A')); } });

// --- polovodiče
el(20220, C.semi, { name: 'Dioda (1N4148)', pre: 'D', sub: 'diode',
  draw(c, it, d, S, T) { diodeSym(c, 6); if (S.r && S.r.burnt) burntMark(c, 0, 6); labels(T, it, ''); } });
el(20221, C.semi, { name: 'Zenerova dioda', pre: 'D', sub: 'zener', params: [[6, 'Zenerovo napětí (V)', '5.1']],
  draw(c, it, d, S, T) { diodeSym(c, 6, true); if (S.r && S.r.burnt) burntMark(c, 0, 6); labels(T, it, fmt(si(it.t[6], 5.1), 'V')); } });
const ledDraw = (c, it, d, S, T) => {
  const ci = LEDC[parseInt(it.t[4]) || 0] || LEDC[0], r = S.r;
  if (r && r.bright > 0) glow(c, 0, 6, 6, ci[1], 0.25 + r.bright);
  diodeSym(c, 6, false, r && r.bright > 0.02 ? ci[1] : null);
  c.save(); c.strokeStyle = ci[1] === '#fff1a8' ? '#b9a64a' : ci[1]; arrow(c, 2.2, 5, 4.6, 2.6, 0.9); arrow(c, 2.2, 7, 4.6, 4.6, 0.9); c.restore();
  if (r && r.burnt) burntMark(c, 0, 6); labels(T, it, ci[0]);
};
LEDC.forEach((col, i) => el(20222 + i, C.semi, { name: 'LED ' + col[0], pre: 'D', sub: 'led', defaults: { 4: String(i) }, params: [[4, 'Barva', 'led']], draw: ledDraw }));
el(20228, C.semi, { name: 'Tranzistor NPN (BC547)', pre: 'Q', sub: 'npn', terms: [[6, 0], [0, 6], [6, 12]], bbox: [-6, -3, 9, 15], params: [[6, 'Zesilovací činitel β', '200']],
  draw(c, it, d, S, T) { circ(c, 4.4, 6, 4.2); line(c, 0, 6, 3, 6); c.save(); c.lineWidth = 0.6; line(c, 3, 3.4, 3, 8.6); c.restore(); line(c, 3, 4.6, 6, 2.4); line(c, 6, 2.4, 6, 0); arrow(c, 3, 7.4, 5.6, 9.3, 1.1); line(c, 5.6, 9.3, 6, 9.6); line(c, 6, 9.6, 6, 12);
    txt(c, 'C', 7.2, 1.2, 1.7, '#555', 'left'); txt(c, 'B', 0.4, 4.6, 1.7, '#555', 'left'); txt(c, 'E', 7.2, 11, 1.7, '#555', 'left'); if (S.r && S.r.burnt) burntMark(c, 4.4, 6); T.push([-1, 9.5, name(it), 2.4, 'right']); } });
el(20229, C.semi, { name: 'Tranzistor PNP (BC557)', pre: 'Q', sub: 'pnp', terms: [[6, 0], [0, 6], [6, 12]], bbox: [-6, -3, 9, 15], params: [[6, 'Zesilovací činitel β', '200']],
  draw(c, it, d, S, T) { circ(c, 4.4, 6, 4.2); line(c, 0, 6, 3, 6); c.save(); c.lineWidth = 0.6; line(c, 3, 3.4, 3, 8.6); c.restore(); line(c, 6, 0, 6, 2.4); arrow(c, 6, 2.4, 3.4, 4.4, 1.1); line(c, 3, 7.4, 6, 9.6); line(c, 6, 9.6, 6, 12);
    txt(c, 'E', 7.2, 1.2, 1.7, '#555', 'left'); txt(c, 'B', 0.4, 4.6, 1.7, '#555', 'left'); txt(c, 'C', 7.2, 11, 1.7, '#555', 'left'); if (S.r && S.r.burnt) burntMark(c, 4.4, 6); T.push([-1, 9.5, name(it), 2.4, 'right']); } });
el(20230, C.semi, { name: 'Tranzistor MOSFET N', pre: 'Q', sub: 'nmos', terms: [[6, 0], [0, 6], [6, 12]], bbox: [-6, -3, 9, 15], params: [[6, 'Prahové napětí (V)', '2']],
  draw(c, it, d, S, T) { line(c, 0, 6, 1.8, 6); c.save(); c.lineWidth = 0.5; line(c, 1.8, 3.4, 1.8, 8.6); line(c, 3, 3, 3, 4.6); line(c, 3, 5.2, 3, 6.8); line(c, 3, 7.4, 3, 9); c.restore();
    line(c, 3, 3.8, 6, 3.8); line(c, 6, 3.8, 6, 0); line(c, 3, 8.2, 6, 8.2); line(c, 6, 8.2, 6, 12); arrow(c, 6, 6, 3.3, 6, 1); line(c, 6, 6, 6, 8.2);
    txt(c, 'D', 7.2, 1.2, 1.7, '#555', 'left'); txt(c, 'G', 0.2, 4.6, 1.7, '#555', 'left'); txt(c, 'S', 7.2, 11, 1.7, '#555', 'left'); if (S.r && S.r.burnt) burntMark(c, 4, 6); T.push([-1, 9.5, name(it), 2.4, 'right']); } });
el(20231, C.semi, { name: 'Stabilizátor 7805 (5 V)', pre: 'U', sub: 'reg', terms: [[0, 6], [6, 12], [12, 6]], bbox: [-1, 0, 13, 13],
  draw(c, it, d, S, T) { c.fillStyle = '#fff'; c.fillRect(1.5, 2.5, 9, 7); c.strokeRect(1.5, 2.5, 9, 7); line(c, 0, 6, 1.5, 6); line(c, 10.5, 6, 12, 6); line(c, 6, 9.5, 6, 12);
    txt(c, '7805', 6, 4.6, 2.1); txt(c, 'IN', 2.3, 7.4, 1.5, '#555', 'left'); txt(c, 'OUT', 9.8, 7.4, 1.5, '#555', 'right'); txt(c, 'GND', 6, 8.6, 1.3, '#555'); T.push([6, 1, name(it), 2.2, 'center']); } });

// --- spínače a relé
el(20240, C.sw, { name: 'Tlačítko spínací', pre: 'S', sub: 'push', click: 'momentary', bbox: [-9, -3, 6, 15],
  draw(c, it, d, S, T) { const on = S.r && S.r.on; contactLever(c, 0, on, false); c.save(); c.setLineDash([0.9, 0.7]); line(c, on ? -0.1 : -1.4, 6, -5, 6); c.restore(); line(c, -5, 4.6, -5, 7.4); line(c, -5, 4.6, -5.8, 4.6); line(c, -5, 7.4, -5.8, 7.4); T.push([-6.5, 6, name(it), 2.4, 'right']); } });
el(20241, C.sw, { name: 'Tlačítko rozpínací', pre: 'S', sub: 'pushnc', click: 'momentary', bbox: [-9, -3, 6, 15],
  draw(c, it, d, S, T) { const on = S.r && S.r.on; contactLever(c, 0, !on, true); c.save(); c.setLineDash([0.9, 0.7]); line(c, on ? -1.4 : 0.9, 6, -5, 6); c.restore(); line(c, -5, 4.6, -5, 7.4); line(c, -5, 4.6, -5.8, 4.6); line(c, -5, 7.4, -5.8, 7.4); T.push([-6.5, 6, name(it), 2.4, 'right']); } });
el(20242, C.sw, { name: 'Spínač (páčkový)', pre: 'S', sub: 'toggle', click: 'toggle',
  draw(c, it, d, S, T) { contactLever(c, 0, S.r && S.r.on, false); labels(T, it, ''); } });
el(20243, C.sw, { name: 'Přepínač (2 polohy)', pre: 'S', sub: 'spdt', click: 'toggle', terms: [[3, 12], [0, 0], [6, 0]], bbox: [-6, -3, 9, 15],
  draw(c, it, d, S, T) { const on = S.r && S.r.on; line(c, 3, 12, 3, 8.5); line(c, 0, 0, 0, 3.5); line(c, 6, 0, 6, 3.5); line(c, 3, 8.5, on ? 6 : 0, 3.5); circ(c, 3, 8.5, 0.5, '#fff'); txt(c, '1', -0.8, 2, 1.7, '#555', 'right'); txt(c, '2', 6.8, 2, 1.7, '#555', 'left'); T.push([-1.5, 7.5, name(it), 2.4, 'right']); } });
el(20244, C.sw, { name: 'Jazýčkový kontakt (magnet)', pre: 'S', sub: 'reed', click: 'toggle',
  draw(c, it, d, S, T) { contactLever(c, 0, S.r && S.r.on, false); c.beginPath(); c.ellipse(-0.8, 6, 3.4, 4.2, 0, 0, 7); c.stroke(); labels(T, it, 'magnet', 4.6); } });
el(20245, C.sw, { name: 'Relé (cívka + přepínací kontakt)', pre: 'K', sub: 'relay', terms: [[0, 0], [0, 12], [9, 12], [6, 0], [12, 0]], bbox: [-6, -3, 15, 15], params: [[6, 'Napětí cívky (V)', '5']],
  draw(c, it, d, S, T) { const on = S.r && S.r.on; line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12); c.fillStyle = on ? '#ffe9a8' : '#fff'; c.fillRect(-2, 3, 4, 6); c.strokeRect(-2, 3, 4, 6);
    line(c, 9, 12, 9, 8.5); line(c, 6, 0, 6, 3.5); line(c, 12, 0, 12, 3.5); line(c, 6, 3.5, 7.4, 3.5); line(c, 9, 8.5, on ? 12 : 7.6, 3.4);
    c.save(); c.setLineDash([0.9, 0.7]); line(c, 2, 6, on ? 10.3 : 8.4, 6); c.restore();
    txt(c, 'NC', 5.6, -1.6, 1.5, '#555'); txt(c, 'NO', 12.4, -1.6, 1.5, '#555'); txt(c, 'COM', 10.8, 12.6, 1.5, '#555', 'left'); T.push([-2.6, 6, name(it), 2.4, 'right']); T.push([-2.6, 8.8, fmt(si(it.t[6], 5), 'V'), 2, 'right', '#0b4aa8']); } });

// --- výstupy
el(20250, C.out, { name: 'Žárovka', pre: 'E', sub: 'lamp', params: [[6, 'Jmenovité napětí (V)', '6'], [7, 'Příkon (W)', '0.6']],
  draw(c, it, d, S, T) { const b = S.r ? S.r.bright : 0; line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12); if (b > 0.03) glow(c, 0, 6, 7, '#ffe066', 0.3 + b); circ(c, 0, 6, 3, b > 0.03 ? 'rgba(255,224,102,' + Math.min(1, 0.3 + b) + ')' : '#fff'); line(c, -2.1, 3.9, 2.1, 8.1); line(c, -2.1, 8.1, 2.1, 3.9);
    labels(T, it, fmt(si(it.t[6], 6), 'V') + ' ' + fmt(si(it.t[7], 0.6), 'W'), 3.8); } });
el(20251, C.out, { name: 'Bzučák (aktivní)', pre: 'HA', sub: 'buzz', params: [[6, 'Jmenovité napětí (V)', '5']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 3.5); line(c, 0, 8.5, 0, 12); c.beginPath(); c.moveTo(-2.8, 8.5); c.lineTo(-2.8, 6); c.arc(0, 6, 2.8, Math.PI, 0); c.lineTo(2.8, 8.5); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke();
    if (S.r && S.r.on) { c.save(); c.strokeStyle = '#c25400'; for (const r of [4, 5.4]) { c.beginPath(); c.arc(0, 6, r, -0.6, 0.6); c.stroke(); } c.restore(); } labels(T, it, '', 3.6); } });
el(20252, C.out, { name: 'Stejnosměrný motorek', pre: 'M', sub: 'motor', params: [[6, 'Jmenovité napětí (V)', '6'], [7, 'Odpor vinutí (Ω)', '20']],
  draw(c, it, d, S, T) { line(c, 0, 0, 0, 2); line(c, 0, 10, 0, 12); circ(c, 0, 6, 4, '#fff'); txt(c, 'M', 0, 5.4, 3); line(c, -1.4, 7.8, 1.4, 7.8);
    if (S.r && S.r.ang !== undefined) { c.save(); c.strokeStyle = '#d92b2b'; const a = S.r.ang; line(c, 0, 6, 3.4 * Math.cos(a), 6 + 3.4 * Math.sin(a)); c.restore(); }
    labels(T, it, fmt(si(it.t[6], 6), 'V'), 4.6); if (S.r) T.push([4.6, 10, Math.round(S.r.rpm || 0) + ' ot/min', 2, 'left', '#0b4aa8']); } });
const SEG = { a: [[-2, -4], [2, -4]], b: [[2, -4], [2, 0]], c: [[2, 0], [2, 4]], d: [[-2, 4], [2, 4]], e: [[-2, 0], [-2, 4]], f: [[-2, -4], [-2, 0]], g: [[-2, 0], [2, 0]] };
el(20253, C.out, { name: 'Sedmisegmentový displej', pre: 'H', sub: 'seg7', terms: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].map((_, i) => [i * 3, 0]).concat([[9, 24]]), bbox: [-3, -3, 24, 27],
  params: [[4, 'Zapojení', 'seg']],
  draw(c, it, d, S, T) { c.fillStyle = '#222'; c.fillRect(-1.5, 2, 24, 20); c.strokeRect(-1.5, 2, 24, 20); const r = S.r;
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].forEach((s, i) => { line(c, i * 3, 0, i * 3, 2); txt(c, s, i * 3, 3.6, 1.6, '#ccc'); });
    line(c, 9, 22, 9, 24); txt(c, (it.t[4] === '1' ? 'A' : 'K') + ' (COM)', 10, 20.4, 1.5, '#ccc', 'left');
    c.save(); c.translate(10.5, 12.5); c.transform(1, 0, -0.12, 1, 0, 0); c.lineWidth = 1.1; c.lineCap = 'round';
    for (const [k, [p, q]] of Object.entries(SEG)) { const on = r && r.seg && r.seg[k]; c.strokeStyle = on ? '#ff3b2f' : '#3a1a18'; line(c, p[0] * 1.6, p[1] * 1.3, q[0] * 1.6, q[1] * 1.3); }
    c.fillStyle = r && r.seg && r.seg.dp ? '#ff3b2f' : '#3a1a18'; c.beginPath(); c.arc(5, 5.6, 0.7, 0, 7); c.fill(); c.restore();
    T.push([-2.5, 12, name(it), 2.4, 'right']); } });
el(20254, C.out, { name: 'RGB LED (společná katoda)', pre: 'D', sub: 'rgb', terms: [[0, 0], [3, 0], [6, 0], [3, 12]], bbox: [-6, -3, 9, 15],
  draw(c, it, d, S, T) { const r = S.r, k = r ? r.rgb : [0, 0, 0], col = 'rgb(' + k.map(x => Math.round(255 * Math.min(1, x))).join(',') + ')', on = k.some(x => x > 0.03);
    if (on) glow(c, 3, 6, 7, col, 0.4 + Math.max(...k)); line(c, 0, 0, 0, 3); line(c, 3, 0, 3, 3); line(c, 6, 0, 6, 3); line(c, 3, 9, 3, 12); circ(c, 3, 6, 3.4, on ? col : '#fff');
    txt(c, 'R', -0.4, 1.4, 1.5, '#d92b2b', 'right'); txt(c, 'G', 4, 1.4, 1.5, '#1c9c3c', 'left'); txt(c, 'B', 6.8, 1.4, 1.5, '#2b5fd9', 'left'); if (r && r.burnt) burntMark(c, 3, 6); T.push([-1, 7, name(it), 2.4, 'right']); } });

// --- logická hradla (napájená implicitně 5 V)
const GATES = [[20260, 'NOT (invertor)', 'not', '1', 1, true], [20261, 'AND (součin)', 'and', '&', 2, false], [20262, 'OR (součet)', 'or', '≥1', 2, false],
  [20263, 'NAND', 'nand', '&', 2, true], [20264, 'NOR', 'nor', '≥1', 2, true], [20265, 'XOR (nonekvivalence)', 'xor', '=1', 2, false]];
for (const [code, nm, sub, sym, n, neg] of GATES) {
  const yo = n === 1 ? 0 : 3;
  el(code, C.logic, { name: 'Hradlo ' + nm, pre: 'IC', sub: 'gate', fn: sub, nin: n, terms: (n === 1 ? [[0, 0]] : [[0, 0], [0, 6]]).concat([[15, yo]]), bbox: [-1, -4, 16, n === 1 ? 4 : 10],
    draw(c, it, d, S, T) { const r = S.r, h = n === 1 ? [-3, 3] : [-3, 9];
      c.fillStyle = '#fff'; c.fillRect(3, h[0], 9, h[1] - h[0]); c.strokeRect(3, h[0], 9, h[1] - h[0]); txt(c, sym, 7.5, yo, 3);
      for (let i = 0; i < n; i++) { c.save(); c.strokeStyle = hiCol(S, r && r.in[i]); line(c, 0, i * 6, 3, i * 6); c.restore(); }
      c.save(); c.strokeStyle = hiCol(S, r && r.out); if (neg) { circ(c, 12.7, yo, 0.7, '#fff'); line(c, 13.4, yo, 15, yo); } else line(c, 12, yo, 15, yo); c.restore();
      T.push([7.5, h[0] - 1.6, name(it), 2.2, 'center']); } });
}

// --- desky Arduino
const BOARDS = {};
function board(code, nm, cfg) {
  const pins = [];
  cfg.top.forEach((p, i) => p && pins.push({ n: p, x: cfg.tx + i * 3, y: 0, side: 't' }));
  cfg.bottom.forEach((p, i) => p && pins.push({ n: p, x: cfg.bx + i * 3, y: cfg.h, side: 'b' }));
  (cfg.right || []).forEach((p, i) => p && pins.push({ n: p, x: cfg.w, y: cfg.ry + i * 3, side: 'r' }));
  const idx = {}; pins.forEach((p, i) => { idx[p.n] = i; });
  BOARDS[code] = Object.assign({ pins, idx }, cfg);
  el(code, C.ard, { name: nm, pre: 'U', sub: 'board', board: code, terms: pins.map(p => [p.x, p.y]), bbox: [cfg.x0 - 1, -1, cfg.w + 1, cfg.h + 1], params: [[0, 'program', 'sketch']],
    draw: drawBoard });
}
const D = (a, b) => { const o = []; if (a <= b) for (let i = a; i <= b; i++) o.push('D' + i); else for (let i = a; i >= b; i--) o.push('D' + i); return o; };
const Aa = n => Array.from({ length: n }, (_, i) => 'A' + i);
board(20300, 'Arduino Uno', { top: ['GND', ...D(13, 0)], tx: 0, bottom: ['VIN', 'GND', 'GND', '5V', '3V3', ...Aa(6)], bx: 9, w: 45, h: 30, x0: -9, A0: 14, nA: 6, pwm: [3, 5, 6, 9, 10, 11], color: '#00878f', usb: true });
board(20301, 'Arduino Nano', { top: ['D1', 'D0', 'GND', ...D(2, 12)], tx: 0, bottom: ['D13', '3V3', ...Aa(8), '5V', 'GND', 'VIN'], bx: 0, w: 42, h: 18, x0: -6, A0: 14, nA: 8, pwm: [3, 5, 6, 9, 10, 11], color: '#1b6fa8', usb: true, aonly: [20, 21] });
board(20302, 'Arduino Mega 2560', { top: ['GND', ...D(13, 0), ...D(14, 21)], tx: 0, bottom: ['VIN', 'GND', 'GND', '5V', '3V3', ...Aa(16)], bx: 6, w: 75, h: 99, x0: -9, right: D(22, 53), ry: 3, A0: 54, nA: 16, pwm: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46], color: '#00878f', usb: true });
E.BOARDS = BOARDS;
// číslo pinu (jak ho zná program) -> název svorky
function pinName(B, p) { if (p >= B.A0 && p < B.A0 + B.nA) return 'A' + (p - B.A0); return 'D' + p; }
function drawBoard(c, it, d, S, T, sim) {
  const B = BOARDS[d.board], r = S.r;
  c.fillStyle = B.color; c.fillRect(B.x0, 2, B.w - B.x0 - 2, B.h - 4); c.strokeRect(B.x0, 2, B.w - B.x0 - 2, B.h - 4);
  if (B.usb) { c.fillStyle = '#c9ccd1'; c.fillRect(B.x0 - 3, 6, 6, 6); c.strokeRect(B.x0 - 3, 6, 6, 6); }
  c.fillStyle = '#333'; c.fillRect(B.x0 + 8, B.h / 2 - 3, 10, 6); txt(c, 'ATmega', B.x0 + 13, B.h / 2, 1.5, '#ddd');
  txt(c, d.name.replace('Arduino ', 'ARDUINO '), (B.x0 + B.w) / 2 + 6, B.h / 2 - 5, 2.6, '#fff');
  if (name(it)) txt(c, name(it), (B.x0 + B.w) / 2 + 6, B.h / 2 + 5.5, 2.2, '#cfe');
  for (const p of B.pins) {
    const pw = /^D(\d+)$/.test(p.n) && B.pwm.includes(+p.n.slice(1)), lab = p.n.replace(/^D/, '') + (pw ? '~' : '');
    const st = r && r.pins && r.pins[p.n];
    c.save(); c.strokeStyle = st === undefined ? INK : st.out ? (st.v > 0.5 ? '#d92b2b' : '#2b5fd9') : INK;
    if (p.side === 't') { line(c, p.x, 0, p.x, 2); c.fillStyle = '#111'; c.fillRect(p.x - 1, 2, 2, 1.4); txt(c, lab, p.x, 4.6, p.n.length > 3 ? 1.05 : 1.35, '#fff'); }
    else if (p.side === 'b') { line(c, p.x, B.h - 2, p.x, B.h); c.fillStyle = '#111'; c.fillRect(p.x - 1, B.h - 3.4, 2, 1.4); txt(c, lab, p.x, B.h - 4.6, p.n.length > 2 ? 1.05 : 1.35, '#fff'); }
    else { line(c, B.w - 2, p.y, B.w, p.y); c.fillStyle = '#111'; c.fillRect(B.w - 3.4, p.y - 1, 1.4, 2); txt(c, lab, B.w - 4, p.y, 1.3, '#fff', 'right'); }
    c.restore();
  }
  // LED „L“ na pinu 13 a „ON“
  const lx = B.x0 + 6, l13 = r && r.pins && r.pins.D13 && r.pins.D13.out && r.pins.D13.v > 0.5;
  c.fillStyle = l13 ? '#ffb02e' : '#7a5a20'; c.fillRect(lx, 4, 2, 1.4); txt(c, 'L', lx + 3, 4.7, 1.4, '#fff', 'left');
  c.fillStyle = sim ? '#3cff6a' : '#245c32'; c.fillRect(lx, B.h - 6, 2, 1.4); txt(c, 'ON', lx + 3, B.h - 5.3, 1.4, '#fff', 'left');
  if (r && (r.serial.length || r.err)) {
    const lines = r.err ? ['⚠ ' + r.err] : r.serial.slice(-5), y0 = B.h + 3, w = B.w - B.x0;
    c.fillStyle = 'rgba(20,20,24,.92)'; c.fillRect(B.x0, y0, w, 3 + lines.length * 2.6); c.fillStyle = r.err ? '#ff8a80' : '#9cff9c';
    c.save(); c.font = '2px Menlo, monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; lines.forEach((s, i) => c.fillText(String(s).slice(0, Math.floor(w / 1.25)), B.x0 + 1, y0 + 1.2 + i * 2.6)); c.restore();
  }
}

// ------------------------------------------------------------ programy pro Arduino
const SK = {
  blink: ['Blikání LED (pin 13)', 'void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}\n'],
  button: ['Tlačítko rozsvítí LED (pin 2 → 13)', '// tlačítko mezi pinem 2 a GND, LED přes rezistor 220 Ω na pinu 13\nconst int TLACITKO = 2;\nconst int LED = 13;\n\nvoid setup() {\n  pinMode(TLACITKO, INPUT_PULLUP);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(TLACITKO) == LOW) {\n    digitalWrite(LED, HIGH);\n  } else {\n    digitalWrite(LED, LOW);\n  }\n}\n'],
  semafor: ['Semafor (piny 12, 11, 10)', 'int cervena = 12, oranzova = 11, zelena = 10;\n\nvoid setup() {\n  pinMode(cervena, OUTPUT);\n  pinMode(oranzova, OUTPUT);\n  pinMode(zelena, OUTPUT);\n}\n\nvoid svit(int c, int o, int z, int ms) {\n  digitalWrite(cervena, c);\n  digitalWrite(oranzova, o);\n  digitalWrite(zelena, z);\n  delay(ms);\n}\n\nvoid loop() {\n  svit(HIGH, LOW, LOW, 3000);\n  svit(HIGH, HIGH, LOW, 1000);\n  svit(LOW, LOW, HIGH, 3000);\n  svit(LOW, HIGH, LOW, 1000);\n}\n'],
  pot: ['Potenciometr řídí jas LED (A0 → pin 9)', '// jezdec potenciometru na A0, LED přes 220 Ω na pinu 9 (PWM)\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(9, OUTPUT);\n}\n\nvoid loop() {\n  int hodnota = analogRead(A0);          // 0 až 1023\n  int jas = map(hodnota, 0, 1023, 0, 255);\n  analogWrite(9, jas);\n  Serial.print("A0 = ");\n  Serial.println(hodnota);\n  delay(200);\n}\n'],
  chase: ['Běžící světlo (piny 2 až 7)', 'int ledky[] = {2, 3, 4, 5, 6, 7};\n\nvoid setup() {\n  for (int i = 0; i < 6; i++) {\n    pinMode(ledky[i], OUTPUT);\n  }\n}\n\nvoid loop() {\n  for (int i = 0; i < 6; i++) {\n    digitalWrite(ledky[i], HIGH);\n    delay(150);\n    digitalWrite(ledky[i], LOW);\n  }\n}\n'],
  ldr: ['Soumrakový spínač (fotorezistor na A0)', '// dělič: 5V – fotorezistor – A0 – rezistor 10 kΩ – GND\nconst int PRAH = 300;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  int svetlo = analogRead(A0);\n  Serial.println(svetlo);\n  if (svetlo < PRAH) {\n    digitalWrite(13, HIGH);   // tma -> rozsvítit\n  } else {\n    digitalWrite(13, LOW);\n  }\n  delay(300);\n}\n'],
  counter: ['Počítadlo stisků (tlačítko na pinu 2)', 'int pocet = 0;\nbool predtim = HIGH;\n\nvoid setup() {\n  pinMode(2, INPUT_PULLUP);\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  bool ted = digitalRead(2);\n  if (predtim == HIGH && ted == LOW) {\n    pocet++;\n    Serial.print("Stisknuto: ");\n    Serial.println(pocet);\n  }\n  predtim = ted;\n  delay(10);\n}\n'],
};
E.SKETCHES = SK;
E.sketchOf = it => { try { return it.extra ? decodeURIComponent(it.extra) : SK.blink[1]; } catch (e) { return SK.blink[1]; } };
E.setSketch = (it, s) => { it.extra = encodeURIComponent(s).replace(/\*/g, '%2A'); };

// převod zjednodušeného jazyka Arduino (C/C++) na generátorovou funkci JS
const TYPE = '(?:(?:const|static|volatile|unsigned|signed)\\s+)*(?:void|int|long|short|float|double|byte|bool|boolean|char|String|word|size_t|u?int(?:8|16|32)_t)\\b';
function matchParen(s, i) { let d = 0; for (; i < s.length; i++) { const ch = s[i]; if (ch === '"' || ch === "'") { const q = ch; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; } continue; } if (ch === '(') d++; else if (ch === ')') { d--; if (!d) return i; } } return -1; }
function compile(src) {
  let s = src.replace(/\r/g, '');
  s = s.replace(/^\s*#\s*include.*$/gm, '').replace(/^\s*#\s*define\s+(\w+)\s+(.+)$/gm, 'const $1 = $2;');
  const fn = [];
  s = s.replace(new RegExp('\\b' + TYPE + '\\s*\\*?\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*\\{', 'g'), (m, n, ps) => { fn.push(n); return 'function* ' + n + '(' + ps.split(',').map(p => (p.trim().split(/[\s*&]+/).filter(Boolean).pop() || '').replace(/\[\]$/, '')).filter(x => x && x !== 'void').join(', ') + ') {'; });
  s = s.replace(new RegExp('\\b' + TYPE + '\\s+\\w+\\s*\\([^)]*\\)\\s*;', 'g'), '');
  s = s.replace(new RegExp('\\b' + TYPE + '\\s+(\\w+)\\s*\\[\\s*\\w*\\s*\\]\\s*=\\s*\\{([^}]*)\\}', 'g'), 'let $1 = [$2]');
  s = s.replace(new RegExp('\\b' + TYPE + '\\s+(\\w+)\\s*\\[\\s*(\\w+)\\s*\\]\\s*;', 'g'), 'let $1 = new Array($2).fill(0);');
  s = s.replace(/\(\s*(?:unsigned\s+)?(?:int|long|float|double|byte|char)\s*\)/g, '');
  s = s.replace(new RegExp('\\b' + TYPE + '\\s+(?=[A-Za-z_])', 'g'), 'let ');
  // smyčky: pojistka proti zamrznutí
  s = s.replace(/\b(while|for)\s*\(/g, (m) => m + '\u0001');
  let out = '', i = 0;
  for (;;) {
    const j = s.indexOf('\u0001', i); if (j < 0) { out += s.slice(i); break; }
    const k = matchParen(s, j - 1); out += s.slice(i, j); if (k < 0) { i = j + 1; continue; }
    const body = s.slice(j + 1, k + 1); let rest = k + 1; while (/\s/.test(s[rest] || '')) rest++;
    out += body + (s[rest] === '{' ? s.slice(k + 1, rest + 1) + ' if (__tick()) yield 0;' : '');
    i = s[rest] === '{' ? rest + 1 : k + 1;
  }
  s = out;
  // volání funkcí s čekáním -> yield*
  const gen = fn.concat(['delay', 'delayMicroseconds']), re = new RegExp('\\b(' + gen.join('|') + ')\\s*\\(', 'g');
  const ins = []; let m;
  while ((m = re.exec(s))) { if (/function\*\s*$/.test(s.slice(Math.max(0, m.index - 12), m.index))) continue; const k = matchParen(s, m.index + m[0].length - 1); if (k > 0) ins.push([m.index, '(yield* '], [k + 1, ')']); }
  ins.sort((a, b) => b[0] - a[0]); for (const [p, t] of ins) s = s.slice(0, p) + t + s.slice(p);
  return s;
}
E.compile = compile;
const API = ['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'tone', 'noTone', 'millis', 'micros', 'delay', 'delayMicroseconds', 'map', 'constrain', 'random', 'randomSeed',
  'abs', 'min', 'max', 'pow', 'sqrt', 'sq', 'sin', 'cos', 'tan', 'round', 'floor', 'ceil', 'int', 'float', 'long', 'byte', 'word', 'F', 'Serial', 'bitRead', 'bitWrite', 'bitSet', 'bitClear',
  'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN', 'PI', 'HALF_PI', 'TWO_PI', 'DEG_TO_RAD', 'RAD_TO_DEG', 'DEC', 'HEX', 'BIN', 'true', 'false', '__tick',
  ...Array.from({ length: 16 }, (_, i) => 'A' + i)].filter(n => n !== 'true' && n !== 'false');
function makeBoard(c) {
  const B = BOARDS[c.d.board], bd = { c, B, mode: {}, out: {}, duty: {}, t: 0, serial: [], line: '', err: '', gen: null, it: 0 };
  let ticks = 0; const rd = n => { if (bd.dirty && bd.resolve) { bd.dirty = false; bd.resolve(); } return bd.read ? bd.read(n) : 0; };
  const pin = p => { p = Math.round(+p); if (p >= 0 && p < B.nA && !(B.idx['D' + p] !== undefined && p >= 14)) { /* analogRead(0) = A0 */ } return pinName(B, p); };
  const pr = (x, f) => { if (typeof x === 'number' && f === undefined && !Number.isInteger(x)) return x.toFixed(2); if (typeof x === 'number' && f === 16) return x.toString(16).toUpperCase(); if (typeof x === 'number' && f === 2) return x.toString(2); if (typeof x === 'boolean') return x ? '1' : '0'; return String(x); };
  const ser = { begin() {}, end() {}, available: () => 0, read: () => -1, flush() {},
    print(x, f) { bd.line += pr(x, f); }, println(x, f) { bd.line += x === undefined ? '' : pr(x, f); bd.serial.push(bd.line); bd.line = ''; if (bd.serial.length > 200) bd.serial.splice(0, 100); }, write(x) { bd.line += typeof x === 'number' ? String.fromCharCode(x) : x; } };
  const api = {
    pinMode(p, m) { const n = pinName(B, p); if (bd.mode[n] !== m) bd.dirty = true; bd.mode[n] = m; if (m !== 1) bd.out[n] = 0; },
    digitalWrite(p, v) { const n = pinName(B, p); v = v ? 1 : 0; if (bd.mode[n] === 1) { if (bd.duty[n] !== v) bd.dirty = true; bd.out[n] = v; bd.duty[n] = v; } else { const m = v ? 2 : 0; if (bd.mode[n] !== m) bd.dirty = true; bd.mode[n] = m; } },
    digitalRead(p) { return rd(pinName(B, p)) > 2.5 ? 1 : 0; },
    analogRead(p) { p = Math.round(+p); const n = p < B.A0 ? 'A' + p : pinName(B, p); return Math.max(0, Math.min(1023, Math.round(rd(n) / 5 * 1023))); },
    analogWrite(p, v) { const n = pinName(B, p); v = Math.max(0, Math.min(255, Math.round(+v || 0))); const pw = B.pwm.includes(Math.round(+p)), nd = pw ? v / 255 : (v >= 128 ? 1 : 0); if (bd.mode[n] !== 1 || bd.duty[n] !== nd) bd.dirty = true; bd.mode[n] = 1; bd.duty[n] = nd; bd.out[n] = bd.duty[n] > 0 ? 1 : 0; },
    tone(p) { const n = pinName(B, p); bd.mode[n] = 1; bd.duty[n] = 0.5; bd.out[n] = 1; }, noTone(p) { const n = pinName(B, p); bd.duty[n] = 0; bd.out[n] = 0; },
    millis: () => Math.floor(bd.t), micros: () => Math.floor(bd.t * 1000),
    *delay(ms) { yield Math.max(0, +ms || 0); }, *delayMicroseconds(us) { yield Math.max(0, +us || 0) / 1000; },
    map: (x, a, b, c2, d2) => Math.trunc((x - a) * (d2 - c2) / (b - a) + c2), constrain: (x, a, b) => Math.min(b, Math.max(a, x)),
    random: (a, b) => b === undefined ? Math.floor(Math.random() * a) : Math.floor(a + Math.random() * (b - a)), randomSeed() {},
    abs: Math.abs, min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt, sq: x => x * x, sin: Math.sin, cos: Math.cos, tan: Math.tan, round: Math.round, floor: Math.floor, ceil: Math.ceil,
    int: x => Math.trunc(+x), float: x => +x, long: x => Math.trunc(+x), byte: x => Math.trunc(+x) & 255, word: x => Math.trunc(+x) & 65535, F: x => x,
    bitRead: (x, b) => (x >> b) & 1, bitWrite: (x, b, v) => v ? x | (1 << b) : x & ~(1 << b), bitSet: (x, b) => x | (1 << b), bitClear: (x, b) => x & ~(1 << b),
    Serial: ser, HIGH: 1, LOW: 0, INPUT: 0, OUTPUT: 1, INPUT_PULLUP: 2, LED_BUILTIN: 13, PI: Math.PI, HALF_PI: Math.PI / 2, TWO_PI: Math.PI * 2, DEG_TO_RAD: Math.PI / 180, RAD_TO_DEG: 180 / Math.PI, DEC: 10, HEX: 16, BIN: 2,
    __tick: () => (++ticks % 400) === 0,
  };
  for (let i = 0; i < 16; i++) api['A' + i] = B.A0 + i;
  try {
    const js = compile(E.sketchOf(c.it));
    const f = new Function('api', 'const {' + API.join(',') + '} = api;\n' + js + '\nreturn function* () { if (typeof setup === "function") yield* setup(); for (;;) { if (typeof loop === "function") yield* loop(); else yield 1000; yield 0; } };');
    bd.gen = f(api)();
  } catch (e) { bd.err = 'chyba v programu: ' + e.message; }
  return bd;
}
function runBoard(bd, tEnd) {
  if (!bd.gen || bd.err) return;
  let n = 0;
  try {
    while (bd.t < tEnd && n < 20000) {
      const r = bd.gen.next(); n++;
      if (r.done) { bd.gen = null; return; }
      bd.t += r.value > 0 ? r.value : 0.01;
    }
  } catch (e) { bd.err = 'chyba za běhu: ' + e.message; }
}

// ------------------------------------------------------------ simulace (uzlová metoda)
const VT = 0.02585, GMIN = 1e-9, ZIS = 1e-3, ZVC = VT * Math.log(VT / (Math.SQRT2 * ZIS)); // ZIS: ostrost průrazu Zenerovy diody
function pnjlim(vn, vo, vt, vc) {
  if (vn > vc && Math.abs(vn - vo) > 2 * vt) { if (vo > 0) { const a = 1 + (vn - vo) / vt; vn = a > 0 ? vo + vt * Math.log(a) : vc; } else vn = vt * Math.log(vn / vt); }
  return vn;
}
function dexp(x) { return x > 80 ? Math.exp(80) * (1 + x - 80) : Math.exp(x); }
function dexpD(x) { return x > 80 ? Math.exp(80) : Math.exp(x); }
const ledVf = it => (LEDC[parseInt(it.t[4]) || 0] || LEDC[0])[2];
const LED_N = 2;
const isOf = vf => 0.02 / Math.exp(vf / (LED_N * VT));
const LDR = [['světlo', 800], ['šero', 12000], ['tma', 300000]], NTC = [['20 °C', 20], ['50 °C', 50], ['90 °C', 90]];

E.start = function (st) {
  const comps = st.comps.filter(c => c.d.kind === 'el'); if (!comps.length) return null;
  const S = { comps, res: {}, sw: {}, pos: {}, lvl: {}, burnt: {}, capV: {}, indI: {}, relay: {}, gate: {}, jv: {}, V: new Map(), boards: [], events: [], live: [], vmax: 5, heat: {}, reg: {}, motor: {} };
  for (const c of comps) {
    const u = c.it.uid, sub = c.d.sub;
    if (sub === 'pot') S.pos[u] = 1 - Math.min(1, Math.max(0, si(c.it.t[7], 50) / 100));
    if (sub === 'board') S.boards.push(makeBoard(c));
    if (sub === 'bat' || sub === 'dc' || sub === 'sq' || sub === 'vcc') S.vmax = Math.max(S.vmax, si(c.it.t[6], sub === 'bat' ? 9 : 5));
  }
  return S;
};
E.press = function (st, c, down, latch, part) {
  const S = st.elec; if (!S) return false; const u = c.it.uid, sub = c.d.sub;
  if (sub === 'push' || sub === 'pushnc') { if (latch) { if (down) S.sw[u] = !S.sw[u]; } else S.sw[u] = down; return true; }
  if (!down) return ['toggle', 'spdt', 'reed', 'pot', 'ldr', 'ntc', 'fuse'].includes(sub);
  if (sub === 'toggle' || sub === 'spdt' || sub === 'reed') { S.sw[u] = !S.sw[u]; return true; }
  if (sub === 'pot') { S.pos[u] = Math.min(1, Math.max(0, Math.round(((S.pos[u] || 0) + (part === 0 ? -0.1 : 0.1)) * 10) / 10)); return true; }
  if (sub === 'ldr' || sub === 'ntc') { S.lvl[u] = ((S.lvl[u] || 0) + 1) % 3; return true; }
  if (sub === 'fuse') { if (S.burnt[u]) { S.burnt[u] = false; st.msg = 'Pojistka ' + (c.it.t[0] || '') + ' vyměněna.'; } return true; }
  return false;
};

function solveAll(st, S, dt) {
  const comps = S.comps, net = (c, i) => c.tn[i];
  // reference: zem, jinak záporný pól zdroje, jinak GND desky
  let ref;
  for (const c of comps) if (c.d.sub === 'gnd') { ref = net(c, 0); break; }
  if (ref === undefined) for (const c of comps) if (['bat', 'dc', 'sq'].includes(c.d.sub)) { ref = net(c, 1); break; }
  if (ref === undefined) for (const c of comps) if (c.d.sub === 'board') { ref = net(c, BOARDS[c.d.board].idx.GND); break; }
  if (ref === undefined) ref = net(comps[0], 0);
  // počet svorek v síti (nepřipojené piny desek se nepočítají)
  const cnt = new Map(); for (const c of comps) c.tn.forEach(n => cnt.set(n, (cnt.get(n) || 0) + 1));
  const idx = new Map(); let N = 0;
  const node = n => { if (n === undefined || n === ref) return -1; let k = idx.get(n); if (k === undefined) { k = N++; idx.set(n, k); } return k; };
  for (const c of comps) c.tn.forEach((n, i) => { if (c.d.sub !== 'board' || cnt.get(n) > 1 || n === ref) node(n); });
  for (const c of comps) if (c.d.sub === 'board') { const B = BOARDS[c.d.board]; for (const k of ['GND', '5V', '3V3']) if (B.idx[k] !== undefined) node(net(c, B.idx[k])); }
  const nd = n => n === undefined || n === ref ? -1 : idx.has(n) ? idx.get(n) : -2;
  const Vof = n => n === ref ? 0 : (S.V.get(n) || 0);
  const bds = new Map(S.boards.map(b => [b.c, b]));
  // propojení pro hledání plovoucích částí
  const par = Array.from({ length: N + 1 }, (_, i) => i), fd = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const R = i => i < 0 ? N : i, uni = (a, b) => { a = fd(R(a)); b = fd(R(b)); if (a !== b) par[a] = b; };
  const srcNodes = [];
  let A, b;
  const stampG = (na, nb, g) => { const a = nd(na), c2 = nd(nb); if (a === -2 || c2 === -2) return; if (a >= 0) A[a][a] += g; if (c2 >= 0) A[c2][c2] += g; if (a >= 0 && c2 >= 0) { A[a][c2] -= g; A[c2][a] -= g; } };
  const inj = (n, I) => { const k = nd(n); if (k >= 0) b[k] += I; };
  const vsrc = (np, nm, V, g) => { if (nd(np) === -2 || nd(nm) === -2) return; stampG(np, nm, g); inj(np, g * V); inj(nm, -g * V); };
  const leave = (row, coefs, K) => { const r = nd(row); if (r < 0) return; for (const [n, g] of coefs) { const k = nd(n); if (k >= 0) A[r][k] += g; } b[r] -= K; };
  const sw = (c, i) => !!S.sw[c.it.uid];
  // diskrétní stavy: hradla, relé, stabilizátor
  const passes = [];
  let ok = true;
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    const links = []; // [a, b, conductive]
    // --- Newton
    let conv = false;
    for (let iter = 0; iter < 120; iter++) {
      A = Array.from({ length: N }, () => new Float64Array(N)); b = new Float64Array(N);
      for (let k = 0; k < N; k++) A[k][k] += GMIN;
      const L = iter === 0; let djv = 0;
      const setJ = (k, v) => { djv = Math.max(djv, Math.abs(v - (S.jv[k] || 0))); S.jv[k] = v; };
      for (const c of comps) {
        const d = c.d, u = c.it.uid, t = c.it.t, n0 = net(c, 0), n1 = net(c, 1), sub = d.sub;
        const lk = (a, b2) => { if (L) links.push([a, b2]); };
        switch (sub) {
          case 'bat': case 'dc': case 'sq': { let V = si(t[6], sub === 'bat' ? 9 : 5); if (sub === 'sq') V = ((st.t * si(t[7], 1)) % 1) < 0.5 ? V : 0; vsrc(n0, n1, V, 1 / Math.max(1e-3, si(t[7], sub === 'bat' ? 0.5 : 0.05) * (sub === 'sq' ? 0 : 1) || 0.05)); lk(n0, n1); if (L) srcNodes.push(n0, n1); break; }
          case 'vcc': vsrc(n0, ref, si(t[6], 5), 100); lk(n0, ref); if (L) srcNodes.push(n0); break;
          case 'gnd': break;
          case 'vm': stampG(n0, n1, 1e-7); break;
          case 'am': stampG(n0, n1, 1000); lk(n0, n1); break;
          case 'res': if (!S.burnt[u]) { stampG(n0, n1, 1 / Math.max(1e-3, si(t[6], 1000))); lk(n0, n1); } break;
          case 'pot': { const Rt = Math.max(1, si(t[6], 10000)), p = S.pos[u] || 0; stampG(n0, net(c, 2), 1 / (Rt * p + 0.5)); stampG(net(c, 2), n1, 1 / (Rt * (1 - p) + 0.5)); lk(n0, net(c, 2)); lk(n1, net(c, 2)); break; }
          case 'ldr': stampG(n0, n1, 1 / LDR[S.lvl[u] || 0][1]); lk(n0, n1); break;
          case 'ntc': { const T = NTC[S.lvl[u] || 0][1] + 273.15; stampG(n0, n1, 1 / (si(t[6], 10000) * Math.exp(3950 * (1 / T - 1 / 298.15)))); lk(n0, n1); break; }
          case 'cap': case 'ecap': if (dt > 0) { const g = si(t[6], sub === 'cap' ? 1e-7 : 1e-3) / dt; stampG(n0, n1, g); inj(n0, g * (S.capV[u] || 0)); inj(n1, -g * (S.capV[u] || 0)); lk(n0, n1); } break;
          case 'ind': { const Rw = Math.max(0.01, si(t[7], 1)); if (dt > 0) { const g = 1 / (Rw + si(t[6], 0.01) / dt), Ip = S.indI[u] || 0, k = (si(t[6], 0.01) / dt) * g; stampG(n0, n1, g); inj(n0, -Ip * k); inj(n1, Ip * k); } else stampG(n0, n1, 1 / Rw); lk(n0, n1); break; }
          case 'fuse': if (!S.burnt[u]) { stampG(n0, n1, 20); lk(n0, n1); } break;
          case 'push': case 'toggle': case 'reed': if (sw(c)) { stampG(n0, n1, 100); lk(n0, n1); } break;
          case 'pushnc': if (!sw(c)) { stampG(n0, n1, 100); lk(n0, n1); } break;
          case 'spdt': { const o = net(c, sw(c) ? 2 : 1); stampG(n0, o, 100); lk(n0, o); break; }
          case 'relay': { const Un = si(t[6], 5); stampG(n0, n1, 0.36 / (Un * Un) || 0.01); lk(n0, n1); const o = net(c, S.relay[u] ? 4 : 3); stampG(net(c, 2), o, 100); lk(net(c, 2), o); break; }
          case 'lamp': { const Un = si(t[6], 6), P = si(t[7], 0.6); stampG(n0, n1, P / (Un * Un)); lk(n0, n1); break; }
          case 'buzz': stampG(n0, n1, 1 / 250); lk(n0, n1); break;
          case 'motor': stampG(n0, n1, 1 / Math.max(0.5, si(t[7], 20))); lk(n0, n1); break;
          case 'diode': case 'zener': case 'led': case 'seg7': case 'rgb': {
            const parts = sub === 'seg7' ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => it7(c, i)) : sub === 'rgb' ? [[0, 3, 1.9, 'r'], [1, 3, 3.0, 'g'], [2, 3, 3.0, 'b']].map(([a, k, vf, key]) => [net(c, a), net(c, k), vf, key]) : [[n0, n1, sub === 'led' ? ledVf(c.it) : 0, 'd']];
            if (S.burnt[u]) break;
            for (const [na, nk, vf, key] of parts) {
              const Is = sub === 'diode' || sub === 'zener' ? 2.5e-9 : isOf(vf), n = sub === 'diode' || sub === 'zener' ? 1.75 : LED_N, nvt = n * VT, vc = nvt * Math.log(nvt / (Math.SQRT2 * Is));
              const jk = u + key, vo = S.jv[jk] || 0; let v = Vof(na) - Vof(nk);
              let I, g;
              if (sub === 'zener') {
                const Vz = si(t[6], 5.1);
                if (v < -Vz + 0.5) { const w = pnjlim(-v - Vz, -vo - Vz, VT, ZVC); v = -w - Vz; } else v = pnjlim(v, vo, nvt, vc);
                const ef = dexp(v / nvt), er = dexp((-v - Vz) / VT);
                I = Is * (ef - 1) - ZIS * (er - Math.exp(-Vz / VT)); g = Is / nvt * dexpD(v / nvt) + ZIS / VT * dexpD((-v - Vz) / VT);
              } else { v = pnjlim(v, vo, nvt, vc); I = Is * (dexp(v / nvt) - 1); g = Is / nvt * dexpD(v / nvt); }
              I += GMIN * v; g += GMIN; setJ(jk, v);
              stampG(na, nk, g); inj(na, -(I - g * v)); inj(nk, I - g * v); lk(na, nk);
            }
            break;
          }
          case 'npn': case 'pnp': {
            if (S.burnt[u]) break;
            const p = sub === 'npn' ? 1 : -1, nC = sub === 'npn' ? net(c, 0) : net(c, 2), nB = net(c, 1), nE = sub === 'npn' ? net(c, 2) : net(c, 0);
            const bf = Math.max(1, si(t[6], 200)), br = 2, Is = 1e-14, vc = VT * Math.log(VT / (Math.SQRT2 * Is));
            let vbe = p * (Vof(nB) - Vof(nE)), vbc = p * (Vof(nB) - Vof(nC));
            vbe = pnjlim(vbe, S.jv[u + 'be'] || 0, VT, vc); vbc = pnjlim(vbc, S.jv[u + 'bc'] || 0, VT, vc); setJ(u + 'be', vbe); setJ(u + 'bc', vbc);
            const ebe = dexp(vbe / VT), ebc = dexp(vbc / VT), dbe = Is / VT * dexpD(vbe / VT), dbc = Is / VT * dexpD(vbc / VT);
            const Ic = Is * (ebe - ebc) - Is / br * (ebc - 1), Ib = Is / bf * (ebe - 1) + Is / br * (ebc - 1);
            const gcbe = dbe, gcbc = -dbc - dbc / br, gbbe = dbe / bf, gbbc = dbc / br;
            // proud opouštějící uzel do prvku: sgn·p·(I0 + ge·(vbe−vbe0) + gc·(vbc−vbc0)), vbe = p(Vb−Ve), vbc = p(Vb−Vc)
            const row = (nr, I0, ge, gc, sg) => leave(nr, [[nB, sg * (ge + gc)], [nE, -sg * ge], [nC, -sg * gc]], sg * p * (I0 - ge * vbe - gc * vbc));
            row(nC, Ic, gcbe, gcbc, 1); row(nB, Ib, gbbe, gbbc, 1); row(nE, Ic + Ib, gcbe + gbbe, gcbc + gbbc, -1);
            stampG(nC, nE, GMIN); lk(nB, nE); lk(nC, nE);
            break;
          }
          case 'nmos': {
            if (S.burnt[u]) break;
            const nD = net(c, 0), nG = net(c, 1), nS = net(c, 2), Vth = si(t[6], 2), K = 0.5, lam = 0.01;
            let vd = Vof(nD), vs = Vof(nS), sgn = 1; if (vd < vs) { const x = vd; vd = vs; vs = x; sgn = -1; }
            const a = sgn > 0 ? nD : nS, s2 = sgn > 0 ? nS : nD;
            let vgs = Vof(nG) - vs; const vds = vd - vs, vo = S.jv[u + 'gs']; if (vo !== undefined) vgs = vo + Math.max(-1, Math.min(1, vgs - vo)); setJ(u + 'gs', vgs);
            let Id = 0, gm = 0, gds = 0; const vov = vgs - Vth;
            if (vov > 0) { if (vds < vov) { Id = K * (vov * vds - vds * vds / 2) * (1 + lam * vds); gm = K * vds * (1 + lam * vds); gds = K * (vov - vds) * (1 + lam * vds) + K * (vov * vds - vds * vds / 2) * lam; } else { Id = K / 2 * vov * vov * (1 + lam * vds); gm = K * vov * (1 + lam * vds); gds = K / 2 * vov * vov * lam; } }
            const K0 = Id - gm * vgs - gds * vds;
            leave(a, [[nG, gm], [s2, -gm - gds], [a, gds]], K0); leave(s2, [[nG, -gm], [s2, gm + gds], [a, -gds]], -K0);
            stampG(nD, nS, GMIN); stampG(nG, nS, 1e-12); lk(nD, nS);
            break;
          }
          case 'reg': { const nI = net(c, 0), nG = net(c, 1), nO = net(c, 2), r = S.reg[u] || (S.reg[u] = { V: 0, I: 0 }); vsrc(nO, nG, r.V, 5); inj(nI, -r.I); inj(nG, r.I); stampG(nI, nG, 1e-4); lk(nO, nG); lk(nI, nG); if (L) srcNodes.push(nO); break; }
          case 'gate': { const g = S.gate[u] || 0, nO = net(c, d.nin); vsrc(nO, ref, g ? 5 : 0, 1 / 50); for (let i = 0; i < d.nin; i++) stampG(net(c, i), ref, 1e-6); lk(nO, ref); if (L) srcNodes.push(nO); break; }
          case 'board': {
            const B = BOARDS[d.board], bd = bds.get(c), gnd = net(c, B.idx.GND), v5 = net(c, B.idx['5V']), v33 = net(c, B.idx['3V3']);
            vsrc(v5, gnd, 5, 10); lk(v5, gnd); if (v33 !== undefined) { vsrc(v33, gnd, 3.3, 1); lk(v33, gnd); }
            for (const gi of B.pins.map((p, i) => p.n === 'GND' ? i : -1).filter(i => i >= 0)) { stampG(net(c, gi), gnd, 1000); lk(net(c, gi), gnd); }
            if (L) srcNodes.push(v5, gnd);
            for (const p of B.pins) {
              if (!/^[DA]\d+$/.test(p.n)) continue; const n = net(c, B.idx[p.n]); if (nd(n) === -2) continue;
              const m = bd ? bd.mode[p.n] : 0;
              if (m === 1) { vsrc(n, gnd, 5 * (bd.duty[p.n] !== undefined ? bd.duty[p.n] : bd.out[p.n] || 0), 1 / 25); lk(n, gnd); }
              else if (m === 2) { vsrc(n, gnd, 5, 1 / 35000); lk(n, gnd); }
              else stampG(n, gnd, 1e-8);
            }
            break;
          }
        }
      }
      if (L) { for (const [a, b2] of links) if (nd(a) !== -2 && nd(b2) !== -2) uni(nd(a), nd(b2)); }
      // plovoucí části: přivázat k referenci přes místní „zem“
      if (L) {
        const live = new Set(); for (const n of srcNodes) if (nd(n) !== -2) live.add(fd(R(nd(n))));
        S._live = live; S._fd = n => nd(n) === -2 ? -1 : fd(R(nd(n)));
        S._ties = []; const seen = new Set([fd(N)]);
        for (const c of comps) { let n = null; if (['bat', 'dc', 'sq'].includes(c.d.sub)) n = net(c, 1); else if (c.d.sub === 'board') n = net(c, BOARDS[c.d.board].idx.GND); if (n === null || nd(n) === -2) continue; const r = fd(R(nd(n))); if (!seen.has(r)) { seen.add(r); S._ties.push(n); } }
      }
      for (const n of S._ties) { const k = nd(n); if (k >= 0) A[k][k] += 1; }
      // řešení (Gauss s výběrem hlavního prvku)
      const x = gauss(A, b, N); if (!x) { ok = false; break; }
      let dv = 0; for (const [n, k] of idx) { const nv = x[k]; dv = Math.max(dv, Math.abs(nv - (S.V.get(n) || 0))); S.V.set(n, nv); }
      if (dv < 1e-7 && djv < 1e-7 && iter > 0) { conv = true; break; }
    }
    // --- výsledky a diskrétní stavy
    for (const c of comps) {
      const d = c.d, u = c.it.uid;
      if (d.sub === 'gate') {
        const iv = []; for (let i = 0; i < d.nin; i++) iv.push(Vof(net(c, i)) - Vof(ref) > 2.5);
        const a = iv[0], b2 = iv[1]; let o = { not: !a, and: a && b2, or: a || b2, nand: !(a && b2), nor: !(a || b2), xor: a !== b2 }[d.fn];
        o = o ? 1 : 0; if (o !== (S.gate[u] || 0)) { S.gate[u] = o; changed = true; } S.res[u] = { in: iv, out: !!o };
      } else if (d.sub === 'relay') {
        const Uc = Math.abs(Vof(net(c, 0)) - Vof(net(c, 1))), Un = si(c.it.t[6], 5), was = !!S.relay[u], now = was ? Uc > 0.4 * Un : Uc > 0.7 * Un;
        if (now !== was) { S.relay[u] = now; changed = true; }
      } else if (d.sub === 'reg') {
        const r = S.reg[u], vi = Vof(net(c, 0)) - Vof(net(c, 1)), tv = Math.max(0, Math.min(5, vi - 2)), io = Math.max(0, 5 * (r.V - (Vof(net(c, 2)) - Vof(net(c, 1)))));
        if (Math.abs(tv - r.V) > 0.005 || Math.abs(io - r.I) > 1e-5) { r.V = tv; r.I = io; changed = true; }
      }
    }
    if (!changed) break;
  }
  S.ref = ref; S.ok = ok;
}
function it7(c, i) { const ca = c.it.t[4] === '1'; return ca ? [c.tn[8], c.tn[i], 1.8, 's' + i] : [c.tn[i], c.tn[8], 1.8, 's' + i]; }
function gauss(A, b, n) {
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    if (Math.abs(A[p][i]) < 1e-30) return null;
    if (p !== i) { const t = A[i]; A[i] = A[p]; A[p] = t; const tb = b[i]; b[i] = b[p]; b[p] = tb; }
    const ai = A[i], piv = ai[i];
    for (let r = i + 1; r < n; r++) { const ar = A[r], f = ar[i] / piv; if (!f) continue; for (let k = i; k < n; k++) ar[k] -= f * ai[k]; b[r] -= f * b[i]; }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; const ai = A[i]; for (let k = i + 1; k < n; k++) s -= ai[k] * x[k]; x[i] = s / ai[i]; }
  return x;
}

E.step = function (st, dt) {
  const S = st.elec; if (!S) return;
  // programy desek běží do aktuálního času simulace
  for (const bd of S.boards) {
    const B = bd.B; bd.read = n => { const i = B.idx[n]; if (i === undefined) return 0; return (S.V.get(bd.c.tn[i]) || 0) - (S.V.get(bd.c.tn[B.idx.GND]) || 0) + (bd.c.tn[i] === S.ref ? 0 : 0); };
    bd.resolve = () => solveAll(st, S, dt);
    runBoard(bd, st.t * 1000);
  }
  solveAll(st, S, dt);
  const Vn = n => n === S.ref ? 0 : (S.V.get(n) || 0);
  const live = [], ev = (k, s) => { if (!S.events.includes(s)) S.events.push(s); };
  for (const c of S.comps) {
    const d = c.d, u = c.it.uid, t = c.it.t, a = c.tn[0], b = c.tn[1], V = Vn(a) - Vn(b), nm = t[0] || d.name;
    let r = S.res[u] || {}; r.V = V;
    switch (d.sub) {
      case 'res': { const R = si(t[6], 1000); r.I = S.burnt[u] ? 0 : V / R; r.P = V * V / R * (S.burnt[u] ? 0 : 1); const Pn = si(t[8], 0.25); r.burnt = !!S.burnt[u];
        if (r.P > 4 * Pn && !S.burnt[u]) { S.burnt[u] = true; ev(u, 'Rezistor ' + nm + ' shořel: ' + fmt(r.P, 'W') + ' při zatížitelnosti ' + fmt(Pn, 'W') + '.'); }
        else if (r.P > Pn) live.push(nm + ' se přehřívá (' + fmt(r.P, 'W') + ' > ' + fmt(Pn, 'W') + ')'); break; }
      case 'bat': case 'dc': case 'sq': { const Ri = Math.max(1e-3, si(t[7], d.sub === 'bat' ? 0.5 : 0.05)); let U0 = si(t[6], d.sub === 'bat' ? 9 : 5); if (d.sub === 'sq') U0 = ((st.t * si(t[7], 1)) % 1) < 0.5 ? U0 : 0; r.I = d.sub === 'sq' ? (U0 - V) * 20 : (U0 - V) / Ri; if (Math.abs(r.I) > 3) live.push('ZKRAT zdroje ' + nm + ' (' + fmt(Math.abs(r.I), 'A') + ')'); break; }
      case 'am': r.I = V * 1000; break;
      case 'pot': r.pos = S.pos[u] || 0; break;
      case 'ldr': r.lvlName = LDR[S.lvl[u] || 0][0]; break;
      case 'ntc': r.lvlName = NTC[S.lvl[u] || 0][0]; break;
      case 'cap': case 'ecap': if (dt > 0) S.capV[u] = V; if (d.sub === 'ecap') { r.bad = V < -1; if (r.bad) live.push('Elektrolytický kondenzátor ' + nm + ' je přepólovaný!'); if (V > si(t[8], 16) * 1.05) live.push(nm + ': napětí ' + fmt(V, 'V') + ' je nad jmenovitým ' + fmt(si(t[8], 16), 'V')); } break;
      case 'ind': if (dt > 0) { const Rw = Math.max(0.01, si(t[7], 1)), L = si(t[6], 0.01), g = 1 / (Rw + L / dt); S.indI[u] = g * V + (L / dt) * g * (S.indI[u] || 0); } r.I = S.indI[u] || 0; break;
      case 'fuse': { r.I = S.burnt[u] ? 0 : V * 20; r.burnt = !!S.burnt[u]; const In = si(t[6], 0.5), x = Math.abs(r.I) / In; S.heat[u] = Math.max(0, (S.heat[u] || 0) + dt * (x > 1 ? x * x - 1 : -1));
        if (!S.burnt[u] && (x > 4 || S.heat[u] > 1)) { S.burnt[u] = true; ev(u, 'Pojistka ' + nm + ' se přepálila (' + fmt(Math.abs(r.I), 'A') + ' při jmenovitých ' + fmt(In, 'A') + '). Klik = výměna.'); } break; }
      case 'push': case 'toggle': case 'reed': r.on = !!S.sw[u]; break;
      case 'pushnc': r.on = !!S.sw[u]; break;
      case 'spdt': r.on = !!S.sw[u]; break;
      case 'relay': r.on = !!S.relay[u]; r.I = V * 0.36 / Math.pow(si(t[6], 5), 2); break;
      case 'lamp': { const Un = si(t[6], 6), P = si(t[7], 0.6), Pa = V * V * P / (Un * Un); r.P = Pa; r.I = V * P / (Un * Un); r.bright = Math.min(1.4, Pa / P); if (Pa > 2.2 * P && !S.burnt[u]) live.push('Žárovka ' + nm + ' je přetížená (' + fmt(Math.abs(V), 'V') + ' místo ' + fmt(Un, 'V') + ')'); break; }
      case 'buzz': r.on = Math.abs(V) > 0.4 * si(t[6], 5); r.I = V / 250; break;
      case 'motor': { const Un = si(t[6], 6), m = S.motor[u] || (S.motor[u] = { rpm: 0, ang: 0 }); const target = Math.abs(V) > 0.15 * Un ? 3000 * V / Un : 0; m.rpm += (target - m.rpm) * Math.min(1, dt * 3); m.ang += m.rpm / 60 * 2 * Math.PI * dt * 0.15; r.rpm = m.rpm; r.ang = m.ang; r.I = V / Math.max(0.5, si(t[7], 20)); break; }
      case 'diode': case 'zener': case 'led': {
        const Is = d.sub === 'led' ? isOf(ledVf(c.it)) : 2.5e-9, nvt = (d.sub === 'led' ? LED_N : 1.75) * VT;
        let I = S.burnt[u] ? 0 : Is * (dexp(V / nvt) - 1); if (d.sub === 'zener' && !S.burnt[u]) I -= ZIS * (dexp((-V - si(t[6], 5.1)) / VT) - Math.exp(-si(t[6], 5.1) / VT));
        r.I = I; r.bright = d.sub === 'led' ? Math.max(0, Math.min(1.3, I / 0.015)) : 0; r.burnt = !!S.burnt[u];
        const lim = d.sub === 'led' ? 0.06 : d.sub === 'zener' ? 0.5 / Math.max(1, si(t[6], 5.1)) * 1.5 : 0.6;
        if (!S.burnt[u] && Math.abs(I) > lim) { S.burnt[u] = true; ev(u, (d.sub === 'led' ? 'LED ' : 'Dioda ') + nm + ' se spálila (' + (Math.abs(I) > 100 ? 'obrovský proud' : fmt(Math.abs(I), 'A')) + ', max. ' + (d.sub === 'led' ? '20 mA' : fmt(lim / 1.5, 'A')) + ')' + (d.sub === 'led' ? ' – zapojte předřadný rezistor (např. 220 Ω).' : '.')); }
        if (d.sub === 'led' && !S.burnt[u] && I > 0.03) live.push('LED ' + nm + ': ' + fmt(I, 'A') + ' je víc než 20 mA – zvětšete rezistor');
        break;
      }
      case 'seg7': case 'rgb': {
        const parts = d.sub === 'seg7' ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => it7(c, i)) : [[c.tn[0], c.tn[3], 1.9], [c.tn[1], c.tn[3], 3.0], [c.tn[2], c.tn[3], 3.0]];
        const I = parts.map(([na, nk, vf]) => S.burnt[u] ? 0 : isOf(vf) * (dexp((Vn(na) - Vn(nk)) / (LED_N * VT)) - 1));
        if (I.some(x => x > 0.06) && !S.burnt[u]) { S.burnt[u] = true; ev(u, (d.sub === 'seg7' ? 'Displej ' : 'RGB LED ') + nm + ' se spálil(a) – každý segment / barva potřebuje vlastní rezistor.'); }
        if (d.sub === 'seg7') { r.seg = {}; ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'].forEach((k, i) => { r.seg[k] = I[i] > 0.001; }); } else r.rgb = I.map(x => Math.max(0, Math.min(1, x / 0.012)));
        r.burnt = !!S.burnt[u]; break;
      }
      case 'npn': case 'pnp': case 'nmos': {
        const p = d.sub === 'pnp' ? -1 : 1, nC = c.tn[d.sub === 'pnp' ? 2 : 0], nB = c.tn[1], nE = c.tn[d.sub === 'pnp' ? 0 : 2];
        if (d.sub === 'nmos') { r.Vgs = Vn(nB) - Vn(nE); r.Vds = Vn(nC) - Vn(nE); const vov = r.Vgs - si(t[6], 2); r.on = vov > 0; r.I = !r.on ? 0 : r.Vds < vov ? 0.5 * (vov * r.Vds - r.Vds * r.Vds / 2) : 0.25 * vov * vov; }
        else { const vbe = p * (Vn(nB) - Vn(nE)), vbc = p * (Vn(nB) - Vn(nC)), bf = si(t[6], 200); r.Ic = 1e-14 * (dexp(vbe / VT) - dexp(vbc / VT)) - 1e-14 / 2 * (dexp(vbc / VT) - 1); r.Ib = 1e-14 / bf * (dexp(vbe / VT) - 1) + 1e-14 / 2 * (dexp(vbc / VT) - 1); r.Vbe = vbe; r.Vce = p * (Vn(nC) - Vn(nE)); r.I = r.Ic; r.on = r.Ic > 1e-4; r.sat = r.on && r.Vce < 0.3; }
        if (!S.burnt[u] && Math.abs(r.I) > (d.sub === 'nmos' ? 10 : 0.5)) { S.burnt[u] = true; ev(u, 'Tranzistor ' + nm + ' se zničil (' + fmt(Math.abs(r.I), 'A') + ').'); }
        r.burnt = !!S.burnt[u]; break;
      }
      case 'board': {
        const bd = S.boards.find(x => x.c === c), B = BOARDS[d.board], gnd = Vn(c.tn[B.idx.GND]);
        r.pins = {}; for (const p of B.pins) { if (!/^[DA]\d+$/.test(p.n)) continue; const m = bd.mode[p.n], v = Vn(c.tn[B.idx[p.n]]) - gnd; r.pins[p.n] = { out: m === 1, v: m === 1 ? (bd.duty[p.n] !== undefined ? bd.duty[p.n] : bd.out[p.n] || 0) : v / 5, V: v, pull: m === 2 };
          if (m === 1) { const I = (5 * r.pins[p.n].v - v) / 25; r.pins[p.n].I = I; if (Math.abs(I) > 0.04) live.push(nm + ': pin ' + p.n + ' je přetížený (' + fmt(Math.abs(I), 'A') + ', max. 40 mA) – chybí rezistor?'); } }
        r.serial = bd.serial.concat(bd.line ? [bd.line] : []); r.err = bd.err; if (bd.err) live.push(nm + ': ' + bd.err);
        break;
      }
    }
    S.res[u] = r;
  }
  S.live = live;
  const msg = live[0] || S.events[S.events.length - 1];
  if (msg) st.msg = msg;
};

// barva vodiče podle napětí (0 V modře → nejvyšší napětí červeně), plovoucí šedě
E.wireStyle = function (sim, net) {
  const S = sim.elec; if (!S || !S.V || net === undefined) return null;
  const known = net === S.ref || S.V.has(net); if (!known) return null;
  const live = S._live && S._fd && S._live.has(S._fd(net));
  if (!live) return ['#a8a8ae', 0.32];
  const v = net === S.ref ? 0 : S.V.get(net) || 0, x = Math.max(0, Math.min(1, v / (S.vmax || 5)));
  return ['hsl(' + Math.round(225 * (1 - x)) + ',78%,' + Math.round(42 + 6 * x) + '%)', 0.55];
};
E.netV = (sim, net) => { const S = sim.elec; if (!S || net === undefined) return null; if (net === S.ref) return 0; return S.V.has(net) ? S.V.get(net) : null; };
// popis pro najetí myší v simulaci
E.probe = function (sim, it) {
  const S = sim.elec; if (!S) return ''; const d = ES.getDef(it.type), r = S.res[it.uid]; if (!r) return '';
  const nm = (it.t[0] || d.name) + ': ', U = fmt(Math.abs(r.V || 0), 'V'), I = r.I !== undefined ? fmt(Math.abs(r.I), 'A') : '';
  switch (d.sub) {
    case 'res': return nm + fmt(si(it.t[6], 1000), 'Ω') + ', U = ' + U + ', I = ' + I + ', P = ' + fmt(r.P || 0, 'W') + (r.burnt ? ' – SHOŘEL' : '');
    case 'led': case 'diode': case 'zener': return nm + 'U = ' + U + ', I = ' + I + (r.burnt ? ' – SPÁLENÁ' : d.sub === 'led' ? (r.bright > 0.05 ? ' – svítí' : ' – nesvítí') : '');
    case 'bat': case 'dc': case 'sq': return nm + 'svorkové napětí ' + U + ', odebíraný proud ' + I;
    case 'vm': return nm + 'voltmetr ukazuje ' + fmt(r.V, 'V', 2);
    case 'am': return nm + 'ampérmetr ukazuje ' + fmt(r.I, 'A', 2);
    case 'pot': return nm + 'jezdec ' + Math.round((1 - r.pos) * 100) + ' % (klik do horní / dolní poloviny = posun jezdce)';
    case 'ldr': return nm + r.lvlName + ' (klik = změna osvětlení), U = ' + U;
    case 'ntc': return nm + r.lvlName + ' (klik = změna teploty), U = ' + U;
    case 'cap': case 'ecap': return nm + 'nabitý na ' + fmt(r.V, 'V', 2);
    case 'npn': case 'pnp': return nm + 'U_BE = ' + fmt(r.Vbe || 0, 'V') + ', U_CE = ' + fmt(r.Vce || 0, 'V') + ', I_B = ' + fmt(Math.abs(r.Ib || 0), 'A') + ', I_C = ' + fmt(Math.abs(r.Ic || 0), 'A') + (r.burnt ? ' – ZNIČEN' : r.sat ? ' – sepnutý (saturace)' : r.on ? ' – zesiluje' : ' – zavřený');
    case 'nmos': return nm + 'U_GS = ' + fmt(r.Vgs || 0, 'V') + ', U_DS = ' + fmt(r.Vds || 0, 'V') + ', I_D = ' + fmt(Math.abs(r.I || 0), 'A') + (r.on ? ' – otevřený' : ' – zavřený');
    case 'relay': return nm + 'cívka ' + U + (r.on ? ' – přitaženo (COM–NO)' : ' – odpadlo (COM–NC)');
    case 'lamp': return nm + U + ', ' + I + ', ' + fmt(r.P || 0, 'W');
    case 'motor': return nm + U + ', ' + I + ', ' + Math.round(r.rpm || 0) + ' ot/min';
    case 'fuse': return nm + I + (r.burnt ? ' – PŘEPÁLENÁ (klik = výměna)' : '');
    case 'gate': return nm + 'vstupy ' + r.in.map(x => x ? 1 : 0).join(', ') + ' → výstup ' + (r.out ? 1 : 0);
    case 'board': { const ps = Object.entries(r.pins || {}).filter(([, p]) => p.out || p.pull || p.V > 0.3).slice(0, 12).map(([n, p]) => n + (p.out ? (p.v > 0 && p.v < 1 ? ' PWM ' + Math.round(p.v * 100) + ' %' : p.v ? '=1' : '=0') : ' vstup ' + fmt(p.V, 'V'))); return nm + (r.err ? '⚠ ' + r.err : (ps.join(', ') || 'žádný pin není použit') + (r.serial.length ? ' | Serial: ' + r.serial[r.serial.length - 1] : '')); }
    case 'push': case 'pushnc': case 'toggle': case 'spdt': case 'reed': return nm + (r.on ? 'sepnuto' : 'rozepnuto') + (d.sub === 'push' || d.sub === 'pushnc' ? ' (Shift = držet stisknuté)' : '');
    default: return nm + 'U = ' + U + (I ? ', I = ' + I : '');
  }
};

ES.Elec = E;
})(typeof window !== 'undefined' ? window : globalThis);
