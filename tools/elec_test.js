// Testy elektrotechniky a Arduina.  Spuštění: jsc app/core.js app/elec.js tools/elec_test.js
let fails = 0; const ok = (c, m) => { if (!c) { fails++; print('FAIL: ' + m); } else print('ok: ' + m); };
const E = ES.Elec;
// schéma z prvků a vodičů; prvek = [kód, x, y, {t6:..}], vodič = [x1,y1,x2,y2]
function mk(parts, wires) {
  const doc = { items: [], trailer: ES.DEFAULT_TRAILER }, its = [];
  for (const [code, x, y, p] of parts) { const it = ES.newItem(code, x, y); for (const k in (p || {})) { if (k === 'sketch') E.setSketch(it, p[k]); else it.t[+k.slice(1)] = String(p[k]); } it.t[0] = (ES.getDef(code).pre || 'X') + its.length; doc.items.push(it); its.push(it); }
  for (const [a, b, c, d] of wires) { const w = ES.newItem(4000, a, b); w.n[10] = c; w.n[11] = d; doc.items.push(w); }
  return { doc, its };
}
function run(doc, secs, dt) { const st = ES.simStart(doc, false); st.byUid = new Map(st.comps.map(c => [c.it.uid, c])); let t = 0; while (t < secs - 1e-9) { ES.simStep(st, dt || 0.04); t += dt || 0.04; } return st; }
const res = (st, it) => st.elec.res[it.uid];
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// 1) baterie 9 V – rezistor 1 kΩ – LED červená: I ≈ (9 − 1,9) / 1000 ≈ 7 mA
{ // baterie (0,0)+ / (0,12)−; rezistor na x=12; LED na x=24
  const { doc, its } = mk([[20200, 0, 0, { t6: 9, t7: 0 }], [20210, 12, 0, { t6: '1k' }], [20222, 24, 0]],
    [[0, 0, 12, 0], [12, 12, 24, 0], [24, 12, 0, 12]]);
  // pozn.: vodiče jen spojují body, geometrie nevadí
  const st = run(doc, 0.2), I = res(st, its[2]).I;
  ok(near(I, 0.0071, 0.0006), 'LED s rezistorem 1 kΩ: ' + (I * 1000).toFixed(2) + ' mA');
  ok(res(st, its[2]).bright > 0.3 && !res(st, its[2]).burnt, 'LED svítí a nespálila se');
  ok(near(res(st, its[1]).V, 7.1, 0.1), 'na rezistoru ' + res(st, its[1]).V.toFixed(2) + ' V');
}
// 2) LED přímo na 9 V baterii se spálí
{ const { doc, its } = mk([[20200, 0, 0, { t6: 9 }], [20222, 12, 0]], [[0, 0, 12, 0], [12, 12, 0, 12]]);
  const st = run(doc, 0.2); ok(res(st, its[1]).burnt, 'LED bez rezistoru se spálí'); ok(/spálila/.test(st.msg), 'hláška: ' + st.msg); }
// 3) dělič napětí a voltmetr
{ const { doc, its } = mk([[20200, 0, 0, { t6: 12, t7: 0 }], [20210, 12, 0, { t6: '2k' }], [20210, 24, 0, { t6: '1k' }], [20204, 36, 0], [20202, 0, 30]],
    [[0, 0, 12, 0], [12, 12, 24, 0], [24, 12, 0, 12], [24, 0, 36, 0], [36, 12, 0, 12], [0, 12, 0, 30]]);
  const st = run(doc, 0.1); ok(near(res(st, its[3]).V, 4, 0.02), 'dělič 2k/1k z 12 V: voltmetr ' + res(st, its[3]).V.toFixed(3) + ' V'); }
// 4) tranzistor NPN jako spínač LED
{ // 5 V: báze přes 10k z tlačítka, kolektor přes 330 Ω a LED
  const { doc, its } = mk([[20201, 0, 0, { t6: 5 }], [20240, 12, 0], [20210, 24, 0, { t6: '10k' }], [20228, 36, 0], [20210, 60, 0, { t6: '330' }], [20223, 72, 0], [20202, 0, 40]],
    [[0, 0, 12, 0], [12, 12, 24, 0], [24, 12, 36, 6], [0, 0, 60, 0], [60, 12, 72, 0], [72, 12, 42, 0], [42, 12, 0, 12], [0, 12, 0, 40]]);
  let st = run(doc, 0.1); ok(res(st, its[5]).I < 1e-4, 'NPN zavřený: LED ' + (res(st, its[5]).I * 1000).toFixed(3) + ' mA');
  ES.simPress(st, its[1], true, true); for (let i = 0; i < 5; i++) ES.simStep(st, 0.04);
  const I = res(st, its[5]).I; ok(I > 0.005 && I < 0.01, 'NPN sepnutý tlačítkem: LED ' + (I * 1000).toFixed(2) + ' mA, U_CE ' + res(st, its[3]).Vce.toFixed(2) + ' V');
  ok(res(st, its[3]).sat, 'tranzistor v saturaci'); }
