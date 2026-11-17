// Ukázka třífázové domovní instalace: jsc app/core.js app/real.js tools/demo_domov3f.js [-- test]
const R = ES.Real, TEST = typeof arguments !== 'undefined' && arguments[0] === 'test';
const doc = { items: [], trailer: ES.DEFAULT_TRAILER, real: ES.emptyReal() };
function put(type, name, x, y, ex) { const it = ES.newItem(type, x, y); it.t[0] = name; if (ex) for (const k in ex) it.t[k] = ex[k]; doc.items.push(it); return it; }
const X0 = put(3007, '-X0', 30, 18), P1 = put(20130, '-P1', 30, 36), Q0 = put(2004, '-Q0', 30, 66), FI = put(20006, '-FI1', 30, 93);
const F1 = put(6009, '-F1', 30, 138), F2 = put(6009, '-F2', 105, 138), F3 = put(6010, '-F3', 180, 138);
const XN = put(20118, '-XN', 234, 90), XPE = put(20118, '-XPE', 234, 114);
const XS = put(20131, '-XS1', 30, 192, { 9: '4000' }), E1 = put(20133, '-E1', 105, 192, { 9: '7500' });
const KT = put(20138, '-KT1', 186, 186, { 5: '4', 6: '4' }), K = put(9000, '-KM1', 216, 186), KM = put(2000, '-KM1', 246, 186), B = put(20134, '-E2', 291, 189, { 9: '2000' });
const T = (it, i) => [it.uid, i], W = (a, i, b, j, c) => doc.real.wires.push({ a: T(a, i), b: T(b, j), c, p: [] });
const L = ['#7a4a22', '#1b1b1b', '#8d8d8d'], N = '#2f80ed', PE = 'gnye';
for (let i = 0; i < 3; i++) { W(X0, i, P1, i, L[i]); W(P1, 4 + i, Q0, i, L[i]); W(Q0, 3 + i, FI, i, L[i]); W(FI, 4 + i, F1, i, L[i]); W(F1, i, F2, i, L[i]); W(F1, 3 + i, XS, i, L[i]); W(F2, 3 + i, E1, i, L[i]); }
W(X0, 3, P1, 3, N); W(P1, 7, FI, 3, N); W(FI, 7, XN, 0, N); W(XN, 1, XS, 3, N); W(XN, 2, E1, 3, N); W(XN, 3, K, 1, N); W(XN, 4, KM, 1, N);
W(X0, 4, XPE, 0, PE); W(XPE, 1, XS, 4, PE); W(XPE, 2, E1, 4, PE); W(XPE, 3, B, 2, PE);
W(F2, 0, F3, 0, L[0]); W(F3, 1, KT, 0, L[0]); W(KT, 1, K, 0, L[1]); W(F3, 1, KM, 0, L[0]); W(KM, 2, B, 0, L[1]); W(KM, 3, B, 1, N);
{ const f = R.wireFunc(doc); for (const w of doc.real.wires) w.c = R.normColor(doc, w, '60445', f)[0]; } // barvy podle ČSN EN IEC 60445
const res = R.schemaFromReal(doc);
if (!TEST) print(ES.serializeCad(doc)); else {
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; print('FAIL: ' + m); } else print('ok: ' + m); };
  ok(!res.missing.length && !res.extra.length && !res.failed && !res.conflicts, 'schéma nakresleno (' + res.wires + ' úseků)');
  for (const real of [true, false]) {
    const st = ES.simStart(doc, real), run = s => { for (let i = 0; i < s * 25; i++) ES.simStep(st, 0.04); }, m = real ? 'realita: ' : 'schéma: ';
    for (const it of [Q0, FI, F1, F2, F3]) ES.simPress(st, it, true); ES.simPress(st, XS, true); ES.simPress(st, E1, true); run(1);
    const P = st.meas[P1.uid].P; ok(st.meas[XS.uid].rot === 'R' && Math.abs(P - 13500) < 200, m + 'zásuvka pravotočivá, sporák i spotřebič v zásuvce běží, bojler topí: ' + Math.round(P) + ' W');
    run(4); ok(Math.abs(st.meas[P1.uid].P - 11500) < 200 && !st.msg, m + 'hodiny vypnou bojler: ' + Math.round(st.meas[P1.uid].P) + ' W');
  }
  print(fails ? fails + ' CHYB' : 'VŠE OK');
}
