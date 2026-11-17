// ElectroSchool – kalkulačky elektrických veličin.
// Výpočty (window.ESCalc.calc) jsou oddělené od rozhraní, aby šly testovat bez prohlížeče.
(function (root) {
'use strict';

// ------------------------------------------------------------ pomocné
const SQ3 = Math.sqrt(3);
const BREAKERS = [2, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
// Orientační dovolené proudy Cu vodičů s izolací PVC, 3 zatížené žíly, způsob uložení B1
// (jednožilové vodiče v trubce na stěně), 30 °C – podle tabulek ČSN 33 2000-5-52 / IEC 60364-5-52.
const IZ_CU = { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134, 70: 171, 95: 207, 120: 239, 150: 262, 185: 296, 240: 346 };
const RHO = { cu: 0.0225, al: 0.036 }; // Ω·mm²/m při provozní teplotě vodiče (~70 °C)

// "1,5" "1.5" "1k5" "2,2k" "4M7" "10 m" -> číslo (NaN, když nic)
function num(s) {
  if (typeof s === 'number') return s;
  s = String(s == null ? '' : s).trim().replace(/\s+/g, '').replace(',', '.');
  if (!s) return NaN;
  const m = /^([0-9]*\.?[0-9]*)([kKmMuUµnpG]?)([0-9]*)$/.exec(s);
  if (!m || (!m[1] && !m[3])) return NaN;
  const mult = { '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9, m: 1e-3, u: 1e-6, U: 1e-6, 'µ': 1e-6, n: 1e-9, p: 1e-12 }[m[2]];
  const v = parseFloat(m[3] ? m[1] + '.' + m[3] : m[1]);
  return isNaN(v) ? NaN : v * mult;
}
function fmt(v, digits) {
  if (v === null || v === undefined || !isFinite(v)) return '–';
  const a = Math.abs(v), d = digits !== undefined ? digits : a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
  return v.toLocaleString('cs-CZ', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}
// hodnota s předponou: 4700 Ω -> "4,7 kΩ"
function eng(v, unit) {
  if (!isFinite(v)) return '–';
  const P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  const a = Math.abs(v); let p = P.find(([f]) => a >= f) || P[P.length - 1]; if (a === 0) p = [1, ''];
  return fmt(v / p[0], 3) + ' ' + p[1] + unit;
}
const nextStd = (list, v) => list.find(x => x >= v - 1e-9);
const prevStd = (list, v) => { let r = null; for (const x of list) if (x <= v + 1e-9) r = x; return r; };
const IN_STD = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
// Dovolené proudy Iz [A], Cu, PVC 70 °C, okolí 30 °C – ČSN 33 2000-5-52 (IEC 60364-5-52), tab. B.52.2 a B.52.4
const SEC12 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
const IZ = {
  2: { A1: [14.5, 19.5, 26, 34, 46, 61, 80, 99, 119, 151, 182, 210], A2: [14, 18.5, 25, 32, 43, 57, 75, 92, 110, 139, 167, 192],
       B1: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269], B2: [16.5, 23, 30, 38, 52, 69, 90, 111, 133, 168, 201, 232],
       C: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299], E: [22, 30, 40, 51, 70, 94, 119, 148, 180, 232, 282, 328] },
  3: { A1: [13.5, 18, 24, 31, 42, 56, 73, 89, 108, 136, 164, 188], A2: [13, 17.5, 23, 29, 39, 52, 68, 83, 99, 125, 150, 172],
       B1: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239], B2: [15, 20, 27, 34, 46, 62, 80, 99, 118, 149, 179, 206],
       C: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259], E: [18.5, 25, 34, 43, 60, 80, 101, 126, 153, 196, 238, 276] },
};
const METHODS = [['A1', 'A1 – vodiče v trubce v tepelně izolační stěně'], ['A2', 'A2 – kabel v trubce v tepelně izolační stěně'], ['B1', 'B1 – vodiče v trubce na stěně / pod omítkou'],
  ['B2', 'B2 – kabel v trubce na stěně / pod omítkou'], ['C', 'C – kabel přímo na stěně / pod omítkou bez trubky'], ['E', 'E – kabel volně ve vzduchu, na roštu']];
const KT_PVC = { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 };
const KG = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57, 7: 0.54, 8: 0.52, 9: 0.5, 12: 0.45, 16: 0.41, 20: 0.38 };
const MAG = { B: 5, C: 10, D: 20 };      // horní mez okamžité spouště jističe (× In)
const E24 = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const e24up = v => { if (!(v > 0)) return NaN; const d = Math.pow(10, Math.floor(Math.log10(v))); for (const x of [...E24, 10]) if (x * d >= v * 0.9999) return x * d; };
const ok = c => c ? '✓ vyhovuje' : '✗ nevyhovuje';

