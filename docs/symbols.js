// ElectroSchool – kreslení značek (IEC) na canvas. Jednotky = jednotky schématu (mřížka 3).
(function (root) {
'use strict';
const ES = root.ES;
const INK = '#1d1d1f', WIRE_IDLE = '#1d1d1f', LIVE_FILL = '#ffd84a';
const POT_COLOR = { 1: '#a0522d', 2: '#111111', 4: '#7d7d7d', 8: '#1e6fd9', 16: '#2e9e3e', 32: '#d92b2b', 64: '#274b9f' };
const LAMP = ['#e53935', '#2eaf3c', '#f5c518', '#2b7fff', '#f2f2f2', '#ff8a00'];
const LAMP_NAME = ['červená', 'zelená', 'žlutá', 'modrá', 'bílá', 'oranžová'];

const SEC_COLOR = '#8e44ad'; // sekundár transformátoru
function potColor(p, blink) {
  if (!p) return '#9a9a9a';
  if (ES.shorted(p)) return blink ? '#ff0000' : '#ffb000'; // různé potenciály v jedné síti = zkrat
  for (const b of [1, 2, 4, 32]) if (p & b) return POT_COLOR[b];
  if (p & ~(127 | ES.TZ)) return SEC_COLOR;
  if (p & (8 | ES.TZ)) return POT_COLOR[8];
  return POT_COLOR[p & 64 ? 64 : 16];
}
// potenciál uzlu, který je pod napětím jen přes zátěž (např. mezi dvěma žárovkami v sérii)
function viaColor(v) {
  for (const b of [1, 2, 4]) { const f = ES.PHASOR[b]; if (Math.hypot(v[0] - f[0], v[1] - f[1]) < 25) return POT_COLOR[b]; }
  return '#b04fc4';
}
const fmtV = v => !(v > 0.05) ? '0 V' : (v >= 100 ? String(Math.round(v)) : v.toFixed(1).replace('.', ',')) + ' V';
const fmtA = v => !(v > 0.0005) ? '0 A' : v < 0.1 ? Math.round(v * 1000) + ' mA' : (v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3)).replace('.', ',') + ' A';
// proud a zahřátí tepelné spouště vedle prvku
function currentText(S, T, x, y) {
  if (!S.sim || !S.meas) return;
  const m = S.meas, hot = m.heat > 0.02;
  T.push([x, y, fmtA(m.I) + (hot ? '  ' + Math.round(Math.min(1, m.heat) * 100) + ' %' : ''), 2.2, 'left', m.heat >= 1 ? '#d92b2b' : hot ? '#c25400' : '#555']);
}
function colorref(v) { return 'rgb(' + (v & 255) + ',' + ((v >> 8) & 255) + ',' + ((v >> 16) & 255) + ')'; }

function line(c, a, b, d, e) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }
function dashed(c, a, b, d, e) { c.save(); c.setLineDash([0.9, 0.7]); c.lineWidth *= 0.7; line(c, a, b, d, e); c.restore(); }

// jeden pól kontaktu; conducts = právě vede, nc = v klidu sepnutý
function pole(c, x, conducts, nc) {
  line(c, x, 0, x, 3.5); line(c, x, 8.5, x, 12);
  if (nc) { line(c, x, 3.5, x + 2.1, 3.5); if (conducts) line(c, x, 8.5, x + 2.3, 2.9); else line(c, x, 8.5, x - 2.9, 3.6); }
  else if (conducts) line(c, x, 8.5, x, 3.5); else line(c, x, 8.5, x - 2.9, 3.6);
}

