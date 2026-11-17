// jsc app/core.js app/real.js tools/domov3f_test.js
let fails = 0; const ok = (c, m) => { if (!c) { fails++; print('FAIL: ' + m); } else print('ok: ' + m); };
function mk() { const d = { items: [], real: ES.emptyReal() }; d.P = (t, n, ex) => { const it = ES.newItem(t, 0, 0); it.t[0] = n; if (ex) for (const k in ex) it.t[k] = ex[k]; d.items.push(it); return it; };
  d.w = (a, i, b, j) => d.real.wires.push({ a: [a.uid, i], b: [b.uid, j], c: '#000', p: [] }); return d; }
const run = (st, s) => { for (let i = 0; i < s * 25; i++) ES.simStep(st, 0.04); };
{ // přípojka 3f -> elektroměr 3f -> chránič 4P -> zásuvka CEE + sporák
  const d = mk(), X = d.P(3007, '-X'), P = d.P(20130, '-P1'), FI = d.P(20006, '-FI1'), XS = d.P(20131, '-XS1', { 9: '6900' }), E = d.P(20133, '-E1', { 9: '6900' });
  for (let i = 0; i < 4; i++) { d.w(X, i, P, i); d.w(P, 4 + i, FI, i); d.w(FI, 4 + i, XS, i); d.w(FI, 4 + i, E, i); }
  d.w(X, 4, XS, 4); d.w(X, 4, E, 4);
  const st = ES.simStart(d, true); st.byUid = new Map(st.comps.map(c => [c.it.uid, c])); ES.simPress(st, FI, true); run(st, 0.2);
  let m = st.meas[XS.uid]; ok(m.rot === 'R' && Math.abs(m.Ull[0] - 400) < 2 && m.pe && m.n, 'CEE zásuvka: 400 V, pravotočivé pole, N a PE připojeny');
  ES.simPress(st, XS, true); ES.simPress(st, E, true); run(st, 0.5);
  const pm = st.meas[P.uid]; ok(Math.abs(pm.P - 13800) < 150 && Math.abs(pm.I[0] - 20) < 0.5, 'elektroměr 3f: ' + Math.round(pm.P) + ' W, ' + pm.I.map(x => x.toFixed(1)).join('/') + ' A');
  ok(!st.msg && !st.short, 'bez vybavení chrániče (souměrná zátěž, N vrací proud přes chránič)');
  // prohozené fáze -> levotočivé
  const d2 = mk(), X2 = d2.P(3007, '-X'), S2 = d2.P(20131, '-XS2'); d2.w(X2, 0, S2, 1); d2.w(X2, 1, S2, 0); d2.w(X2, 2, S2, 2); d2.w(X2, 3, S2, 3); d2.w(X2, 4, S2, 4);
  const st2 = ES.simStart(d2, true); run(st2, 0.1); ok(st2.meas[S2.uid].rot === 'L', 'prohozené L1/L2 = levotočivé pole');
  const d3 = mk(), X3 = d3.P(3007, '-X'), S3 = d3.P(20131, '-XS3'); d3.w(X3, 0, S3, 0); d3.w(X3, 1, S3, 1); d3.w(X3, 3, S3, 3);
  const st3 = ES.simStart(d3, true); run(st3, 0.1); ok(st3.meas[S3.uid].live === 2 && st3.meas[S3.uid].rot === '' && !st3.meas[S3.uid].pe, 'chybí L3 a PE: rozpoznáno');
}
{ // spínací hodiny, časové relé, bojler přes instalační stykač, termostat, ventilátor
  const d = mk(), X = d.P(3008, '-X'), C = d.P(20138, '-KT1', { 5: '2', 6: '3' }), K = d.P(9000, '-KM1'), KM = d.P(2000, '-KM1'), B = d.P(20134, '-E2', { 9: '2000' });
  const T = d.P(20136, '-B1'), KT = d.P(9004, '-KT2', { 5: '2' }), KTc = d.P(7004, '-KT2'), F = d.P(20135, '-M1');
  d.w(X, 0, C, 0); d.w(C, 1, K, 0); d.w(X, 1, K, 1); d.w(X, 0, KM, 0); d.w(KM, 2, B, 0); d.w(X, 1, KM, 1); d.w(KM, 3, B, 1);
  d.w(X, 0, T, 0); d.w(T, 1, KT, 0); d.w(X, 1, KT, 1); d.w(X, 0, KTc, 0); d.w(KTc, 1, F, 0); d.w(X, 1, F, 1);
  const st = ES.simStart(d, true); st.byUid = new Map(st.comps.map(c => [c.it.uid, c]));
  run(st, 1); ok(st.on[B.uid], 'spínací hodiny: v čase 1 s (zap 2 s) bojler topí');
  run(st, 2); ok(!st.on[B.uid], 'v čase 3 s (vyp 3 s) bojler netopí'); run(st, 2.2); ok(st.on[B.uid], 'v čase 5,2 s znovu topí');
  ES.simPress(st, T, true); run(st, 1); ok(!st.on[F.uid], 'termostat sepnul, časové relé ještě čeká'); run(st, 1.5); ok(st.on[F.uid], 'po 2 s časové relé zapne ventilátor');
}
print(fails ? fails + ' CHYB' : 'VŠE OK');