// 5) nabíjení kondenzátoru RC = 1 s
{ const { doc, its } = mk([[20201, 0, 0, { t6: 10 }], [20210, 12, 0, { t6: '1k' }], [20215, 24, 0, { t6: '1000u', t8: 25 }], [20202, 0, 30]],
    [[0, 0, 12, 0], [12, 12, 24, 0], [24, 12, 0, 12], [0, 12, 0, 30]]);
  const st = run(doc, 1.0, 0.01), V = res(st, its[2]).V; ok(near(V, 6.32, 0.25), 'RC 1 s: po 1 s ' + V.toFixed(2) + ' V (teorie 6,32 V)'); }
// 6) hradla: AND z dvou spínačů
{ const { doc, its } = mk([[20203, 0, 0], [20242, 0, 3], [20242, 12, 3], [20261, 30, 0], [20222, 51, 0], [20210, 51, 18, { t6: 220 }], [20202, 51, 40]],
    [[0, 0, 0, 3], [0, 3, 12, 3], [0, 15, 30, 0], [12, 15, 30, 6], [45, 3, 51, 0], [51, 12, 51, 18], [51, 30, 51, 40]]);
  let st = run(doc, 0.1); ok(!res(st, its[3]).out && res(st, its[4]).bright < 0.05, 'AND 0·0 = 0');
  ES.simPress(st, its[1], true); ES.simStep(st, 0.04); ok(!res(st, its[3]).out, 'AND 1·0 = 0');
  ES.simPress(st, its[2], true); ES.simStep(st, 0.04); ES.simStep(st, 0.04); ok(res(st, its[3]).out && res(st, its[4]).bright > 0.3, 'AND 1·1 = 1, LED svítí ' + (res(st, its[4]).I * 1000).toFixed(1) + ' mA'); }
// 7) relé spíná žárovku
{ const { doc, its } = mk([[20201, 0, 0, { t6: 5 }], [20242, 12, 0], [20245, 24, 0, { t6: 5 }], [20250, 60, 0, { t6: 5, t7: 1 }], [20202, 0, 40]],
    [[0, 0, 12, 0], [12, 12, 24, 0], [24, 12, 0, 12], [0, 0, 33, 12], [36, 0, 60, 0], [60, 12, 0, 12], [0, 12, 0, 40]]);
  let st = run(doc, 0.1); ok(!res(st, its[2]).on && res(st, its[3]).bright < 0.01, 'relé odpadlé, žárovka nesvítí');
  ES.simPress(st, its[1], true); ES.simStep(st, 0.04); ES.simStep(st, 0.04); ok(res(st, its[2]).on && res(st, its[3]).bright > 0.9, 'relé přitáhlo, žárovka svítí (' + res(st, its[3]).bright.toFixed(2) + ')'); }