// ------------------------------------------------------------ výpočty
// Každá funkce dostane objekt vstupů (čísla / řetězce) a vrátí { rows: [[popis, hodnota, jednotka, zvýraznit?]], notes: [], err }.
const calc = {
  ohm(v) {
    let U = num(v.U), I = num(v.I), R = num(v.R), P = num(v.P);
    const given = [U, I, R, P].filter(x => !isNaN(x)).length;
    if (given !== 2) return { err: 'Vyplňte právě dvě ze čtyř veličin, zbylé se dopočítají.' };
    if (!isNaN(U) && !isNaN(I)) { R = U / I; P = U * I; }
    else if (!isNaN(U) && !isNaN(R)) { I = U / R; P = U * U / R; }
    else if (!isNaN(U) && !isNaN(P)) { I = P / U; R = U * U / P; }
    else if (!isNaN(I) && !isNaN(R)) { U = I * R; P = I * I * R; }
    else if (!isNaN(I) && !isNaN(P)) { U = P / I; R = P / (I * I); }
    else { U = Math.sqrt(P * R); I = Math.sqrt(P / R); }
    return { rows: [['Napětí U', fmt(U), 'V', true], ['Proud I', fmt(I), 'A', true], ['Odpor R', eng(R, 'Ω'), '', true], ['Výkon P', fmt(P), 'W', true]],
      notes: ['U = R·I,  P = U·I = R·I² = U²/R'] };
  },

  motor(v) {
    const P = num(v.P) * 1000, U = num(v.U), cos = num(v.cos), eta = num(v.eta) / 100, k = num(v.k);
    if (!(P > 0 && U > 0 && cos > 0 && cos <= 1 && eta > 0 && eta <= 1)) return { err: 'Zadejte výkon, napětí, účiník (0–1) a účinnost (1–100 %).' };
    const P1 = P / eta, three = v.sys !== '1f';
    const I = three ? P1 / (SQ3 * U * cos) : P1 / (U * cos);
    const S = P1 / cos, Q = S * Math.sin(Math.acos(cos));
    const Ia = I * (k > 0 ? k : 6.5);
    const rows = [['Příkon P₁ = P / η', fmt(P1 / 1000), 'kW'], ['Jmenovitý proud Iₙ', fmt(I), 'A', true],
      ['Zdánlivý výkon S', fmt(S / 1000), 'kVA'], ['Jalový výkon Q', fmt(Q / 1000), 'kvar'],
      ['Záběrový proud při přímém rozběhu', fmt(Ia), 'A']];
    if (three) rows.push(['Záběrový proud při rozběhu Y/Δ (≈ ⅓)', fmt(Ia / 3), 'A']);
    rows.push(['Nastavení tepelného relé', fmt(I, 1), 'A', true], ['Jistič (orientačně, char. C/D)', nextStd(BREAKERS, I * 1.1) || '> 250', 'A']);
    return { rows, notes: [three ? 'Iₙ = P / (η · √3 · U · cos φ)' : 'Iₙ = P / (η · U · cos φ)',
      'Tepelné relé se nastavuje na jmenovitý proud motoru ze štítku. Jistič volte s charakteristikou C nebo D, aby nevypínal při rozběhu.'] };
  },

  drop(v) {
    const I = num(v.I), L = num(v.L), S = num(v.S), cos = isNaN(num(v.cos)) ? 1 : num(v.cos), rho = RHO[v.mat] || RHO.cu, three = v.sys === '3f';
    const U = three ? 400 : 230, lim = num(v.lim) || 5;
    if (!(I > 0 && L > 0 && S > 0)) return { err: 'Zadejte proud, délku vedení a průřez.' };
    const k = three ? SQ3 : 2, dU = k * L * I * rho * cos / S, pct = dU / U * 100;
    const Smin = SECTIONS.find(s => k * L * I * rho * cos / s / U * 100 <= lim);
    const Iz = v.mat === 'cu' ? IZ_CU[S] : null, Szat = SECTIONS.find(s => IZ_CU[s] >= I);
    const rows = [['Úbytek napětí ΔU', fmt(dU), 'V', true], ['Úbytek napětí', fmt(pct, 2), '%', true],
      ['Napětí na konci vedení', fmt(U - dU), 'V'], ['Ztráty ve vedení', fmt((three ? 3 : 2) * I * I * rho * L / S), 'W'],
      ['Nejmenší průřez pro ΔU ≤ ' + fmt(lim) + ' %', Smin ? fmt(Smin) : '> 240', 'mm²', true]];
    if (v.mat === 'cu') rows.push(['Nejmenší průřez podle proudu (Cu, B1)', Szat ? fmt(Szat) : '> 240', 'mm²']);
    const notes = [(three ? 'ΔU = √3' : 'ΔU = 2') + ' · L · I · ρ · cos φ / S,  ρ = ' + fmt(rho, 4) + ' Ω·mm²/m (vodič zahřátý na provozní teplotu)',
      'ČSN 33 2000-5-52 doporučuje úbytek do 3 % u osvětlení a do 5 % u ostatních spotřebičů.'];
    const warn = [];
    if (pct > lim) warn.push('Úbytek ' + fmt(pct, 2) + ' % překračuje zvolený limit ' + fmt(lim) + ' %.');
    if (Iz && I > Iz) warn.push('Proud ' + fmt(I) + ' A je větší než orientační dovolený proud ' + fmt(Iz) + ' A pro ' + fmt(S) + ' mm² Cu.');
    notes.push('Dovolené proudy jsou orientační (Cu, PVC, 3 zatížené žíly, uložení B1, 30 °C). Pro jiné uložení a souběh kabelů platí korekční činitele.');
    return { rows, notes, warn };
  },

  resist(v) {
    const vals = String(v.list || '').split(/[;\s]+|,(?=\s)|,(?=[^\d])/).map(num).filter(x => x > 0);
    if (vals.length < 2) return { err: 'Zadejte alespoň dvě hodnoty oddělené mezerou nebo středníkem (např. 100 220 1k5).' };
    const s = vals.reduce((a, b) => a + b, 0), p = 1 / vals.reduce((a, b) => a + 1 / b, 0);
    return { rows: [['Počet prvků', String(vals.length), ''], ['Sériově  R = R₁ + R₂ + …', eng(s, 'Ω'), '', true], ['Paralelně  1/R = 1/R₁ + 1/R₂ + …', eng(p, 'Ω'), '', true]],
      notes: ['U kondenzátorů je to obráceně: paralelně se kapacity sčítají, sériově platí vzorec s převrácenými hodnotami.', 'Zadávat lze i 4k7, 2,2k, 1M apod.'] };
  },

  speed(v) {
    const f = num(v.f), poles = num(v.poles), n = num(v.n);
    if (!(f > 0 && poles >= 2)) return { err: 'Zadejte frekvenci a počet pólů.' };
    const ns = 120 * f / poles, rows = [['Synchronní otáčky nₛ', fmt(ns, 0), 'ot/min', true], ['Počet pólových dvojic p', fmt(poles / 2, 0), '']];
    if (n > 0) { const s = (ns - n) / ns * 100; rows.push(['Skluz s', fmt(s, 2), '%', true], ['Frekvence rotoru f₂ = s · f', fmt(s / 100 * f, 2), 'Hz']); }
    return { rows, notes: ['nₛ = 60 · f / p,  s = (nₛ − n) / nₛ', 'Asynchronní motor se točí o několik procent pomaleji než synchronní otáčky (typicky 2–6 %).'] };
  },

  pf(v) {
    const P = num(v.P) * 1000, c1 = num(v.c1), c2 = num(v.c2), U = num(v.U), f = num(v.f) || 50;
    if (!(P > 0 && c1 > 0 && c1 < 1 && c2 > c1 && c2 <= 1 && U > 0)) return { err: 'Zadejte výkon, napětí a účiník před (0–1) a po kompenzaci (větší než před).' };
    const t1 = Math.tan(Math.acos(c1)), t2 = Math.tan(Math.acos(c2)), Qc = P * (t1 - t2), w = 2 * Math.PI * f;
    const three = v.sys !== '1f';
    const rows = [['Potřebný kompenzační výkon Q_C', fmt(Qc / 1000), 'kvar', true]];
    if (three) rows.push(['Kapacita na fázi – zapojení do Δ', fmt(Qc / (3 * w * U * U) * 1e6), 'µF', true], ['Kapacita na fázi – zapojení do Y', fmt(Qc / (w * U * U) * 1e6), 'µF']);
    else rows.push(['Kapacita kondenzátoru', fmt(Qc / (w * U * U) * 1e6), 'µF', true]);
    const I1 = three ? P / (SQ3 * U * c1) : P / (U * c1), I2 = three ? P / (SQ3 * U * c2) : P / (U * c2);
    rows.push(['Proud před kompenzací', fmt(I1), 'A'], ['Proud po kompenzaci', fmt(I2), 'A'], ['Snížení proudu', fmt((1 - I2 / I1) * 100, 1), '%']);
    return { rows, notes: ['Q_C = P · (tg φ₁ − tg φ₂)', three ? 'C_Δ = Q_C / (3 · ω · U²),  C_Y = Q_C / (ω · U²),  ω = 2πf' : 'C = Q_C / (ω · U²),  ω = 2πf'] };
  },

  energy(v) {
    const P = num(v.P), h = num(v.h), price = num(v.price), days = num(v.days) || 30;
    if (!(P > 0 && h >= 0)) return { err: 'Zadejte příkon spotřebiče a dobu provozu.' };
    const d = P * h / 1000, rows = [['Spotřeba za den', fmt(d), 'kWh'], ['Spotřeba za ' + fmt(days, 0) + ' dní', fmt(d * days), 'kWh', true], ['Spotřeba za rok', fmt(d * 365), 'kWh']];
    if (price > 0) rows.push(['Cena za den', fmt(d * price, 2), 'Kč'], ['Cena za ' + fmt(days, 0) + ' dní', fmt(d * days * price, 2), 'Kč', true], ['Cena za rok', fmt(d * 365 * price, 0), 'Kč', true]);
    return { rows, notes: ['E = P · t   (1 kWh = 1000 W po dobu 1 hodiny)'] };
  },


  power(v) {
    const U = num(v.U), cos = isNaN(num(v.cos)) ? 1 : num(v.cos), three = v.sys !== '1f';
    let P = num(v.P) * 1000, I = num(v.I);
    if (!(U > 0 && cos > 0 && cos <= 1)) return { err: 'Zadejte napětí a účiník (0–1).' };
    if (isNaN(P) === isNaN(I)) return { err: 'Vyplňte buď činný výkon P, nebo proud I – druhé se dopočítá.' };
    const k = three ? SQ3 * U : U;
    if (isNaN(I)) I = P / (k * cos); else P = k * I * cos;
    const S = k * I, Q = S * Math.sin(Math.acos(cos));
    return { rows: [['Proud I', fmt(I), 'A', true], ['Činný výkon P', fmt(P / 1000), 'kW', true], ['Zdánlivý výkon S', fmt(S / 1000), 'kVA'], ['Jalový výkon Q', fmt(Q / 1000), 'kvar'], ['Fázový posun φ', fmt(Math.acos(cos) * 180 / Math.PI, 1), '°']],
      notes: [three ? 'P = √3 · U · I · cos φ,  S = √3 · U · I  (U je sdružené napětí 400 V)' : 'P = U · I · cos φ,  S = U · I', 'Q = S · sin φ,  S² = P² + Q²'] };
  },

  cable(v) {
    const Ib = num(v.Ib), n = v.sys === '1f' ? 2 : 3, m = v.m || 'B1', kt = KT_PVC[v.t] || 1, kg = KG[v.g] || 1, gG = v.prot === 'gG';
    if (!(Ib > 0)) return { err: 'Zadejte výpočtový proud obvodu Ib.' };
    const tab = IZ[n][m], k = kt * kg, need = In => gG ? In * 1.6 / 1.45 : In;
    const In = nextStd(IN_STD, Ib); if (!In) return { err: 'Proud je mimo rozsah tabulek.' };
    const iRec = tab.findIndex(iz => iz * k >= need(In));
    const rows = [['Korekce na teplotu okolí kₜ', fmt(kt, 2), ''], ['Korekce na souběh obvodů kₛ', fmt(kg, 2), ''],
      ['Jistící prvek Iₙ (nejbližší ≥ Ib)', fmt(In), 'A', true], ['Nejmenší průřez Cu', iRec >= 0 ? fmt(SEC12[iRec]) : '> 120', 'mm²', true]];
    if (iRec >= 0) rows.push(['Dovolený proud zvoleného průřezu Iz′ = Iz · kₜ · kₛ', fmt(tab[iRec] * k, 1), 'A']);
    const warn = [];
    if (v.S && v.S !== 'auto') {
      const i = SEC12.indexOf(+v.S), Iz = tab[i] * k, Inmax = prevStd(IN_STD, gG ? Iz * 1.45 / 1.6 : Iz);
      rows.push(['Kontrolovaný průřez ' + fmt(+v.S) + ' mm² – Iz′', fmt(Iz, 1), 'A', true], ['Největší jistič pro tento průřez', Inmax ? fmt(Inmax) : '–', 'A', true]);
      if (!(Inmax && Inmax >= Ib)) warn.push('Průřez ' + fmt(+v.S) + ' mm² pro proud ' + fmt(Ib) + ' A nevyhovuje (podmínka Ib ≤ In ≤ Iz).');
    }
    return { rows, warn, notes: ['Podmínky ČSN 33 2000-4-43: Ib ≤ In ≤ Iz a I₂ ≤ 1,45 · Iz. Jistič (I₂ = 1,45 In) splní druhou podmínku sám, pojistka gG (I₂ = 1,6 In) potřebuje Iz ≥ 1,1 · In.',
      'Tabulka: Cu, izolace PVC, ' + n + ' zatížené žíly, ČSN 33 2000-5-52. Úbytek napětí zkontrolujte v kartě „Úbytek napětí“.'] };
  },

  loop(v) {
    const U0 = num(v.U0) || 230, In = num(v.In), ch = v.ch || 'B', Zsrc = num(v.Zsrc), L = num(v.L), S = num(v.S), rho = RHO[v.mat] || RHO.cu, Zm = num(v.Zm);
    if (!(In > 0)) return { err: 'Zadejte jmenovitý proud jističe.' };
    const Ia = MAG[ch] * In, Zmax = U0 / Ia, rows = [['Vypínací proud Iₐ = ' + MAG[ch] + ' · Iₙ (char. ' + ch + ')', fmt(Ia), 'A'], ['Největší impedance smyčky Zs = U₀ / Iₐ', fmt(Zmax, 3), 'Ω', true],
      ['Největší naměřená hodnota (× 2/3, studené vedení)', fmt(Zmax * 2 / 3, 3), 'Ω', true]];
    const warn = [];
    if (Zsrc >= 0 && L > 0 && S > 0) {
      const Zs = Zsrc + 2 * rho * L / S, Ik = U0 / Zs, Lmax = (Zmax - Zsrc) * S / (2 * rho);
      rows.push(['Vypočtená impedance smyčky na konci vedení', fmt(Zs, 3), 'Ω'], ['Zkratový proud na konci vedení Ik', fmt(Ik), 'A', true], ['Jistič vypne do 0,4 s', ok(Ik >= Ia), ''], ['Největší délka vedení pro tento jistič', Lmax > 0 ? fmt(Lmax, 0) : '0', 'm', true]);
      if (Ik < Ia) warn.push('Zkratový proud ' + fmt(Ik) + ' A nestačí k okamžitému vypnutí (potřeba ' + fmt(Ia) + ' A). Zkraťte vedení, zvětšete průřez nebo použijte chránič.');
    }
    if (Zm > 0) { const g = Zm <= Zmax * 2 / 3; rows.push(['Naměřená impedance ' + fmt(Zm, 3) + ' Ω', ok(g), '', true]); if (!g) warn.push('Naměřená impedance smyčky je příliš velká – samočinné odpojení v TN není zaručeno.'); }
    return { rows, warn, notes: ['ČSN 33 2000-4-41: v síti TN musí platit Zs · Iₐ ≤ U₀ (odpojení koncového obvodu do 32 A do 0,4 s).', 'Zs = Z zdroje (naměřená v rozvaděči) + odpor fázového a ochranného vodiče: 2 · ρ · L / S.'] };
  },

  rcd(v) {
    const IdN = num(v.Idn) / 1000, UL = num(v.UL) || 50, sel = v.type === 'S', RA = num(v.RA);
    if (!(IdN > 0)) return { err: 'Zvolte jmenovitý reziduální proud chrániče.' };
    const rows = [['Nesmí vybavit při 0,5 · IΔn', fmt(IdN * 500, 1), 'mA'], ['Musí vybavit nejpozději při IΔn', fmt(IdN * 1000, 0), 'mA'],
      ['Vybavovací čas při 1 × IΔn', sel ? '130–500' : '≤ 300', 'ms', true], ['Vybavovací čas při 2 × IΔn', sel ? '60–200' : '≤ 150', 'ms'], ['Vybavovací čas při 5 × IΔn', sel ? '50–150' : '≤ 40', 'ms'],
      ['Největší odpor uzemnění v síti TT  R_A = U_L / IΔn', fmt(UL / IdN, 0), 'Ω', true]];
    const warn = [];
    if (RA > 0) { rows.push(['Naměřený odpor uzemnění ' + fmt(RA) + ' Ω', ok(RA * IdN <= UL), '', true]); if (RA * IdN > UL) warn.push('Dotykové napětí by překročilo ' + UL + ' V.'); }
    return { rows, warn, notes: ['ČSN EN 61008-1 / 61009-1. Chránič 30 mA slouží jako doplňková ochrana (zásuvky do 32 A, koupelny, venkovní obvody – ČSN 33 2000-4-41 a -7-701).', 'Typ S (selektivní) se dává jako hlavní chránič před chrániče 30 mA.'] };
  },

  insul(v) {
    const sys = v.c || '500', R = num(v.R), lim = { selv: [250, 0.5], 500: [500, 1], 1000: [1000, 1] }[sys];
    const rows = [['Zkušební napětí', fmt(lim[0]) + ' V DC', '', true], ['Nejmenší izolační odpor', fmt(lim[1]), 'MΩ', true]];
    const warn = [];
    if (R > 0) { rows.push(['Naměřeno ' + fmt(R) + ' MΩ', ok(R >= lim[1]), '', true]); if (R < lim[1]) warn.push('Izolační odpor je pod limitem – hledejte vlhkost, poškozenou izolaci nebo připojený spotřebič.'); }
    return { rows, warn, notes: ['ČSN 33 2000-6 ed. 2, tab. 6.1. Měří se mezi živými vodiči a ochranným vodičem při odpojených spotřebičích.', 'Bývá zvykem požadovat výrazně víc než minimum – nová instalace má typicky stovky MΩ.'] };
  },

  ip(v) {
    const m = /^\s*IP\s*([0-6X])\s*([0-9X]|9K)\s*([A-D])?\s*([HMSW])?\s*$/i.exec(String(v.code || ''));
    if (!m) return { err: 'Zadejte kód krytí, např. IP44, IP20, IP65, IPX4.' };
    const D1 = ['bez ochrany', 'cizí tělesa ≥ 50 mm (hřbet ruky)', 'cizí tělesa ≥ 12,5 mm (prst)', 'cizí tělesa ≥ 2,5 mm (nástroj)', 'cizí tělesa ≥ 1 mm (drát)', 'ochrana před prachem (omezený průnik)', 'prachotěsné'];
    const D2 = ['bez ochrany', 'svisle kapající voda', 'kapající voda při naklonění do 15°', 'déšť (stříkající voda do 60° od svislice)', 'stříkající voda ze všech směrů', 'tryskající voda', 'intenzivně tryskající voda', 'dočasné ponoření (do 1 m)', 'trvalé ponoření', 'tlaková voda o vysoké teplotě (9K)'];
    const a = m[1].toUpperCase(), b = m[2].toUpperCase();
    const rows = [['1. číslice – ' + a, a === 'X' ? 'neurčeno' : D1[+a], ''], ['2. číslice – ' + b, b === 'X' ? 'neurčeno' : b === '9K' ? D2[9] : D2[+b], '']];
    if (m[3]) rows.push(['Písmeno ' + m[3].toUpperCase(), { A: 'chráněno před dotykem hřbetem ruky', B: 'prstem', C: 'nástrojem', D: 'drátem' }[m[3].toUpperCase()], '']);
    return { rows, notes: ['ČSN EN 60529. Koupelna (ČSN 33 2000-7-701): zóna 0 – IPX7, zóna 1 a 2 – IPX4 (IPX5 při tryskající vodě), venku zpravidla IP44 a více.'] };
  },

  steinmetz(v) {
    const P = num(v.P), U = num(v.U) || 230;
    if (!(P > 0)) return { err: 'Zadejte výkon motoru.' };
    const C = 70 * P * Math.pow(230 / U, 2);
    return { rows: [['Provozní kondenzátor Cₚ (≈ 70 µF/kW)', fmt(C, 0), 'µF', true], ['Rozběhový kondenzátor (2–3 × Cₚ, jen při rozběhu)', fmt(2 * C, 0) + '–' + fmt(3 * C, 0), 'µF'],
      ['Jmenovité napětí kondenzátoru', '≥ 400–450', 'V AC'], ['Dosažitelný výkon', fmt(P * 0.6, 2) + '–' + fmt(P * 0.7, 2), 'kW']],
      notes: ['Zapojení Steinmetz: motor 230/400 V zapojený do trojúhelníku na 230 V, kondenzátor mezi třetí svorku a fázi nebo nulák (podle požadovaného směru).', 'Moment je výrazně menší; vhodné jen pro lehké rozběhy (ventilátor, čerpadlo, cirkulárka naprázdno).'] };
  },

  demand(v) {
    const Pi = num(v.Pi), b = num(v.b), cos = isNaN(num(v.cos)) ? 0.95 : num(v.cos), three = v.sys !== '1f';
    if (!(Pi > 0 && b > 0 && b <= 1)) return { err: 'Zadejte instalovaný příkon a soudobost (0–1).' };
    const Pp = Pi * b, I = three ? Pp * 1000 / (SQ3 * 400 * cos) : Pp * 1000 / (230 * cos), Ih = nextStd([10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160], I);
    return { rows: [['Soudobý (výpočtový) příkon Pₚ = β · Pᵢ', fmt(Pp), 'kW', true], ['Výpočtový proud', fmt(I), 'A', true], ['Hlavní jistič (nejbližší vyšší)', (three ? '3 × ' : '') + (Ih || '> 160'), 'A', true]],
      notes: ['Orientační soudobost bytu: β ≈ 0,3–0,5 bez elektrického vytápění, 0,5–0,7 s akumulačním vytápěním. Podrobně ČSN 33 2130.', 'Hodnotu hlavního jističe je nutné dohodnout s distributorem (rezervovaný příkon).'] };
  },

  water(v) {
    const V = num(v.V), t1 = num(v.t1), t2 = num(v.t2), P = num(v.P), eta = (num(v.eta) || 95) / 100;
    if (!(V > 0 && t2 > t1 && P > 0)) return { err: 'Zadejte objem, počáteční a cílovou teplotu (vyšší) a příkon.' };
    const Q = V * 4.186 * (t2 - t1) / 3600, E = Q / eta, h = E / P;
    return { rows: [['Teplo potřebné k ohřevu', fmt(Q, 2), 'kWh'], ['Spotřeba elektřiny (se ztrátami)', fmt(E, 2), 'kWh', true], ['Doba ohřevu', Math.floor(h) + ' h ' + Math.round((h % 1) * 60) + ' min', '', true]],
      notes: ['Q = m · c · Δt,  c = 4,186 kJ/(kg·K),  1 kWh = 3600 kJ'] };
  },

  light(v) {
    const E = num(v.E), A = num(v.A), lm = num(v.lm), eta = num(v.eta) || 0.5, mf = num(v.mf) || 0.8, eff = num(v.eff);
    if (!(E > 0 && A > 0)) return { err: 'Zadejte požadovanou osvětlenost a plochu místnosti.' };
    const F = E * A / (eta * mf), rows = [['Potřebný světelný tok Φ', fmt(F, 0), 'lm', true]];
    if (lm > 0) rows.push(['Počet svítidel', String(Math.ceil(F / lm)), 'ks', true]);
    if (eff > 0) rows.push(['Příkon osvětlení', fmt(F / eff, 0), 'W']);
    return { rows, notes: ['Φ = E · A / (η · MF): η = činitel využití (0,4–0,6), MF = udržovací činitel (0,8).', 'Doporučené hodnoty podle ČSN EN 12464-1; pro byty jsou orientační.'] };
  },

  trafo(v) {
    const S = num(v.S) * 1000, U1 = num(v.U1), U2 = num(v.U2), uk = num(v.uk), three = v.sys === '3f';
    if (!(S > 0 && U1 > 0 && U2 > 0)) return { err: 'Zadejte výkon a obě napětí.' };
    const k = three ? SQ3 : 1, I1 = S / (k * U1), I2 = S / (k * U2);
    const rows = [['Převod p = U₁ / U₂', fmt(U1 / U2, 3), ''], ['Jmenovitý proud primáru I₁', fmt(I1), 'A', true], ['Jmenovitý proud sekundáru I₂', fmt(I2), 'A', true]];
    if (uk > 0) rows.push(['Zkratový proud sekundáru Ik = I₂ · 100 / uₖ', fmt(I2 * 100 / uk), 'A']);
    return { rows, notes: [three ? 'I = S / (√3 · U)' : 'I = S / U', 'Bezpečnostní transformátory pro SELV: ČSN EN 61558-2-6.'] };
  },

  awg(v) {
    const n = num(v.awg), S = num(v.S);
    if (isNaN(n) === isNaN(S)) return { err: 'Vyplňte buď číslo AWG, nebo průřez v mm².' };
    const dOf = a => 0.127 * Math.pow(92, (36 - a) / 39);
    if (!isNaN(n)) { const d = dOf(n); return { rows: [['Průměr vodiče', fmt(d, 3), 'mm'], ['Průřez', fmt(Math.PI * d * d / 4, 3), 'mm²', true]], notes: ['d = 0,127 · 92^((36 − AWG) / 39) mm'] }; }
    const d = Math.sqrt(4 * S / Math.PI), a = 36 - 39 * Math.log(d / 0.127) / Math.log(92);
    return { rows: [['Průměr vodiče', fmt(d, 3), 'mm'], ['Odpovídá AWG', fmt(a, 1), '', true], ['Nejbližší větší vodič', 'AWG ' + Math.floor(a), '', true]], notes: ['Menší číslo AWG = silnější vodič.'] };
  },

  led(v) {
    const Us = num(v.Us), n = num(v.n) || 1, Vf = num(v.Vf), I = num(v.I) / 1000;
    if (!(Us > 0 && Vf > 0 && I > 0)) return { err: 'Zadejte napájecí napětí, napětí LED a proud.' };
    if (Us <= n * Vf) return { err: 'Napájecí napětí musí být větší než součet napětí LED (' + fmt(n * Vf) + ' V).' };
    const R = (Us - n * Vf) / I, Rs = e24up(R), P = I * I * Rs;
    return { rows: [['Vypočtený odpor', eng(R, 'Ω'), '', false], ['Nejbližší vyšší řady E24', eng(Rs, 'Ω'), '', true], ['Skutečný proud', fmt((Us - n * Vf) / Rs * 1000, 1), 'mA'], ['Ztrátový výkon rezistoru', fmt(P, 3), 'W', true], ['Doporučené zatížení rezistoru', fmt(nextStd([0.125, 0.25, 0.5, 1, 2, 5], P * 2) || P * 2, 3), 'W']],
      notes: ['R = (U − n · U_LED) / I. Rezistor volte alespoň na dvojnásobek ztrátového výkonu.', 'Typická napětí LED: červená 1,8–2,1 V, žlutá ~2,1 V, zelená 2,1–3,2 V, modrá a bílá 2,9–3,4 V.'] };
  },

  rlc(v) {
    const f = num(v.f) || 50, R = num(v.R) || 0, L = num(v.L) / 1000, C = num(v.C) / 1e6, U = num(v.U), w = 2 * Math.PI * f;
    const XL = L > 0 ? w * L : 0, XC = C > 0 ? 1 / (w * C) : 0;
    if (!(R > 0 || XL > 0 || XC > 0)) return { err: 'Zadejte alespoň jednu z hodnot R, L, C.' };
    const X = XL - XC, Z = Math.hypot(R, X), rows = [];
    if (L > 0) rows.push(['Induktivní reaktance X_L = 2πfL', eng(XL, 'Ω'), '']);
    if (C > 0) rows.push(['Kapacitní reaktance X_C = 1 / (2πfC)', eng(XC, 'Ω'), '']);
    rows.push(['Impedance sériového zapojení Z', eng(Z, 'Ω'), '', true], ['Fázový posun φ', fmt(Math.atan2(X, R) * 180 / Math.PI, 1), '°'], ['Účiník cos φ', fmt(R / Z, 3), '']);
    if (L > 0 && C > 0) rows.push(['Rezonanční kmitočet f₀ = 1 / (2π√LC)', fmt(1 / (2 * Math.PI * Math.sqrt(L * C)), 1), 'Hz', true]);
    if (U > 0) rows.push(['Proud při napětí ' + fmt(U) + ' V', fmt(U / Z), 'A', true]);
    return { rows, notes: ['Z = √(R² + (X_L − X_C)²),  φ > 0 induktivní, φ < 0 kapacitní charakter.'] };
  },

  ycon(v) {
    const U = num(v.U), Z = num(v.Z), cos = isNaN(num(v.cos)) ? 1 : num(v.cos);
    if (!(U > 0 && Z > 0)) return { err: 'Zadejte sdružené napětí a impedanci jedné fáze zátěže.' };
    const Uf = U / SQ3, IY = Uf / Z, ID = SQ3 * U / Z, PY = 3 * Uf * IY * cos, PD = 3 * U * (U / Z) * cos;
    return { rows: [['Hvězda Y – napětí na fázi zátěže', fmt(Uf), 'V'], ['Hvězda Y – proud vodičem', fmt(IY), 'A', true], ['Hvězda Y – činný výkon', fmt(PY / 1000), 'kW', true],
      ['Trojúhelník Δ – napětí na fázi zátěže', fmt(U), 'V'], ['Trojúhelník Δ – proud vodičem', fmt(ID), 'A', true], ['Trojúhelník Δ – činný výkon', fmt(PD / 1000), 'kW', true],
      ['Poměr Δ : Y (proud i výkon)', '3 : 1', '']],
      notes: ['Y: U_f = U / √3, I = I_f.   Δ: U_f = U, I = √3 · I_f.', 'Proto se motory rozbíhají do hvězdy – záběrový proud i moment klesnou na třetinu.'] };
  },
};