// zádržná západka (aretace) na mechanické vazbě – EN 60617 02-12
function latch(c, x) { c.beginPath(); c.moveTo(x - 0.9, 6); c.lineTo(x, 7.4); c.lineTo(x + 0.9, 6); c.stroke(); }
// ovládání ručně (obecně) – příčka na konci vazby, EN 60617 02-13-01
function manual(c, x) { line(c, x, 4.4, x, 7.6); }
const SYM = {
  supply(c, it, d, S, T) {
    d.pots.forEach((p, i) => {
      const x = i * 6; line(c, x, 0, x, -3); c.beginPath(); c.arc(x, -4, 1, 0, 7); c.stroke();
      T.push([x, -7, ES.POT_NAME[ES.POT[p]], 2.4, 'center', S.sim ? POT_COLOR[ES.POT[p]] : INK]);
    });
    T.push([-3, -4, it.t[0], 2.4, 'right']);
  },
  contactor(c, it, d, S, T) {
    const on = S.act;
    for (let i = 0; i < d.n; i++) { pole(c, i * 6, on, false); c.beginPath(); c.arc(i * 6, 3.5, 0.9, Math.PI, 0, true); c.stroke(); }
    if (d.n > 1) dashed(c, -1.4, 6, (d.n - 1) * 6 - 1.4, 6);
    T.push([-3.6, 6.5, it.t[0], 2.4, 'right']);
  },
  mswitch(c, it, d, S, T) {
    const on = S.act;
    for (let i = 0; i < d.n; i++) { const x = i * 6; pole(c, x, on, false); line(c, x - 1, 3.5, x + 1, 3.5); c.beginPath(); c.arc(x, 2.8, 0.6, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke(); } // odpínač: příčka + kroužek (EN 60617 07-13-08)
    dashed(c, -6, 6, (d.n - 1) * 6 - 1.4, 6); manual(c, -6);
    T.push([-7.5, 6.5, it.t[0], 2.4, 'right']);
  },
  fuse(c, it, d, S, T) {
    for (let i = 0; i < d.n; i++) { const x = i * 6; line(c, x, 0, x, 12); c.fillStyle = S.act ? '#ffc9c2' : '#fff'; c.fillRect(x - 1.1, 3, 2.2, 6); c.strokeRect(x - 1.1, 3, 2.2, 6);
      if (S.act) { c.fillStyle = '#fff'; c.fillRect(x - 0.6, 5, 1.2, 2); line(c, x, 3, x, 5); line(c, x, 7, x, 9); c.save(); c.strokeStyle = '#d92b2b'; line(c, x - 1.6, 7.2, x + 1.6, 4.8); c.restore(); } else line(c, x, 3, x, 9); }
    T.push([-3.6, 6.5, it.t[0], 2.4, 'right']);
  },
  breaker(c, it, d, S, T) {
    const on = S.act;
    for (let i = 0; i < d.n; i++) {
      const x = i * 6; pole(c, x, on, false);
      line(c, x - 0.9, 2.6, x + 0.9, 4.4); line(c, x - 0.9, 4.4, x + 0.9, 2.6);
      c.fillStyle = '#fff'; c.fillRect(x - 2.4, 12, 4.8, 6); c.strokeRect(x - 2.4, 12, 4.8, 6);
      c.beginPath(); c.moveTo(x - 1.4, 13.2); c.lineTo(x - 1.4, 14.6); c.lineTo(x + 1.4, 14.6); c.lineTo(x + 1.4, 13.2); c.stroke(); // tepelná spoušť
      c.beginPath(); c.moveTo(x - 1.3, 16.8); c.lineTo(x + 0.4, 16.8); c.lineTo(x + 0.4, 15.6); c.lineTo(x + 1.5, 16.2); c.stroke();  // zkratová spoušť
      line(c, x, 18, x, 21);
    }
    dashed(c, -6, 6, (d.n - 1) * 6 - 1.4, 6); dashed(c, -6, 6, -6, 15); dashed(c, -6, 15, -2.4, 15);
    T.push([-7.5, 6.5, it.t[0], 2.4, 'right']);
    if (d.kind === 'mstarter') { T.push([-7.5, 9.6, 'Ir ' + (it.t[8] || '–') + ' A', 2, 'right', '#555']); currentText(S, T, (d.n - 1) * 6 + 3.5, 15); }
  },
  rcd(c, it, d, S, T) {
    const on = S.act, w = (d.n - 1) * 6;
    for (let i = 0; i < d.n; i++) { const x = i * 6; pole(c, x, on, false); line(c, x, 12, x, 21); }
    // součtový transformátor (toroid) přes všechny vodiče
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(w / 2, 15, w / 2 + 2.6, 1.9, 0, 0, 7); c.fill(); c.stroke();
    for (let i = 0; i < d.n; i++) line(c, i * 6, 12, i * 6, 21);
    dashed(c, -6, 6, w - 1.4, 6); dashed(c, -6, 6, -6, 15); dashed(c, -6, 15, -2.6, 15);
    T.push([-7.5, 6.5, it.t[0], 2.4, 'right']); T.push([-7.5, 9.6, 'IΔn 30 mA', 2, 'right', '#555']);
    if (S.sim && S.meas) T.push([w + 3.5, 15, 'IΔ ' + Math.round(S.meas.res * 1000) + ' mA', 2.2, 'left', S.meas.res > 0.03 ? '#d92b2b' : '#555']);
  },
  meter(c, it, d, S, T) {
    line(c, 0, 0, 0, 3); line(c, 0, 9, 0, 12);
    c.beginPath(); c.arc(0, 6, 3, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
    T.push([0, 6.2, d.sub, 3, 'center']);
    T.push([-4.2, 6.5, it.t[0], 2.4, 'right']);
    if (S.sim && S.meas) {
      const m = S.meas, txt = d.sub === 'V' ? fmtV(m.V) + (m.dc ? ' DC' : '') : fmtA(m.I);
      c.fillStyle = '#10261a'; c.fillRect(4, 4.2, Math.max(9, txt.length * 1.55 + 1.5), 3.8);
      T.push([4.8, 6.2, txt, 2.6, 'left', '#7dff9b']);
    }
  },
  trafo(c, it, d, S, T) {
    const live = S.sim && S.meas && S.meas.Us > 1;
    line(c, 0, 0, 0, 5.9); line(c, 6, 0, 6, 5.9); line(c, 0, 24, 0, 18.1); line(c, 6, 24, 6, 18.1);
    for (const y of [8.6, 15.4]) { c.beginPath(); c.arc(3, y, 4, 0, 7); c.fillStyle = live ? 'rgba(255,216,74,.35)' : 'rgba(255,255,255,.85)'; c.fill(); c.stroke(); }
    T.push([-4.2, 8.6, (it.t[6] || '230') + ' V', 2.2, 'right', '#555']); T.push([-4.2, 15.4, (it.t[7] || '24') + ' V', 2.2, 'right', live ? '#8e44ad' : '#555']);
    T.push([-4.2, 12, it.t[0], 2.4, 'right']);
    if (S.sim && S.meas) T.push([10.5, 15.4, fmtV(S.meas.Us) + ', ' + fmtA(S.meas.Is), 2, 'left', live ? '#8e44ad' : '#777']);
  },
  thermal(c, it, d, S, T) {
    for (let i = 0; i < d.n; i++) {
      const x = i * 6; line(c, x, 0, x, 3); line(c, x, 9, x, 12);
      c.fillStyle = S.act ? '#ffc9c2' : '#fff'; c.fillRect(x - 2.7, 3, 5.4, 6); c.strokeRect(x - 2.7, 3, 5.4, 6);
      c.beginPath(); c.moveTo(x, 3); c.lineTo(x, 4.6); c.lineTo(x - 1.4, 4.6); c.lineTo(x - 1.4, 7.4); c.lineTo(x, 7.4); c.lineTo(x, 9); c.stroke();
    }
    T.push([-4.6, 6.5, it.t[0], 2.4, 'right']);
    if (it.t[8]) T.push([-4.6, 9.6, 'Ir ' + it.t[8] + ' A', 2, 'right', '#555']);
    currentText(S, T, (d.n - 1) * 6 + 4, 6.5);
  },
  contact(c, it, d, S, T) {
    let lx = -3.4;
    d.poles.forEach((p, i) => { const x = d.terms[p.a][0]; pole(c, x, p.nc ? !S.act : S.act, p.nc); });
    const x0 = S.act ? 0 : -1.45;                 // kde vazba opouští nůž
    const xe = d.poles.length > 1 ? d.terms[d.poles[d.poles.length - 1].a][0] - 1.45 : null;
    if (xe !== null) dashed(c, -1.45, 6, xe, 6);
    switch (d.deco) {
      case 'push': dashed(c, -6.5, 6, x0, 6); line(c, -6.5, 4.4, -6.5, 7.6); line(c, -6.5, 4.4, -5.6, 4.4); line(c, -6.5, 7.6, -5.6, 7.6); lx = -8; break;
      case 'mushroom': dashed(c, -6, 6, x0, 6); c.beginPath(); c.arc(-6, 6, 1.9, Math.PI / 2, -Math.PI / 2); c.closePath(); c.fillStyle = S.act ? '#e53935' : '#fff'; c.fill(); c.stroke(); latch(c, -3.2); lx = -9; break;
      case 'toggle': dashed(c, -6.5, 6, x0, 6); line(c, -6.5, 4.4, -6.5, 7.6); line(c, -6.5, 4.4, -7.6, 4.4); line(c, -6.5, 7.6, -5.4, 7.6); latch(c, -3.6); lx = -8.5; break;
      case 'limit': c.beginPath(); c.moveTo(S.act ? 0 : -1.0, 6.6); c.lineTo(S.act ? -1.6 : -2.7, 5.2); c.lineTo(S.act ? 0 : -1.9, 5.2); c.closePath(); c.stroke();
        dashed(c, -6, 6, x0 - 1.2, 6); c.beginPath(); c.arc(-6.8, 6, 0.8, 0, 7); c.stroke(); lx = -8.5; break;
      case 'thermal': dashed(c, -7.5, 6, x0, 6); c.beginPath(); c.moveTo(-7.5, 6); c.lineTo(-8.5, 6); c.lineTo(-8.5, 4.6); c.lineTo(-10, 4.6); c.lineTo(-10, 7.4); c.lineTo(-8.5, 7.4); c.stroke(); lx = -11; break;
      case 'ton': case 'toff': dashed(c, -6, 6, x0, 6);
        c.beginPath(); if (d.deco === 'ton') c.arc(-4.6, 6, 1.9, Math.PI / 2 + 0.5, -Math.PI / 2 - 0.5); else c.arc(-7.6, 6, 1.9, -Math.PI / 2 + 0.5, Math.PI / 2 - 0.5); c.stroke();
        line(c, -6, 5.3, -6, 6.7); lx = -8.5; break;
      case 'rocker': // domovní spínač: ruční ovládání obecně, tlačítko: ovládání stiskem
        dashed(c, -6.5, 6, x0, 6);
        if (d.click === 'momentary') { line(c, -6.5, 4.4, -6.5, 7.6); line(c, -6.5, 4.4, -5.6, 4.4); line(c, -6.5, 7.6, -5.6, 7.6); }
        else { manual(c, -6.5); latch(c, -3.6); }
        lx = -8.5; break;
      case 'thermo': // ovládání teplotou (θ)
        dashed(c, -5.5, 6, x0, 6); T.push([-7.4, 6.6, 'θ', 3.4, 'center', S.act ? '#d92b2b' : INK]); latch(c, -3.2); lx = -9.5; break;
      case 'dusk': { // ovládání světlem – fotocitlivý prvek (šipky dopadajícího světla)
        dashed(c, -5.5, 6, x0, 6); c.strokeRect(-8, 4.6, 2.5, 2.8);
        for (const dy of [-1.2, 0.4]) { line(c, -11, 2.6 + dy, -8.4, 4.6 + dy * 0.4); c.beginPath(); c.moveTo(-8.4, 4.6 + dy * 0.4); c.lineTo(-9.4, 4.5 + dy * 0.4); c.lineTo(-8.9, 3.8 + dy * 0.4); c.closePath(); c.fillStyle = INK; c.fill(); }
        if (S.act) c.fillRect(-7.6, 5, 1.7, 2);
        lx = -11.5; break;
      }
      case 'clock': {
        dashed(c, -5.5, 6, x0, 6); c.beginPath(); c.arc(-7.8, 6, 2.2, 0, 7); c.fillStyle = S.act ? LIVE_FILL : '#fff'; c.fill(); c.stroke();
        line(c, -7.8, 6, -7.8, 4.4); line(c, -7.8, 6, -6.6, 6.6);
        if (!S.sim) T.push([2, 2, (it.t[5] || 10) + '/' + (it.t[6] || 10) + ' s', 1.8, 'left', '#555']);
        lx = -10.8; break;
      }
      case 'pir': { // ovládání přiblížením / pohybem – kosočtverec (EN 60617 02-14)
        dashed(c, -5.5, 6, x0, 6); c.beginPath(); c.moveTo(-9.6, 6); c.lineTo(-7.6, 4); c.lineTo(-5.6, 6); c.lineTo(-7.6, 8); c.closePath(); c.fillStyle = S.act ? LIVE_FILL : '#fff'; c.fill(); c.stroke();
        line(c, 6, 12, 6, 9); T.push([6, 8, 'N', 1.8, 'center', '#555']);
        if (S.sim && S.act) T.push([2, 2, 'pohyb', 1.8, 'left', '#d92b2b']);
        lx = -10.5; break;
      }
    }
    T.push([lx, 6.5, it.t[0], 2.4, 'right']);
  },
  hsw(c, it, d, S, T) { // domovní spínače č. 5, 6, 7 (ČSN EN 60669-1)
    const m = S.mask | 0;
    if (d.v === 7) {
      for (const x of [0, 6]) { line(c, x, 0, x, 3); line(c, x, 9, x, 12); }
      const on = m & 1;
      c.save(); c.strokeStyle = '#b8bcc4'; c.setLineDash([0.8, 0.6]);
      if (on) { line(c, 0, 3, 0, 9); line(c, 6, 3, 6, 9); } else { line(c, 0, 3, 6, 9); line(c, 6, 3, 0, 9); }
      c.restore();
      if (on) { line(c, 0, 3, 6, 9); line(c, 6, 3, 0, 9); } else { line(c, 0, 3, 0, 9); line(c, 6, 3, 6, 9); }
      for (const [x, y] of [[0, 3], [6, 3], [0, 9], [6, 9]]) { c.beginPath(); c.arc(x, y, 0.45, 0, 7); c.fillStyle = INK; c.fill(); }
      T.push([-2, 6.5, it.t[0], 2.4, 'right']); T.push([9, 6.5, 'č.7', 2, 'left', '#555']); return;
    }
    line(c, 3, 12, 3, 8.5); line(c, 0, 0, 0, 3.5); line(c, 6, 0, 6, 3.5);
    c.beginPath(); c.arc(3, 8.5, 0.45, 0, 7); c.fillStyle = INK; c.fill();
    if (d.v === 6) { const to = m & 1 ? 6 : 0; line(c, 3, 8.5, to, 3.5); }
    else { line(c, 3, 8.5, m & 1 ? 0 : -1.2, m & 1 ? 3.5 : 5.2); line(c, 3, 8.5, m & 2 ? 6 : 7.2, m & 2 ? 3.5 : 5.2); }
    dashed(c, -4.5, 6.2, 1.5, 6.2); line(c, -4.5, 4.6, -4.5, 7.8); latch(c, -1.6);
    T.push([-6, 6.5, it.t[0], 2.4, 'right']); T.push([8, 9, 'č.' + d.v, 2, 'left', '#555']);
  },
  socket(c, it, d, S, T) { // zásuvka s ochranným kolíkem (ČSN EN 60617-11)
    line(c, 0, 0, 0, 4.6); line(c, 6, 0, 6, 4.6); line(c, 0, 4.6, 6, 4.6); line(c, 3, 4.6, 3, 6.2);
    c.beginPath(); c.arc(3, 6.2, 3.2, 0, Math.PI); c.fillStyle = S.act ? LIVE_FILL : '#fff'; c.fill(); c.stroke(); line(c, -0.2, 6.2, 6.2, 6.2);
    line(c, 3, 4.6, 3, 3.6); line(c, 12, 0, 12, 3.6); line(c, 12, 3.6, 3, 3.6); // ochranný kontakt: kolmá čárka uprostřed
    T.push([-1.5, 6.5, it.t[0], 2.4, 'right']);
    if (S.sim && S.meas) T.push([3, 11.5, S.act ? (it.t[9] || 1000) + ' W' : 'volná', 2, 'center', S.act ? '#d92b2b' : '#777']);
  },
  emeter3(c, it, d, S, T) {
    for (let i = 0; i < 4; i++) { line(c, i * 6, 0, i * 6, 2.5); line(c, i * 6, 9.5, i * 6, 12); }
    c.fillStyle = '#fff'; c.fillRect(-2.5, 2.5, 23, 7); c.strokeRect(-2.5, 2.5, 23, 7); line(c, -2.5, 4.6, 20.5, 4.6);
    T.push([9, 7.2, 'kWh 3~', 2.2, 'center']); T.push([-3.5, 6.5, it.t[0], 2.4, 'right']);
    if (S.sim && S.meas) T.push([21.5, 6.5, Math.round(S.meas.P) + ' W  ' + S.meas.Wh.toFixed(3).replace('.', ',') + ' Wh', 2, 'left', '#0a66e8']);
  },
  emeter2t(c, it, d, S, T) { // dvoutarifní elektroměr + výstupní relé HDO (sepnuto v NT)
    for (let i = 0; i < 4; i++) { line(c, i * 6, 0, i * 6, 2.5); line(c, i * 6, 9.5, i * 6, 12); }
    c.fillStyle = '#fff'; c.fillRect(-2.5, 2.5, 33, 7); c.strokeRect(-2.5, 2.5, 33, 7); line(c, -2.5, 4.6, 22.5, 4.6); line(c, 22.5, 2.5, 22.5, 9.5);
    T.push([10, 7.2, 'kWh 3~ VT/NT', 2, 'center']); T.push([-3.5, 6.5, it.t[0], 2.4, 'right']);
    const nt = S.sim && S.meas && S.meas.nt;
    line(c, 27, 0, 27, 3.5); line(c, 27, 8.5, 27, 12); if (nt) line(c, 27, 8.5, 27, 3.5); else line(c, 27, 8.5, 24.6, 3.9);
    T.push([28.6, 3.4, 'HDO', 1.6, 'left', '#555']);
    if (S.sim && S.meas) T.push([31, 6.5, (nt ? 'NT' : 'VT') + '  ' + Math.round(S.meas.P) + ' W  VT ' + S.meas.WhVT.toFixed(3).replace('.', ',') + ' / NT ' + S.meas.WhNT.toFixed(3).replace('.', ',') + ' Wh', 2, 'left', nt ? '#2e9e3e' : '#c25400']);
  },
  socket3(c, it, d, S, T) { // zásuvka 400 V (CEE) – pětikolíková
    for (const x of [0, 6, 12, 18]) line(c, x, 0, x, 4.6);
    line(c, 0, 4.6, 18, 4.6); line(c, 9, 4.6, 9, 7.2);
    c.beginPath(); c.arc(9, 7.2, 5.2, 0, Math.PI); c.fillStyle = S.act ? LIVE_FILL : '#fff'; c.fill(); c.stroke(); line(c, 3.6, 7.2, 14.4, 7.2);
    line(c, 9, 4.6, 9, 3.6); line(c, 24, 0, 24, 3.6); line(c, 24, 3.6, 9, 3.6); // ochranný kontakt
    line(c, 8.2, 6.5, 9.8, 5.3); T.push([10.6, 5.9, '4', 1.7, 'left']); // počet pólů: 3 + N
    T.push([9, 9.8, d.amp + ' A', 1.8, 'center']); T.push([-1.5, 5.5, it.t[0], 2.4, 'right']);
    if (S.sim && S.meas) T.push([9, 14.6, (S.meas.rot === 'R' ? '↻ pravotočivé' : S.meas.rot === 'L' ? '↺ LEVOTOČIVÉ' : S.meas.live ? 'chybí fáze' : 'bez napětí') + (S.act ? ', ' + (it.t[9] || 3000) + ' W' : ''), 1.8, 'center', S.meas.rot === 'R' ? '#2e9e3e' : '#d92b2b']);
  },
  load3(c, it, d, S, T) {
    for (const x of [0, 6, 12, 18, 24]) line(c, x, 0, x, 3);
    c.fillStyle = S.act && S.sim ? LIVE_FILL : '#fff'; c.fillRect(-2, 3, 22, 6); c.strokeRect(-2, 3, 22, 6);
    T.push([9, 6.3, 'sporák 3~', 2, 'center']);
    line(c, 24, 3, 24, 6); line(c, 22.5, 6, 25.5, 6); line(c, 23.2, 7, 24.8, 7);
    T.push([-3, 6.5, it.t[0], 2.4, 'right']); T.push([9, 11.5, (it.t[9] || 7000) + ' W' + (S.sim ? (S.act ? ' – zapnuto' : ' – vypnuto') : ''), 1.8, 'center', '#555']);
  },
  emeter(c, it, d, S, T) {
    line(c, 0, 0, 0, 2.5); line(c, 6, 0, 6, 2.5); line(c, 0, 9.5, 0, 12); line(c, 6, 9.5, 6, 12);
    c.fillStyle = '#fff'; c.fillRect(-2.5, 2.5, 11, 7); c.strokeRect(-2.5, 2.5, 11, 7); line(c, -2.5, 4.6, 8.5, 4.6);
    T.push([3, 7.2, 'kWh', 2.2, 'center']);
    T.push([-3.5, 6.5, it.t[0], 2.4, 'right']);
    if (S.sim && S.meas) T.push([9.5, 6.5, Math.round(S.meas.P) + ' W  ' + S.meas.Wh.toFixed(3).replace('.', ',') + ' Wh', 2, 'left', '#0a66e8']);
  },
  clamp(c, it, d, S, T) {
    const w = (d.terms.length - 1) * 3;
    line(c, 0, 1.6, w, 1.6); // propojka svorek
    for (let i = 0; i < d.terms.length; i++) { line(c, i * 3, 0.7, i * 3, 1.6); c.beginPath(); c.arc(i * 3, 0, 0.7, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke(); } // svorka: kroužek
    T.push([-2.5, 1.4, it.t[0], 2.2, 'right']);
  },
  key(c, it, d, S, T) {
    c.fillStyle = S.act ? LIVE_FILL : '#f1f1f4'; c.beginPath(); c.rect(-3, -3, 6, 6); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, 0, 1.3, 0, 7); c.fillStyle = S.act ? '#e53935' : '#fff'; c.fill(); c.stroke();
    T.push([-4.2, 0.4, it.t[0], 2.4, 'right']);
  },
  load(c, it, d, S, T) {
    const on = S.on;
    line(c, 0, 0, 0, 3.5); line(c, 0, 8.5, 0, 12);
    if (d.sub === 'light') line(c, 6, 12, 6, 9.5);
    if (d.sub === 'lamp' || d.sub === 'blink' || d.sub === 'light') {
      const col = d.sub === 'light' ? '#ffc93c' : LAMP[(parseInt(it.t[4]) || 0) % LAMP.length], lvl = S.sim ? (S.lvl || 0) : 0, lit = lvl > 0.04 && (d.sub !== 'blink' || S.blink);
      if (lit) { c.save(); c.globalAlpha = 0.28 * lvl; c.fillStyle = col; c.beginPath(); c.arc(0, 6, 4.6, 0, 7); c.fill(); c.restore(); }
      c.beginPath(); c.arc(0, 6, 2.5, 0, 7); c.fillStyle = '#fff'; c.fill(); if (lit) { c.save(); c.globalAlpha = 0.25 + 0.75 * lvl; c.fillStyle = col; c.fill(); c.restore(); } c.stroke();
      line(c, -1.77, 4.23, 1.77, 7.77); line(c, -1.77, 7.77, 1.77, 4.23);
      if (d.sub === 'blink') { line(c, -2.4, 3.6, -3.6, 2.4); line(c, -3, 4.6, -4.4, 4.2); line(c, -1.5, 3, -1.9, 1.6); } // blikající: paprsky
      if (!S.sim && d.sub !== 'light') { c.fillStyle = col; c.fillRect(3.2, 5.2, 1.6, 1.6); c.save(); c.lineWidth *= 0.5; c.strokeRect(3.2, 5.2, 1.6, 1.6); c.restore(); }
    } else if (d.sub === 'heater') {
      line(c, 6, 12, 6, 9.5);
      c.fillStyle = on ? '#ffd2b8' : '#fff'; c.fillRect(-3, 3.5, 6, 5); c.strokeRect(-3, 3.5, 6, 5); // spotřebič obecně
      T.push([0, 6.2, 'ohř.', 1.7, 'center']);
    } else if (d.sub === 'fan') {
      line(c, 6, 12, 6, 9.5);
      c.beginPath(); c.arc(0, 6, 2.6, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
      const a = S.sim && on ? (S.t || 0) * 12 : 0; for (let k = 0; k < 3; k++) { const q = a + k * 2.094; line(c, 0, 6, Math.cos(q) * 2.2, 6 + Math.sin(q) * 2.2); }
    } else if (d.sub === 'bell') {
      c.beginPath(); c.arc(0, 7.5, 3, Math.PI, 0); c.closePath(); c.fillStyle = on ? LIVE_FILL : '#fff'; c.fill(); c.stroke(); line(c, 0, 3.5, 0, 4.5);
      if (on && S.blink) { line(c, 3.6, 5, 5, 4.2); line(c, -3.6, 5, -5, 4.2); }
    } else if (d.sub === 'horn') { // houkačka: trychtýř
      line(c, 0, 3.5, 0, 4.5); line(c, 0, 7.5, 0, 8.5);
      c.beginPath(); c.moveTo(-1, 4.5); c.lineTo(1, 4.5); c.lineTo(1, 7.5); c.lineTo(-1, 7.5); c.closePath(); c.fillStyle = on ? LIVE_FILL : '#fff'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(1, 5.2); c.lineTo(3.6, 3.6); c.lineTo(3.6, 8.4); c.lineTo(1, 6.8); c.closePath(); c.fill(); c.stroke();
      if (on && S.blink) { line(c, 3.6, 5, 5, 4.2); line(c, 3.8, 6.6, 5.4, 6.6); line(c, 3.6, 8.2, 5, 9); }
    } else {
      c.fillStyle = on ? LIVE_FILL : '#fff'; c.fillRect(-3, 3.5, 6, 5); c.strokeRect(-3, 3.5, 6, 5);
      if (d.sub === 'ton') { c.fillStyle = on ? LIVE_FILL : '#fff'; c.fillRect(-5.2, 3.5, 2.2, 5); c.strokeRect(-5.2, 3.5, 2.2, 5); line(c, -5.2, 3.5, -3, 8.5); line(c, -5.2, 8.5, -3, 3.5); }
      if (d.sub === 'toff') { c.fillStyle = INK; c.fillRect(-5.2, 3.5, 2.2, 5); c.strokeRect(-5.2, 3.5, 2.2, 5); }
      if (d.sub === 'pulse') { c.fillStyle = on ? LIVE_FILL : '#fff'; c.fillRect(-5.2, 3.5, 2.2, 5); c.strokeRect(-5.2, 3.5, 2.2, 5); line(c, -5, 8.3, -3.2, 3.7); } // remanentní relé (EN 60617 07-15)
      if (d.sub === 'stair') { c.fillStyle = INK; c.fillRect(-5.2, 3.5, 2.2, 5); c.strokeRect(-5.2, 3.5, 2.2, 5); const left = S.meas && S.meas.left; T.push([4, 6.5, left > 0 ? left.toFixed(0) + ' s' : ES.secondsOf(it) + ' s', 2.2, 'left', left > 0 ? '#d92b2b' : '#555']); }
      if (d.sub === 'valve') { dashed(c, 3, 6, 5, 6); c.beginPath(); c.moveTo(5, 4.4); c.lineTo(8.2, 7.6); c.lineTo(8.2, 4.4); c.lineTo(5, 7.6); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke(); } // cívka + ventil přes mechanickou vazbu
      if (d.sub === 'ton' || d.sub === 'toff') {
        const tm = S.timer;
        T.push([4, 6.5, tm && tm.left > 0 ? tm.left.toFixed(1) + ' s' : ES.secondsOf(it) + ' s', 2.2, 'left', tm && tm.left > 0 ? '#d92b2b' : '#555']);
      }
    }
    T.push([['ton', 'toff', 'pulse', 'stair'].includes(d.sub) ? -6.2 : -4.2, 6.5, it.t[0], 2.4, 'right']);
  },
  motor(c, it, d, S, T) {
    const cx = 6, cy = d.kind === 'motorYD' ? 12 : 13, r = d.kind === 'motorYD' ? 7.6 : 8, m = S.motor;
    d.terms.forEach((p, i) => {
      if (d.labels[i] === 'PE') { line(c, 18, 3, 18, cy - 3); line(c, 18, cy - 3, cx + r - 0.6, cy - 3); return; }
      const dx = p[0] - cx, dy = Math.sqrt(Math.max(0, r * r - dx * dx)); line(c, p[0], p[1], p[0], p[1] < cy ? cy - dy : cy + dy);
    });
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = m && m.fault ? '#ffe1dc' : '#fff'; c.fill(); c.stroke();
    if (m) {
      // rotor při pohledu od hřídele: kotva s drážkami, jedna značka pro čtení směru
      const run = Math.abs(m.rpm) > 1, rr = r - 1.5;
      c.save(); c.translate(cx, cy); c.rotate(m.ang);
      c.beginPath(); c.arc(0, 0, rr, 0, 7); c.fillStyle = run ? '#dff3e2' : '#f1f2f4'; c.fill();
      c.save(); c.lineWidth *= 0.6; c.strokeStyle = run ? '#2e9e3e' : '#9a9da3'; c.stroke();
      for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); line(c, 2.6, 0, rr - 0.5, 0); }
      c.restore();
      c.beginPath(); c.moveTo(1.6, -1.1); c.lineTo(rr - 0.3, -0.75); c.lineTo(rr - 0.3, 0.75); c.lineTo(1.6, 1.1); c.closePath(); c.fillStyle = '#d92b2b'; c.fill();
      c.beginPath(); c.arc(0, 0, 2.3, 0, 7); c.fillStyle = '#5b6068'; c.fill(); c.fillStyle = '#fff'; c.fillRect(-0.45, -2.3, 0.9, 1.1);
      c.restore();
      const n = Math.round(Math.abs(m.rpm)), col = m.fault ? '#d92b2b' : run ? '#1f8a31' : '#777';
      T.push([21, cy - 4.2, (m.rpm > 1 ? '↻ ' : m.rpm < -1 ? '↺ ' : '') + n + ' ot/min', 3, 'left', col]);
      T.push([21, cy - 0.6, 'Σ ' + Math.floor(m.revs) + ' ot.', 2.4, 'left', '#555']);
      T.push([21, cy + 2.6, m.fault ? 'chybí fáze!' : (m.mode === 'Y' ? 'Y  ' : m.mode === 'D' ? 'Δ  ' : '') + (m.U > 1 ? Math.round(m.U) + ' V na vinutí' : 'bez napětí'), 2.2, 'left', m.fault ? '#d92b2b' : '#555']);
    } else {
      T.push([cx, cy - 0.6, 'M', 3, 'center']);
      T.push([cx, cy + 2.6, d.kind === 'motor1' ? '1~' : '3~', 2.2, 'center']);
    }
    T.push([-3, cy, it.t[0], 2.4, 'right']);
  },
  stage(c, it, d, S, T) {
    c.fillStyle = S.on ? '#8fe39a' : '#fff'; c.fillRect(-6, 0, 12, 12); c.strokeRect(-6, 0, 12, 12);
    if (d.init) c.strokeRect(-4.8, 1.2, 9.6, 9.6);
    T.push([0, 6.4, it.t[0], 3.4, 'center']);
  },
  trans(c, it, d, S, T) {
    line(c, 0, 0, 0, 6); c.save(); c.lineWidth *= 2; line(c, -3, 3, 3, 3); c.restore();
    T.push([4.5, 3.4, it.extra || it.t[0], 2.6, 'left', '#0b4aa8']);
  },
  action(c, it, d, S, T) {
    line(c, -3, 0, 0, 0); c.fillStyle = S.on ? '#8fe39a' : '#fff'; c.fillRect(0, -3, 18, 6); c.strokeRect(0, -3, 18, 6);
    const mode = (it.t[6] || '0').trim();
    T.push([9, 0.4, (mode === '1' ? 'S ' : mode === '2' ? 'R ' : '') + it.t[0], 2.6, 'center']);
  },
  gref(c, it, d, S, T) { c.beginPath(); c.moveTo(-1.5, -1.5); c.lineTo(1.5, -1.5); c.lineTo(0, 1.5); c.closePath(); c.fillStyle = INK; c.fill(); },
  cyl(c, it, d, S, T) {
    const p = S.cyl || 0, L = 30, st = 24;
    c.fillStyle = '#eef1f5'; c.fillRect(0, 0, L, 9); c.strokeRect(0, 0, L, 9);
    const px = 2 + p * (L - 6); c.fillStyle = '#9aa3ad'; c.fillRect(px, 0, 2.5, 9); c.strokeRect(px, 0, 2.5, 9);
    c.fillStyle = '#c9ced4'; c.fillRect(px + 2.5, 3.4, L - 4, 2.2); c.strokeRect(px + 2.5, 3.4, L - 4, 2.2);
    T.push([L / 2, -2, it.t[0], 3, 'center']);
    T.push([3, 12.5, it.t[4], 2.4, 'center', p <= 0 ? '#2e9e3e' : '#777']); T.push([L - 3, 12.5, it.t[6], 2.4, 'center', p >= 1 ? '#2e9e3e' : '#777']);
    T.push([3, 16, (it.extra || ''), 2.2, 'center', '#0b4aa8']); T.push([L - 3, 16, (it.t[10] || '').split('*')[0], 2.2, 'center', '#0b4aa8']);
  },
};

function stateFor(it, d, sim, time) {
  const S = { sim: !!sim };
  if (!sim) return S;
  const c = sim.byUid.get(it.uid); if (!c) return S;
  S.act = ES.isActuated(sim, c); S.meas = sim.meas[it.uid]; S.on = !!sim.on[it.uid]; S.motor = sim.motor[it.uid]; S.timer = sim.timers[c.key];
  S.mask = sim.sw[it.uid]; S.t = sim.t; S.blink = Math.floor(sim.t * 2.5) % 2 === 0; S.cyl = sim.cyl[it.uid]; S.lvl = sim.lvl[it.uid];
  if (d.kind === 'stage') S.on = !!(sim.stage[it.uid] && sim.stage[it.uid].on);
  return S;
}

// vykreslí jeden prvek; opt = {sim, ghost, selected}
function drawItem(c, it, opt) {
  opt = opt || {};
  const d = ES.getDef(it.type), n = it.n, sim = opt.sim;
  c.lineWidth = 0.34; c.lineCap = 'round'; c.lineJoin = 'round';
  const HL = opt.selected ? '#0a66e8' : opt.linked ? '#e07b00' : null;
  c.strokeStyle = HL || INK; c.fillStyle = INK;
  if (d.kind === 'wire') {
    let col = it.type === 4009 ? '#1e6fd9' : it.type === 4010 ? '#2e9e3e' : it.type === 10106 ? INK : WIRE_IDLE, w = 0.34;
    if (sim && it.type !== 10106) { const net = sim.nets.ofKey.get(n[8] + ',' + n[9]); const p = net === undefined ? 0 : sim.netPot[net]; col = potColor(p, Math.floor(sim.t * 4) % 2 === 0); w = p ? 0.62 : 0.3;
      if (it.type === 4010 && p && !ES.shorted(p) && !(p & ~(8 | 16 | 64 | ES.TZ))) col = POT_COLOR[16]; // ochranný vodič zůstává zelený
      if (!p && net !== undefined) { const v = ES.netVoltage(sim, net); if (v && Math.hypot(v[0], v[1]) > 20) { col = viaColor(v); w = 0.45; } }
      if (!p && sim.elec && ES.Elec) { const e = ES.Elec.wireStyle(sim, net); if (e) { col = e[0]; w = e[1]; } } }
    if (opt.selected) col = '#0a66e8';
    c.strokeStyle = col; c.lineWidth = w;
    if (it.type === 4010 && !sim) { c.save(); c.setLineDash([2.2, 0.8, 0.5, 0.8]); line(c, n[8], n[9], n[10], n[11]); c.restore(); } else line(c, n[8], n[9], n[10], n[11]);
    return;
  }
  if (d.kind === 'node') return; // tečky kreslí editor hromadně
  if (d.kind === 'gfx') {
    const col = opt.selected ? '#0a66e8' : colorref(n[16]); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 0.3 + 0.12 * (n[18] || 0);
    const x = Math.min(n[8], n[10]), y = Math.min(n[9], n[11]), w = Math.abs(n[10] - n[8]), h = Math.abs(n[11] - n[9]);
    if (d.shape === 'line' || !w || !h) line(c, n[8], n[9], n[10], n[11]);
    else if (d.shape === 'rect') c.strokeRect(x, y, w, h);
    else if (d.shape === 'frect') c.fillRect(x, y, w, h);
    else { c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); d.shape === 'fell' ? c.fill() : c.stroke(); }
    return;
  }
  if (d.kind === 'text') {
    const h = Math.max(2.6, Math.abs(n[11] - n[9]) || 3.4) * 0.95;
    c.font = (n[20] >= 600 ? 'bold ' : '') + h + 'px -apple-system, "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillStyle = opt.selected ? '#0a66e8' : (n[16] ? colorref(n[16]) : INK); c.fillText(it.extra || it.t[0] || '', n[8], n[9]);
    return;
  }
  if (d.kind === 'unknown') {
    c.save(); c.setLineDash([1, 1]); c.strokeStyle = opt.selected ? '#0a66e8' : '#c0392b';
    c.strokeRect(n[8] + n[12], n[9] + n[13], Math.max(3, n[14] - n[12]), Math.max(3, n[15] - n[13])); c.restore();
    c.font = '2.2px -apple-system, Arial'; c.fillStyle = '#c0392b'; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText('? ' + it.type + ' ' + (it.t[0] || ''), n[8] + n[12] + 0.5, n[9] + n[13] + 0.5);
    return;
  }
  const T = [], S = stateFor(it, d, sim);
  c.save(); c.translate(n[8], n[9]); c.rotate((n[17] & 3) * Math.PI / 2);
  if (opt.ghost) c.globalAlpha = 0.55;
  if (d.draw) { if (sim && sim.elec) S.r = sim.elec.res[it.uid]; d.draw(c, it, d, S, T, sim); } else SYM[d.sym](c, it, d, S, T);
  c.restore();
  // popisky svorek
  if (d.kind !== 'supply') (d.terms || []).forEach((p, i) => {
    const s = it.t[2 + i]; if (!s || d.labels[i] === undefined) return;
    if (d.sym === 'motor') { if (d.labels[i] !== 'PE') T.push([p[0] + 0.7, p[1] === 0 ? 2.8 : p[1] - 1.6, s, 1.9, 'left', '#444']); else T.push([18.7, 2, s, 1.9, 'left', '#444']); }
    else T.push([p[0] + 0.8, p[1] === 0 ? 2.4 : p[1] - 1.4, s, 1.9, 'left', '#444']);
  });
  if (opt.noText) return;
  c.textBaseline = 'middle';
  for (const [x, y, s, size, align, col] of T) {
    if (!s) continue;
    const [rx, ry] = ES.rot(x, y, n[17]);
    c.font = size + 'px -apple-system, "Helvetica Neue", Arial, sans-serif';
    let al = align; if ((n[17] & 3) === 2 && al !== 'center') al = al === 'left' ? 'right' : 'left';
    if ((n[17] & 1) && al !== 'center') al = 'center';
    c.textAlign = al; c.fillStyle = HL || (col || INK); if (opt.ghost) c.globalAlpha = 0.55;
    c.fillText(String(s).trim(), n[8] + rx, n[9] + ry); c.globalAlpha = 1;
  }
}

ES.drawItem = drawItem; ES.viaColor = viaColor; ES.potColor = potColor; ES.LAMP = LAMP; ES.LAMP_NAME = LAMP_NAME; ES.POT_COLOR = POT_COLOR;
})(window);