// 8) překlad programu Arduino
{ const js = E.compile(E.SKETCHES.semafor[1]); ok(/function\* svit/.test(js) && /\(yield\* svit\(/.test(js) && /\(yield\* delay\(/.test(js), 'překlad: funkce a delay jako generátory');
  for (const k in E.SKETCHES) { let err = ''; try { new Function('api', 'const {pinMode,digitalWrite,digitalRead,analogRead,analogWrite,millis,delay,map,Serial,HIGH,LOW,INPUT,OUTPUT,INPUT_PULLUP,LED_BUILTIN,A0,__tick} = api;' + E.compile(E.SKETCHES[k][1])); } catch (e) { err = e.message; } ok(!err, 'ukázka „' + E.SKETCHES[k][0] + '“ se přeloží' + (err ? ': ' + err : '')); }
}
// 9) Arduino Uno: Blink – vnitřní LED i vnější LED na pinu 13
{ const B = E.BOARDS[20300], px = n => B.pins[B.idx[n]];
  const p13 = px('D13'), gnd = px('GND');
  const { doc, its } = mk([[20300, 0, 30, { sketch: E.SKETCHES.blink[1] }], [20210, 60, 0, { t6: 220 }], [20222, 60, 15]],
    [[p13.x, 30 + p13.y, 60, 0], [60, 12, 60, 15], [60, 27, gnd.x, 30 + gnd.y]]);
  const st = run(doc, 0.5); const r = res(st, its[0]);
  ok(r.pins.D13.out && r.pins.D13.v === 1, 'Blink: po 0,5 s je pin 13 HIGH'); ok(res(st, its[2]).bright > 0.5, 'vnější LED svítí ' + (res(st, its[2]).I * 1000).toFixed(1) + ' mA');
  for (let i = 0; i < 25; i++) ES.simStep(st, 0.04); // t = 1,5 s
  ok(res(st, its[0]).pins.D13.v === 0 && res(st, its[2]).bright < 0.05, 'Blink: po 1,5 s je pin 13 LOW, LED zhasla'); }
// 10) Arduino: tlačítko s INPUT_PULLUP a analogRead s potenciometrem + Serial
{ const B = E.BOARDS[20300], px = n => { const p = B.pins[B.idx[n]]; return [p.x, 30 + p.y]; };
  const sk = 'void setup(){ pinMode(2, INPUT_PULLUP); pinMode(13, OUTPUT); Serial.begin(9600); }\nvoid loop(){ digitalWrite(13, digitalRead(2) == LOW ? HIGH : LOW); int a = analogRead(A0); Serial.println(a); delay(100); }';
  const [d2x, d2y] = px('D2'), [gx, gy] = px('GND'), [a0x, a0y] = px('A0'), [v5x, v5y] = px('5V');
  const { doc, its } = mk([[20300, 0, 30, { sketch: sk }], [20240, 90, 0], [20211, 120, 0, { t7: 25 }]],
    [[d2x, d2y, 90, 0], [90, 12, gx, gy], [v5x, v5y, 120, 0], [120, 12, gx, gy], [126, 6, a0x, a0y]]);
  let st = run(doc, 0.3); ok(res(st, its[0]).pins.D13.v === 0, 'nestisknuté tlačítko: pin 13 LOW (pull-up drží 2 v HIGH)');
  const a = parseInt(res(st, its[0]).serial.slice(-1)[0]); ok(near(a, 256, 12), 'analogRead s jezdcem na 25 %: ' + a + ' (čekáno ~256)');
  ES.simPress(st, its[1], true); for (let i = 0; i < 4; i++) ES.simStep(st, 0.04);
  ok(res(st, its[0]).pins.D13.v === 1, 'stisknuté tlačítko: pin 13 HIGH');
}
// 11) Arduino: chyba v programu se ohlásí
{ const { doc, its } = mk([[20300, 0, 30, { sketch: 'void setup( { }' }]], []); const st = run(doc, 0.1); ok(/chyba/.test(res(st, its[0]).err || ''), 'chyba programu: ' + res(st, its[0]).err); }
// 12) uložení a načtení zachová program
{ const { doc, its } = mk([[20301, 0, 30, { sketch: E.SKETCHES.pot[1] }]], []); const back = ES.parseCad(ES.serializeCad(doc)); const it = back.items.find(i => i.type === 20301);
  ok(it && E.sketchOf(it) === E.SKETCHES.pot[1], 'program Arduina přežije uložení do .cad'); }
// 13) MOSFET spíná motorek, Zenerova dioda stabilizuje
{ const { doc, its } = mk([[20201, 0, 0, { t6: 12 }], [20242, 12, 0], [20230, 24, 0], [20252, 48, 0, { t6: 12, t7: 20 }], [20210, 12, 30, { t6: '100k' }], [20202, 0, 60]],
    [[0, 0, 12, 0], [12, 12, 24, 6], [24, 6, 12, 30], [12, 42, 0, 12], [0, 0, 48, 0], [48, 12, 30, 0], [30, 12, 0, 12], [0, 12, 0, 60]]);
  let st = run(doc, 0.1); ok(Math.abs(res(st, its[3]).I) < 1e-3, 'MOSFET zavřený, motor stojí');
  ES.simPress(st, its[1], true); for (let i = 0; i < 30; i++) ES.simStep(st, 0.04); ok(res(st, its[3]).I > 0.5 && res(st, its[3]).rpm > 1000, 'MOSFET otevřený, motor ' + res(st, its[3]).I.toFixed(2) + ' A, ' + Math.round(res(st, its[3]).rpm) + ' ot/min'); }
{ const { doc, its } = mk([[20201, 0, 0, { t6: 12 }], [20210, 12, 0, { t6: 470 }], [20221, 24, 0, { t6: 5.1 }], [20202, 0, 30]],
    [[0, 0, 12, 0], [12, 12, 24, 12], [24, 0, 0, 12], [0, 12, 0, 30]]);
  const st = run(doc, 0.1); ok(near(-res(st, its[2]).V, 5.1, 0.35), 'Zenerova dioda (závěrně) drží ' + (-res(st, its[2]).V).toFixed(2) + ' V'); }
print(fails ? fails + ' CHYB' : 'VŠE OK');
