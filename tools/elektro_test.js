// Elektrické testy jádra.  Spuštění: jsc app/core.js tools/elektro_test.js
let fails = 0;
const ok = (c, m) => { if (!c) fails++; print((c ? 'ok   ' : 'FAIL ') + m); };
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 2);
function D() {
  const items = [];
  return { items, trailer: '',
    add(type, x, y, name) { const it = ES.newItem(type, x, y); if (name !== undefined) it.t[0] = name; items.push(it); return it; },
    w(x1, y1, x2, y2) { const it = ES.newItem(4000, x1, y1); it.n[10] = x2; it.n[11] = y2; items.push(it); } };
}
const run = (st, sec) => { for (let i = 0; i < sec * 25; i++) ES.simStep(st, 0.04); };
const V = (st, it) => Math.round(st.volt[it.uid]);

{ // 1) žárovka mezi fází a N
  const d = D(); d.add(3005, 30, 30); const h = d.add(9008, 30, 36, 'H1'); d.w(30, 30, 30, 36); d.w(30, 48, 48, 30);
  const st = ES.simStart(d); run(st, 0.2); ok(V(st, h) === 230 && st.on[h.uid], 'žárovka L1–N má 230 V a svítí (' + V(st, h) + ' V)');
}
{ // 2) dvě žárovky v sérii
  const d = D(); d.add(3005, 30, 30); const a = d.add(9008, 30, 36, 'H1'), b = d.add(9008, 30, 48, 'H2'); d.w(30, 30, 30, 36); d.w(30, 60, 48, 30);
  const st = ES.simStart(d); run(st, 0.2);
  ok(V(st, a) === 115 && V(st, b) === 115, 'dvě žárovky v sérii: na každé 115 V (' + V(st, a) + ', ' + V(st, b) + ')');
  ok(near(st.lvl[a.uid], 0.25, 0.01), 'svítí čtvrtinovým výkonem (' + st.lvl[a.uid].toFixed(2) + ')');
}
{ // 3) sdružené napětí
  const d = D(); d.add(3005, 30, 30); const h = d.add(9008, 30, 36, 'H1'); d.w(30, 30, 30, 36); d.w(30, 48, 36, 30);
  const st = ES.simStart(d); run(st, 0.2); ok(near(V(st, h), 400, 2), 'žárovka mezi L1–L2 má sdružené napětí 400 V (' + V(st, h) + ' V)');
}
{ // 4) přerušený nulák: spotřebič nesvítí, ale vodič za ním je pod napětím
  const d = D(); d.add(3005, 30, 30); const h = d.add(9008, 30, 36, 'H1'); d.w(30, 30, 30, 36); d.w(30, 48, 30, 60);
  const st = ES.simStart(d); run(st, 0.2); const g = ES.netVoltage(st, st.nets.ofKey.get('30,60'));
  ok(V(st, h) === 0 && !st.on[h.uid], 'bez nuláku žárovka nesvítí (0 V)');
  ok(g && Math.round(Math.hypot(g[0], g[1])) === 230, 'vodič za žárovkou je ale pod plným napětím 230 V proti zemi (nebezpečný dotyk)');
}
{ // 5) cívka v sérii se žárovkou nepřitáhne; samotná ano
  const d = D(); d.add(3005, 30, 30); const k = d.add(9000, 30, 36, 'K1'), h = d.add(9008, 30, 48, 'H1'); d.w(30, 30, 30, 36); d.w(30, 60, 48, 30);
  const k2 = d.add(9000, 60, 36, 'K2'); d.w(30, 30, 60, 36); d.w(60, 48, 48, 30);
  const st = ES.simStart(d); run(st, 0.2);
  ok(!st.coil.K1 && V(st, k) < 0.7 * 230, 'cívka v sérii se žárovkou nepřitáhne (' + V(st, k) + ' V)'); ok(st.coil.K2 && V(st, k2) === 230, 'cívka přímo na 230 V přitáhne');
}
{ // 6) stejnosměrných 24 V
  const d = D(); d.add(3009, 30, 30); const h = d.add(9008, 30, 36, 'H1'); d.w(30, 30, 30, 36); d.w(30, 48, 36, 30);
  const st = ES.simStart(d); run(st, 0.2); ok(V(st, h) === 24 && st.on[h.uid], 'žárovka na zdroji 24 V DC svítí (' + V(st, h) + ' V)');
}
{ // 7) zkraty a jištění
  let d = D(); d.add(3005, 30, 30); let q = d.add(6010, 30, 36, 'Q1'); d.w(30, 30, 30, 36); d.w(30, 57, 48, 30);
  let st = ES.simStart(d); ES.simPress(st, q, true); run(st, 0.2); ok(!st.brk[q.uid] && !st.short, 'zkrat L1–N za jističem: jistič vybaví (' + st.msg + ')');
  d = D(); d.add(3005, 30, 30); const f = d.add(5008, 30, 36, 'F1'); d.w(30, 30, 30, 36); d.w(30, 48, 36, 30);
  st = ES.simStart(d); run(st, 0.2); ok(st.blown[f.uid] && !st.short, 'zkrat L1–L2 za pojistkou: pojistka se přepálí');
  d = D(); d.add(3005, 30, 30); d.w(30, 30, 42, 30);
  st = ES.simStart(d); run(st, 0.2); ok(st.short, 'zkrat L1–L3 bez jištění zůstane hlášen');
  d = D(); d.add(3007, 30, 30); d.w(48, 30, 54, 30);
  st = ES.simStart(d); run(st, 0.2); ok(!st.short, 'spojení N–PE není zkrat (stejný potenciál)');
  d = D(); d.add(3007, 30, 30); q = d.add(6010, 30, 36, 'Q1'); d.w(30, 30, 30, 36); d.w(30, 57, 54, 30);
  st = ES.simStart(d); ES.simPress(st, q, true); run(st, 0.2); ok(!st.brk[q.uid], 'fáze na PE (zemní spojení): jistič vybaví');
}
function motorDoc(type, wiring) {
  const d = D(); d.add(3004, 30, 30); const f = [0, 6, 12].map(i => d.add(5008, 30 + i, 36, 'F' + (i / 6 + 1))), q = d.add(6009, 30, 54, 'Q1');
  for (const x of [30, 36, 42]) { d.w(x, 30, x, 36); d.w(x, 48, x, 54); }
  const m = d.add(type, 30, 81, 'M1');
  if (wiring === 'rev') { d.w(30, 75, 36, 81); d.w(36, 75, 30, 81); d.w(42, 75, 42, 81); } else for (const x of [30, 36, 42]) d.w(x, 75, x, 81);
  return { d, f, q, m };
}
{ // 8) třífázový motor
  let { d, f, q, m } = motorDoc(1000); let st = ES.simStart(d); ES.simPress(st, q, true); run(st, 6); let mm = st.motor[m.uid];
  ok(near(mm.U, 230, 2), 'motor 3f: na vinutí (zapojení do hvězdy) 230 V (' + mm.U.toFixed(0) + ')');
  ok(near(mm.rpm, 1450, 5) && mm.dir === 1, 'sled L1-L2-L3: ' + mm.rpm.toFixed(0) + ' ot/min vpravo');
  ok(near(mm.revs, 1450 / 60 * 6, 25), 'počítadlo otáček odpovídá (' + mm.revs.toFixed(0) + ' ot. za 6 s včetně rozběhu)');
  ES.simPress(st, f[1], true); run(st, 0.2); ok(mm.fault && mm.dir === 0, 'výpadek jedné fáze za chodu: motor ztrácí točivé pole (hlášeno „chybí fáze“)');
  run(st, 8); ok(mm.rpm === 0, 'bez fáze doběhne do klidu a znovu se nerozběhne');
  ES.simPress(st, f[1], true); run(st, 5); ok(near(mm.rpm, 1450, 5), 'po výměně pojistky se opět rozběhne');
  ({ d, f, q, m } = motorDoc(1000, 'rev')); st = ES.simStart(d); ES.simPress(st, q, true); run(st, 6); mm = st.motor[m.uid];
  ok(near(mm.rpm, -1450, 5) && mm.dir === -1, 'prohozené dvě fáze: ' + mm.rpm.toFixed(0) + ' ot/min (vlevo)');
}
{ // 9) hvězda / trojúhelník
  let { d, q, m } = motorDoc(1001); d.w(30, 105, 36, 105); d.w(36, 105, 42, 105);
  let st = ES.simStart(d); ES.simPress(st, q, true); run(st, 12); let mm = st.motor[m.uid];
  ok(mm.mode === 'Y' && near(mm.U, 230, 2) && near(mm.tau, 1 / 3, 0.01), 'hvězda: 230 V na vinutí, moment 1/3 (' + (mm.tau * 100).toFixed(0) + ' %)');
  ok(near(mm.rpm, 1350, 5) && mm.dir === 1, 'hvězda: ' + mm.rpm.toFixed(0) + ' ot/min');
  ({ d, q, m } = motorDoc(1001)); d.w(30, 81, 30, 105); d.w(36, 81, 36, 105); d.w(42, 81, 42, 105);
  st = ES.simStart(d); ES.simPress(st, q, true); run(st, 6); mm = st.motor[m.uid];
  ok(mm.mode === 'D' && near(mm.U, 400, 2) && near(mm.tau, 1, 0.01), 'trojúhelník: 400 V na vinutí, plný moment');
  ok(near(mm.rpm, 1450, 5) && mm.dir === 1, 'trojúhelník: ' + mm.rpm.toFixed(0) + ' ot/min, stejný směr jako ve hvězdě');
  ({ d, q, m } = motorDoc(1001)); st = ES.simStart(d); ES.simPress(st, q, true); run(st, 2); mm = st.motor[m.uid];
  ok(mm.rpm === 0 && !mm.mode, 'Y/Δ motor s nezapojenými konci vinutí stojí');
}
{ // 10) jednofázový motor
  const d = D(); d.add(3003, 30, 30); const m = d.add(1002, 30, 42, 'M1'); d.w(30, 30, 30, 42); d.w(36, 30, 42, 42);
  const st = ES.simStart(d); run(st, 6); ok(near(st.motor[m.uid].rpm, 1450, 5), 'jednofázový motor L–N běží (' + st.motor[m.uid].rpm.toFixed(0) + ' ot/min)');
}
// ---------------- měřicí přístroje a ochrany
const M = (st, it) => st.meas[it.uid];
{ // 11) voltmetr a ampérmetr
  const d = D(); d.add(3005, 30, 30);
  const v1 = d.add(20001, 60, 36, 'PV1'); d.w(30, 30, 60, 36); d.w(60, 48, 48, 30);      // L1–N
  const v2 = d.add(20001, 90, 36, 'PV2'); d.w(30, 30, 90, 36); d.w(90, 48, 36, 30);      // L1–L2
  const a = d.add(20002, 120, 36, 'PA1'), k = d.add(9000, 120, 48, 'K1'); d.w(30, 30, 120, 36); d.w(120, 60, 48, 30);
  const st = ES.simStart(d); run(st, 0.2);
  ok(near(M(st, v1).V, 230, 1) && near(M(st, v2).V, 400, 2), 'voltmetr: L1–N ' + M(st, v1).V.toFixed(0) + ' V, L1–L2 ' + M(st, v2).V.toFixed(0) + ' V');
  ok(near(M(st, a).I, 8 / 230, 0.0005) && st.coil.K1, 'ampérmetr v sérii s cívkou 8 W: ' + (M(st, a).I * 1000).toFixed(1) + ' mA a cívka přitáhne');
  const d2 = D(); d2.add(3005, 30, 30); const q = d2.add(6010, 30, 36, 'Q1'), a2 = d2.add(20002, 30, 60, 'PA1'); d2.w(30, 30, 30, 36); d2.w(30, 57, 30, 60); d2.w(30, 72, 48, 30);
  const st2 = ES.simStart(d2); ES.simPress(st2, q, true); run(st2, 0.2);
  ok(!st2.brk[q.uid], 'ampérmetr připojený přímo na L1–N je zkrat: jistič vybaví');
}
{ // 12) proud motoru: rozběh a ustálený chod
  let { d, q, m } = motorDoc(1000); const a = d.add(20002, 60, 36, 'PA'); // ampérmetr zvlášť (jen kontrola, že nevadí)
  let st = ES.simStart(d); ES.simPress(st, q, true); run(st, 0.08); const mm = st.motor[m.uid], Ia = mm.I; run(st, 8);
  ok(near(mm.In, 7.9, 0.1) && near(mm.I, mm.In, 0.15), 'motor 4 kW: jmenovitý proud ' + mm.In.toFixed(2) + ' A, v ustáleném chodu ' + mm.I.toFixed(2) + ' A');
  ok(Ia > 5.5 * mm.In, 'záběrový proud při rozběhu ' + Ia.toFixed(1) + ' A (≈ 6 × Iₙ)');
  ({ d, q, m } = motorDoc(1001)); d.w(30, 81, 30, 105); d.w(36, 81, 36, 105); d.w(42, 81, 42, 105);
  st = ES.simStart(d); ES.simPress(st, q, true); run(st, 8); let md = st.motor[m.uid];
  ok(near(md.I, md.In, 0.3), 'motor 7,5 kW v Δ: proud přívodem ' + md.I.toFixed(1) + ' A (Iₙ ' + md.In.toFixed(1) + ' A)');
  ({ d, q, m } = motorDoc(1001)); d.w(30, 105, 36, 105); d.w(36, 105, 42, 105);
  st = ES.simStart(d); ES.simPress(st, q, true); run(st, 0.08); md = st.motor[m.uid];
  ok(near(md.I, 2 * md.In, 1.5), 'rozběh ve hvězdě: záběrový proud ' + md.I.toFixed(1) + ' A ≈ ⅓ přímého rozběhu (2 × Iₙ)');
}
function starterDoc(Ir, withStarter) {
  const d = D(); d.add(3004, 30, 30); const f = [0, 6, 12].map(i => d.add(5008, 30 + i, 36, 'F' + (i / 6 + 1)));
  const q = d.add(withStarter === false ? 6007 : 20004, 30, 54, 'Q1'); q.t[8] = String(Ir);
  for (const x of [30, 36, 42]) { d.w(x, 30, x, 36); d.w(x, 48, x, 54); }
  const m = d.add(1000, 30, 81, 'M1'); for (const x of [30, 36, 42]) d.w(x, withStarter === false ? 66 : 75, x, 81);
  return { d, f, q, m };
}
{ // 13) motorový spouštěč
  let { d, f, q, m } = starterDoc(10); let st = ES.simStart(d); ES.simPress(st, q, true); run(st, 40);
  ok(st.brk[q.uid] && near(st.motor[m.uid].rpm, 1450, 5), 'spouštěč Iᵣ 10 A: motor 4 kW se rozběhne a 40 s běží bez vybavení');
  ES.simPress(st, f[2], true); let t0 = st.t; while (st.brk[q.uid] && st.t - t0 < 60) run(st, 0.2);
  ok(!st.brk[q.uid] && st.t - t0 > 15 && st.t - t0 < 45, 'výpadek fáze → motor stojí, proud dvěma fázemi ≈ 5 × Iₙ → spouštěč vybaví za ' + (st.t - t0).toFixed(1) + ' s');
  ({ d, f, q, m } = starterDoc(4)); st = ES.simStart(d); ES.simPress(st, q, true); t0 = st.t; while (st.brk[q.uid] && st.t - t0 < 300) run(st, 0.2);
  ok(!st.brk[q.uid] && st.t - t0 > 30, 'spouštěč nastavený pod jmenovitý proud (4 A na 7,9 A) vybaví přetížením za ' + (st.t - t0).toFixed(0) + ' s');
  ({ d, f, q, m } = starterDoc(10, false)); st = ES.simStart(d); run(st, 5); ES.simPress(st, f[0], true); t0 = st.t; while (!st.trip.Q1 && st.t - t0 < 60) run(st, 0.2);
  ok(st.trip.Q1 && st.t - t0 < 45, 'tepelné relé s nastavením 10 A při výpadku fáze samo vybaví za ' + (st.t - t0).toFixed(1) + ' s');
}
{ // 14) transformátor 230/24 V
  const d = D(); d.add(3007, 30, 30); const q = d.add(6008, 30, 36, 'Q1'); d.w(30, 30, 30, 36); d.w(48, 30, 36, 36);   // jistič L1+N
  const t = d.add(20003, 30, 66, 'T1'); d.w(30, 57, 30, 66); d.w(36, 57, 36, 66);
  const h = d.add(9008, 30, 96, 'H1'), v = d.add(20001, 60, 96, 'PV'); d.w(30, 90, 30, 96); d.w(30, 108, 36, 108); d.w(36, 90, 36, 108);
  d.w(30, 90, 60, 96); d.w(60, 108, 36, 108); d.w(36, 108, 54, 30);   // 0 V sekundáru uzemněna na PE
  const st = ES.simStart(d); run(st, 0.3);
  ok(!st.on[h.uid] && M(st, v).V < 1, 'bez zapnutého jističe je sekundár bez napětí');
  ES.simPress(st, q, true); run(st, 0.3);
  ok(st.on[h.uid] && near(M(st, v).V, 24, 0.1) && M(st, h).Un === 24, 'po zapnutí: sekundár 24 V, signálka 24 V svítí (' + M(st, v).V.toFixed(1) + ' V)');
  ok(!st.short, 'uzemnění 0 V sekundáru na PE není zkrat');
  ok(near(M(st, t).Is, 2 / 24, 0.002), 'proud sekundárem ' + (M(st, t).Is * 1000).toFixed(0) + ' mA (signálka 2 W / 24 V)');
  const d2 = D(); d2.add(3005, 30, 30); d2.add(20003, 30, 36, 'T1'); d2.w(30, 30, 30, 36); d2.w(48, 30, 36, 36);
  const f = d2.add(5008, 30, 60, 'F2'); d2.w(30, 60, 30, 60); d2.w(30, 72, 36, 60);  // pojistka nakrátko přes sekundár
  const st2 = ES.simStart(d2); run(st2, 0.3); ok(st2.blown[f.uid], 'zkrat na sekundáru přepálí pojistku na sekundární straně');
}
{ // 15) proudový chránič 30 mA
  const mk = (n2) => { const d = D(); d.add(3007, 30, 30); const fi = d.add(20005, 30, 36, 'FI1'); d.w(30, 30, 30, 36); d.w(48, 30, 36, 36);
    const k = d.add(9000, 30, 66, 'K1'); d.w(30, 57, 30, 66); d.w(30, 78, n2 === 'PE' ? 54 : 36, n2 === 'PE' ? 30 : 57); return { d, fi, k }; };
  let { d, fi, k } = mk('N'); let st = ES.simStart(d); ES.simPress(st, fi, true); run(st, 0.5);
  ok(st.brk[fi.uid] && st.coil.K1 && M(st, fi).res < 0.001, 'cívka zapojená L–N za chráničem: chránič drží (únik ' + (M(st, fi).res * 1000).toFixed(1) + ' mA)');
  ES.simPress(st, fi, true); run(st, 0.1); ok(!st.brk[fi.uid] && /TEST/.test(st.msg), 'tlačítko TEST chránič vybaví');
  ({ d, fi, k } = mk('PE')); st = ES.simStart(d); ES.simPress(st, fi, true); run(st, 0.5);
  ok(!st.brk[fi.uid], 'cívka 8 W vracející proud přes PE (únik 35 mA): chránič vybaví (' + st.msg + ')');
  const d3 = D(); d3.add(3007, 30, 30); const f3 = d3.add(20005, 30, 36, 'FI1'); d3.w(30, 30, 30, 36); d3.w(48, 30, 36, 36); d3.w(30, 57, 54, 30);
  st = ES.simStart(d3); ES.simPress(st, f3, true); run(st, 0.2); ok(!st.brk[f3.uid], 'zemní spojení L–PE za chráničem: chránič vybaví');
}
print(fails ? '\n' + fails + ' TESTŮ SELHALO' : '\nvšechny elektrické testy prošly');
