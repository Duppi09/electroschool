// Ukázka domovní instalace: jsc app/core.js app/real.js tools/demo_domov.js [-- test]
// Zapojení se nadefinuje v realitě (vodiče mezi svorkami) a schéma se z něj nakreslí automaticky.
const R = ES.Real, TEST = typeof arguments !== 'undefined' && arguments[0] === 'test';
const doc = { items: [], trailer: ES.DEFAULT_TRAILER, real: ES.emptyReal() };
function put(type, name, x, y, extra) { const it = ES.newItem(type, x, y); it.t[0] = name; if (extra) for (const k in extra) it.t[k] = extra[k]; doc.items.push(it); return it; }
// schéma: rozvodnice vlevo nahoře, okruhy vedle sebe
const X0 = put(3008, '-X0', 30, 24), P1 = put(20116, '-P1', 30, 42), FI = put(20005, '-FI1', 30, 72);
const F1 = put(6010, '-F1', 30, 117), F2 = put(6010, '-F2', 105, 117), XN = put(20118, '-XN', 156, 66), XPE = put(20118, '-XPE', 156, 90);
const S1 = put(20106, '-S1', 30, 165), S2 = put(20107, '-S2', 60, 165), S3 = put(20106, '-S3', 90, 165), E1 = put(20111, '-E1', 129, 168, { 9: '60' });
const XS = put(20110, '-XS1', 165, 165, { 9: '2000' });
const B1 = put(20108, '-SB1', 216, 165), B2 = put(20108, '-SB2', 246, 165), K1 = put(20113, '-K1', 276, 165), K1c = put(7000, '-K1', 306, 165), E2 = put(20111, '-E2', 336, 168, { 9: '40' });
// realita: vodiče
const T = (it, lab) => { const d = ES.getDef(it.type); const i = d.kind === 'supply' ? d.pots.indexOf(lab === 'L' ? 'L1' : lab) : (it.t.slice(2, 2 + d.terms.length).findIndex(l => l === lab)); if (i < 0) throw new Error('svorka ' + it.t[0] + ':' + lab); return [it.uid, i]; };
const W = (a, la, b, lb, c) => doc.real.wires.push({ a: T(a, la), b: T(b, lb), c, p: [] });
const BR = '#7a4a22', BL = '#2f80ed', GY = 'gnye', BK = '#1b1b1b', GR = '#8d8d8d';
W(X0, 'L', P1, '1', BR); W(X0, 'N', P1, '4', BL); W(X0, 'PE', XPE, '1', GY);
W(P1, '3', FI, '1', BR); W(P1, '6', FI, 'N', BL);
FI.t[4] = '2'; FI.t[5] = 'N′';  // výstupní svorky chrániče
W(FI, '2', F1, '1', BR); W(F1, '1', F2, '1', BR); W(FI, 'N′', XN, '1', BL);
// schodišťové zapojení č. 6 – č. 7 – č. 6
W(F1, '2', S1, 'L', BR); W(S1, '1', S2, '1', BK); W(S1, '2', S2, '2', GR); W(S2, '3', S3, '1', BK); W(S2, '4', S3, '2', GR); W(S3, 'L', E1, 'L', BK);
W(XN, '2', E1, 'N', BL); W(XPE, '2', E1, 'PE', GY);
// zásuvkový okruh
W(F2, '2', XS, 'L', BR); W(XN, '3', XS, 'N', BL); W(XPE, '3', XS, 'PE', GY);
// impulsní relé ovládané dvěma tlačítky
W(F1, '2', B1, 'L', BR); W(B1, 'L', B2, 'L', BR); W(B1, '1', K1, 'A1', BK); W(B2, '1', K1, 'A1', BK); W(XN, '4', K1, 'A2', BL);
W(F1, '2', K1c, '13', BR); W(K1c, '14', E2, 'L', BK); W(XN, '5', E2, 'N', BL); W(XPE, '4', E2, 'PE', GY);
{ const f = R.wireFunc(doc); for (const w of doc.real.wires) w.c = R.normColor(doc, w, '60445', f)[0]; } // barvy podle ČSN EN IEC 60445
const res = R.schemaFromReal(doc);
if (!TEST) { print(ES.serializeCad(doc)); } else {
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; print('FAIL: ' + m); } else print('ok: ' + m); };
  ok(!res.missing.length && !res.extra.length && !res.failed && !res.conflicts, 'schéma nakresleno podle reality (' + res.wires + ' úseků)');
  for (const real of [true, false]) {
    const st = ES.simStart(doc, real); const run = s => { for (let i = 0; i < s * 25; i++) ES.simStep(st, 0.04); };
    const lit = e => !!st.on[e.uid], tap = it => { ES.simPress(st, it, true); run(0.2); ES.simPress(st, it, false); run(0.2); };
    const m = real ? 'realita: ' : 'schéma: ';
    for (const it of [FI, F1, F2]) ES.simPress(st, it, true); run(0.3);
    ok(!st.short, m + 'po zapnutí jističů bez zkratu, E1 ' + (lit(E1) ? 'svítí' : 'nesvítí'));
    for (const sw of [S1, S2, S3, S2, S1, S3]) { const was = lit(E1); tap(sw); ok(lit(E1) !== was, m + sw.t[0] + ' (č. ' + ES.getDef(sw.type).v + ') přepne světlo E1 → ' + (lit(E1) ? 'svítí' : 'zhasnuto')); }
    ES.simPress(st, XS, true); run(1);
    const I = st.meas[XS.uid].I; ok(Math.abs(I - 2000 / 230) < 0.1 && st.meas[XS.uid].pe, m + 'zásuvka: spotřebič 2 kW bere ' + I.toFixed(2) + ' A, PE připojen');
    ok(Math.abs(st.meas[P1.uid].P - 2000 - (lit(E1) ? 60 : 0)) < 30, m + 'elektroměr ukazuje ' + Math.round(st.meas[P1.uid].P) + ' W');
    tap(B1); ok(lit(E2), m + 'impulsní relé: 1. stisk SB1 rozsvítí E2'); tap(B2); ok(!lit(E2), m + '2. stisk (SB2) zhasne'); tap(B2); ok(lit(E2), m + '3. stisk znovu rozsvítí');
    ok(Math.abs(st.meas[P1.uid].P - 2040 - (lit(E1) ? 60 : 0)) < 40, m + 'elektroměr s E2 ' + Math.round(st.meas[P1.uid].P) + ' W');
    ok(!st.short && !st.msg, m + 'bez zkratu a vybavení');
  }
  // chránič: unikající proud přes PE (fáze na kolík zásuvky)
  { const d2 = ES.parseCad(ES.serializeCad(doc)); const xs = d2.items.find(i => i.type === 20110), f1 = d2.items.find(i => ES.norm(i.t[0]) === 'F1');
    d2.real.wires.push({ a: [f1.uid, 1], b: [xs.uid, 2], c: BR, p: [] });
    const st = ES.simStart(d2, true); for (const it of d2.items) if ([20005, 6010].includes(it.type)) ES.simPress(st, it, true); for (let i = 0; i < 10; i++) ES.simStep(st, 0.04);
    ok(/chránič|Zkrat/.test(st.msg), 'chyba zapojení (fáze na PE) vybaví ochranu: ' + st.msg); }
  // schodišťový automat a čidlo
  { const d3 = { items: [], real: ES.emptyReal() }; const P = (t, n) => { const it = ES.newItem(t, 0, 0); it.t[0] = n; d3.items.push(it); return it; };
    const x = P(3008, '-X'), b = P(20108, '-SB1'), k = P(20114, '-K2'), kc = P(7000, '-K2'), e = P(20111, '-E3'), pir = P(20115, '-B1'), e4 = P(20111, '-E4');
    k.t[5] = '5'; pir.t[5] = '3';
    const w = (a, i, c, j) => d3.real.wires.push({ a: [a.uid, i], b: [c.uid, j], c: BR, p: [] });
    w(x, 0, b, 0); w(b, 1, k, 0); w(x, 1, k, 1); w(x, 0, kc, 0); w(kc, 1, e, 0); w(x, 1, e, 1); w(x, 0, pir, 0); w(pir, 1, e4, 0); w(x, 1, e4, 1); w(x, 1, pir, 2);
    const st = ES.simStart(d3, true), run = s => { for (let i = 0; i < s * 25; i++) ES.simStep(st, 0.04); };
    ES.simPress(st, b, true); run(0.2); ES.simPress(st, b, false); run(1);
    ok(st.on[e.uid], 'schodišťový automat po stisku svítí'); run(4.5); ok(!st.on[e.uid], 'po 5 s zhasne');
    ES.simPress(st, pir, true); run(0.5); ok(st.on[e4.uid], 'pohybové čidlo rozsvítí'); run(3); ok(!st.on[e4.uid], 'po doběhu 3 s zhasne'); }
  // sériový spínač: dvě kolébky
  { const d4 = { items: [], real: ES.emptyReal() }; const P = (t, n) => { const it = ES.newItem(t, 0, 0); it.t[0] = n; d4.items.push(it); return it; };
    const x = P(3008, '-X'), s5 = P(20105, '-S5'), a = P(20111, '-E5'), c = P(20111, '-E6');
    const w = (p, i, q, j) => d4.real.wires.push({ a: [p.uid, i], b: [q.uid, j], c: BR, p: [] });
    w(x, 0, s5, 0); w(s5, 1, a, 0); w(s5, 2, c, 0); w(x, 1, a, 1); w(x, 1, c, 1);
    const st = ES.simStart(d4, true), run = () => { for (let i = 0; i < 5; i++) ES.simStep(st, 0.04); };
    ES.simPress(st, s5, true, false, 1); run(); ok(!st.on[a.uid] && st.on[c.uid], 'č. 5: pravá kolébka spíná jen E6');
    ES.simPress(st, s5, true, false, 0); run(); ok(st.on[a.uid] && st.on[c.uid], 'č. 5: obě kolébky = obě svítidla'); }
  print(fails ? fails + ' CHYB' : 'VŠE OK');
}