// ------------------------------------------------------------ popis formulářů
const SYS = [['3f', 'třífázová 3×400 V'], ['1f', 'jednofázová 230 V']];
const SECOPT = SECTIONS.map(s => [String(s), fmt(s) + ' mm²']);
const SECTIONS_UI = [
  ['zaklady', 'Základy'], ['vedeni', 'Vedení a jištění'], ['revize', 'Ochrana a revize'], ['motory', 'Motory a pohony'], ['domacnost', 'Domácnost a spotřeba'], ['prevody', 'Převody a elektronika'],
];
const CARDS = [
  { sec: 'zaklady', id: 'ohm', title: 'Ohmův zákon a výkon', sub: 'Vyplňte libovolné dvě veličiny.',
    fields: [['U', 'Napětí U', 'V', ''], ['I', 'Proud I', 'A', ''], ['R', 'Odpor R', 'Ω', ''], ['P', 'Výkon P', 'W', '']] },
  { sec: 'zaklady', id: 'power', title: 'Výkon a proud 1f / 3f', sub: 'Vyplňte výkon, nebo proud.',
    fields: [['sys', 'Soustava', SYS, '3f'], ['U', 'Napětí U', 'V', '400'], ['P', 'Činný výkon P', 'kW', '10'], ['I', 'Proud I', 'A', ''], ['cos', 'Účiník cos φ', '', '0.95']] },
  { sec: 'zaklady', id: 'resist', title: 'Odpory sériově a paralelně', sub: 'Hodnoty oddělte mezerou.',
    fields: [['list', 'Odpory', 'Ω', '100 220 1k5']] },
  { sec: 'zaklady', id: 'rlc', title: 'Reaktance a impedance RLC', sub: 'Sériové zapojení, nepovinné hodnoty nechte prázdné.',
    fields: [['f', 'Kmitočet f', 'Hz', '50'], ['R', 'Odpor R', 'Ω', '100'], ['L', 'Indukčnost L', 'mH', '318'], ['C', 'Kapacita C', 'µF', ''], ['U', 'Napětí U (nepovinné)', 'V', '230']] },
  { sec: 'vedeni', id: 'cable', title: 'Průřez vodiče a jistič', sub: 'Dimenzování podle uložení, teploty a souběhu.',
    fields: [['sys', 'Obvod', [['1f', 'jednofázový (2 zatížené žíly)'], ['3f', 'třífázový (3 zatížené žíly)']], '1f'], ['Ib', 'Výpočtový proud Ib', 'A', '14'],
      ['m', 'Způsob uložení', METHODS, 'B2'], ['t', 'Teplota okolí', Object.keys(KT_PVC).map(t => [t, t + ' °C']), '30'], ['g', 'Počet obvodů v souběhu', Object.keys(KG).map(g => [g, g]), '1'],
      ['prot', 'Jistící prvek', [['mcb', 'jistič (B, C)'], ['gG', 'pojistka gG']], 'mcb'], ['S', 'Kontrolovat průřez', [['auto', '– jen navrhnout –'], ...SEC12.map(s => [String(s), fmt(s) + ' mm²'])], 'auto']] },
  { sec: 'vedeni', id: 'drop', title: 'Úbytek napětí', sub: 'Kontrola vedení k jednomu spotřebiči.',
    fields: [['sys', 'Soustava', [['1f', 'jednofázová 230 V'], ['3f', 'třífázová 3×400 V']], '1f'], ['I', 'Proud I', 'A', '16'], ['L', 'Délka vedení (jednoduchá)', 'm', '30'],
      ['S', 'Průřez S', SECOPT, '2.5'], ['mat', 'Materiál', [['cu', 'měď (Cu)'], ['al', 'hliník (Al)']], 'cu'], ['cos', 'Účiník cos φ', '', '1'], ['lim', 'Povolený úbytek', '%', '5']] },
  { sec: 'vedeni', id: 'loop', title: 'Impedance smyčky a zkrat', sub: 'Samočinné odpojení jističem v síti TN.',
    fields: [['ch', 'Charakteristika jističe', [['B', 'B (5 × In)'], ['C', 'C (10 × In)'], ['D', 'D (20 × In)']], 'B'], ['In', 'Jmenovitý proud In', IN_STD.map(x => [String(x), x + ' A']), '16'],
      ['U0', 'Napětí proti zemi U₀', 'V', '230'], ['Zsrc', 'Impedance smyčky v rozvaděči', 'Ω', '0.3'], ['L', 'Délka vedení', 'm', '40'], ['S', 'Průřez L i PE', SECOPT, '2.5'],
      ['mat', 'Materiál', [['cu', 'měď (Cu)'], ['al', 'hliník (Al)']], 'cu'], ['Zm', 'Naměřená Zs (nepovinné)', 'Ω', '']] },
  { sec: 'revize', id: 'rcd', title: 'Proudový chránič', sub: 'Zkušební hodnoty a uzemnění v síti TT.',
    fields: [['Idn', 'Reziduální proud IΔn', [['10', '10 mA'], ['30', '30 mA'], ['100', '100 mA'], ['300', '300 mA'], ['500', '500 mA']], '30'], ['type', 'Typ', [['G', 'obecný (bez zpoždění)'], ['S', 'selektivní S']], 'G'],
      ['UL', 'Dovolené dotykové napětí U_L', [['50', '50 V (běžné prostory)'], ['25', '25 V (zemědělství, zvláštní prostory)']], '50'], ['RA', 'Naměřený odpor uzemnění (nepovinné)', 'Ω', '']] },
  { sec: 'revize', id: 'insul', title: 'Izolační odpor', sub: 'Mezní hodnoty pro revizi.',
    fields: [['c', 'Obvod', [['selv', 'SELV / PELV'], ['500', 'do 500 V (230/400 V)'], ['1000', 'nad 500 V']], '500'], ['R', 'Naměřený odpor (nepovinné)', 'MΩ', '']] },
  { sec: 'revize', id: 'ip', title: 'Stupeň krytí IP', sub: 'Co znamená kód na přístroji.',
    fields: [['code', 'Kód krytí', '', 'IP44']] },
  { sec: 'motory', id: 'motor', title: 'Proud motoru a jištění', sub: 'Hodnoty ze štítku motoru.',
    fields: [['sys', 'Soustava', SYS, '3f'], ['P', 'Výkon na hřídeli P', 'kW', '5.5'], ['U', 'Napětí U', 'V', '400'], ['cos', 'Účiník cos φ', '', '0.85'], ['eta', 'Účinnost η', '%', '88'], ['k', 'Poměr záběrového proudu Iₐ/Iₙ', '×', '6.5']] },
  { sec: 'motory', id: 'speed', title: 'Otáčky a skluz', sub: 'Asynchronní motor.',
    fields: [['f', 'Frekvence f', 'Hz', '50'], ['poles', 'Počet pólů 2p', [['2', '2 (nₛ 3000)'], ['4', '4 (nₛ 1500)'], ['6', '6 (nₛ 1000)'], ['8', '8 (nₛ 750)']], '4'], ['n', 'Skutečné otáčky n (nepovinné)', 'ot/min', '1450']] },
  { sec: 'motory', id: 'ycon', title: 'Hvězda a trojúhelník', sub: 'Souměrná třífázová zátěž.',
    fields: [['U', 'Sdružené napětí U', 'V', '400'], ['Z', 'Impedance jedné fáze Z', 'Ω', '50'], ['cos', 'Účiník cos φ', '', '1']] },
  { sec: 'motory', id: 'pf', title: 'Kompenzace účiníku', sub: 'Návrh kondenzátorů.',
    fields: [['sys', 'Soustava', SYS, '3f'], ['P', 'Činný výkon P', 'kW', '10'], ['U', 'Napětí U', 'V', '400'], ['c1', 'Účiník před cos φ₁', '', '0.75'], ['c2', 'Požadovaný účiník cos φ₂', '', '0.95'], ['f', 'Frekvence', 'Hz', '50']] },
  { sec: 'motory', id: 'steinmetz', title: 'Třífázový motor na 230 V', sub: 'Kondenzátor pro zapojení Steinmetz.',
    fields: [['P', 'Výkon motoru', 'kW', '1.1'], ['U', 'Napájecí napětí', 'V', '230']] },
  { sec: 'domacnost', id: 'demand', title: 'Soudobý příkon a hlavní jistič', sub: 'Odhad pro byt nebo dům.',
    fields: [['sys', 'Přípojka', SYS, '3f'], ['Pi', 'Instalovaný příkon Pᵢ (součet)', 'kW', '30'], ['b', 'Soudobost β', '', '0.4'], ['cos', 'Účiník cos φ', '', '0.95']] },
  { sec: 'domacnost', id: 'energy', title: 'Spotřeba a cena energie', sub: 'Kolik stojí provoz spotřebiče.',
    fields: [['P', 'Příkon P', 'W', '2000'], ['h', 'Provoz za den', 'h', '3'], ['days', 'Počet dní', 'dní', '30'], ['price', 'Cena za kWh', 'Kč', '6']] },
  { sec: 'domacnost', id: 'water', title: 'Ohřev vody v bojleru', sub: 'Doba ohřevu a spotřeba.',
    fields: [['V', 'Objem', 'l', '120'], ['t1', 'Teplota studené vody', '°C', '10'], ['t2', 'Cílová teplota', '°C', '60'], ['P', 'Příkon topného tělesa', 'kW', '2'], ['eta', 'Účinnost', '%', '95']] },
  { sec: 'domacnost', id: 'light', title: 'Osvětlení místnosti', sub: 'Počet svítidel podle osvětlenosti.',
    fields: [['E', 'Požadovaná osvětlenost', [['100', '100 lx – chodba, ložnice, sklad'], ['200', '200 lx – obývací pokoj, koupelna'], ['300', '300 lx – kuchyň (celkové)'], ['500', '500 lx – pracovní plocha, kancelář, dílna']], '200'],
      ['A', 'Plocha místnosti', 'm²', '20'], ['lm', 'Světelný tok jednoho svítidla', 'lm', '1000'], ['eff', 'Měrný výkon zdroje', 'lm/W', '100'], ['eta', 'Činitel využití η', '', '0.5'], ['mf', 'Udržovací činitel MF', '', '0.8']] },
  { sec: 'prevody', id: 'trafo', title: 'Transformátor', sub: 'Proudy a převod.',
    fields: [['sys', 'Soustava', [['1f', 'jednofázový'], ['3f', 'třífázový']], '1f'], ['S', 'Výkon S', 'kVA', '0.1'], ['U1', 'Primární napětí U₁', 'V', '230'], ['U2', 'Sekundární napětí U₂', 'V', '24'], ['uk', 'Napětí nakrátko uₖ (nepovinné)', '%', '']] },
  { sec: 'prevody', id: 'awg', title: 'AWG ↔ mm²', sub: 'Americké průřezy vodičů.',
    fields: [['awg', 'Číslo AWG', '', '14'], ['S', 'Průřez', 'mm²', '']] },
  { sec: 'prevody', id: 'led', title: 'Předřadný odpor pro LED', sub: 'LED napájené stejnosměrným napětím.',
    fields: [['Us', 'Napájecí napětí', 'V', '24'], ['n', 'Počet LED v sérii', 'ks', '1'], ['Vf', 'Napětí jedné LED', 'V', '2'], ['I', 'Proud LED', 'mA', '10']] },
  { sec: 'prevody', id: 'energy0', title: '', sub: '', fields: [] },
].filter(c => c.title);

// ------------------------------------------------------------ rozhraní
function build(host) {
  if (!host || host.dataset.built) return; host.dataset.built = '1';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let html = '<div class="calctop"><input id="calcsearch" type="search" placeholder="Hledat kalkulačku… (např. jistič, chránič, LED)" autocomplete="off" spellcheck="false"><nav>' +
    SECTIONS_UI.map(([k, n]) => '<button data-jump="' + k + '">' + esc(n) + '</button>').join('') + '</nav></div>';
  for (const [sk, sn] of SECTIONS_UI) {
    html += '<h1 class="calcsec" id="sec-' + sk + '">' + esc(sn) + '</h1><div class="calcgrid" data-sec="' + sk + '">';
    for (const c of CARDS.filter(c => c.sec === sk)) {
      html += '<section class="card" data-id="' + c.id + '"><h2>' + esc(c.title) + '</h2><p class="sub">' + esc(c.sub) + '</p><div class="fields">';
      for (const [k, label, unit, def] of c.fields) {
        html += '<label><span>' + esc(label) + '</span>';
        if (Array.isArray(unit)) html += '<select name="' + k + '">' + unit.map(([v, t]) => '<option value="' + esc(v) + '"' + (v === def ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>';
        else html += '<input name="' + k + '" value="' + esc(def) + '" inputmode="decimal" autocomplete="off" spellcheck="false"><i>' + esc(unit) + '</i>';
        html += '</label>';
      }
      html += '</div><div class="out"></div></section>';
    }
    html += '</div>';
  }
  host.innerHTML = html;
  host.querySelectorAll('.card').forEach(card => {
    const run = () => {
      const v = {}; card.querySelectorAll('input,select').forEach(e => { v[e.name] = e.value; });
      let r; try { r = calc[card.dataset.id](v); } catch (e) { r = { err: 'Chyba výpočtu: ' + e.message }; }
      const out = card.querySelector('.out');
      if (r.err) { out.innerHTML = '<p class="err">' + esc(r.err) + '</p>'; return; }
      out.innerHTML = '<table>' + r.rows.map(([a, b, u, hl]) => '<tr' + (hl ? ' class="hl"' : '') + '><td>' + esc(a) + '</td><td>' + esc(b) + (u ? ' ' + esc(u) : '') + '</td></tr>').join('') + '</table>' +
        (r.warn || []).map(w => '<p class="warn">⚠ ' + esc(w) + '</p>').join('') + (r.notes || []).map(n => '<p class="note">' + esc(n) + '</p>').join('');
    };
    card.addEventListener('input', run); card.addEventListener('change', run); run();
  });
  host.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => { const t = host.querySelector('#sec-' + b.dataset.jump); host.scrollTo({ top: t.offsetTop - host.querySelector('.calctop').offsetHeight - 8, behavior: 'smooth' }); });
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  host.querySelector('#calcsearch').addEventListener('input', e => {
    const q = norm(e.target.value.trim());
    host.querySelectorAll('.card').forEach(c => { c.style.display = !q || norm(c.textContent).includes(q) ? '' : 'none'; });
    host.querySelectorAll('.calcgrid').forEach(g => { const any = [...g.children].some(c => c.style.display !== 'none'); g.style.display = any ? '' : 'none'; host.querySelector('#sec-' + g.dataset.sec).style.display = any ? '' : 'none'; });
  });
}

root.ESCalc = { calc, num, fmt, eng, build, CARDS, SECTIONS_UI };
})(typeof window !== 'undefined' ? window : globalThis);
