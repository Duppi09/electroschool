// Ukázková schémata elektrotechniky a Arduina; vodiče vede automatické trasování.
// jsc app/core.js app/elec.js app/real.js tools/demo_elec.js -- <číslo 1–3> > "Priklady/….cad"
const which = +arguments[0], E = ES.Elec, items = [];
const doc = { items, trailer: ES.DEFAULT_TRAILER };
const add = (t, x, y, name, p, r) => { const it = ES.newItem(t, x, y, r || 0); it.t[0] = name || ''; for (const k in (p || {})) it.t[+k] = String(p[k]); items.push(it); return it; };
const T = (it, i) => ES.termsOf(it)[i];
const pin = (b, n) => T(b, E.BOARDS[b.type].idx[n]);
const joins = [];
const J = (a, b) => joins.push([a, b, 4000]);
const text = (x, y, s, size) => { const it = ES.newItem(8, x, y); it.extra = s; it.n[10] = x + 6; it.n[11] = y + Math.round(size || 4); items.push(it); };

if (which === 1) {
  text(6, -24, 'Základy elektroniky – klikejte na spínače, potenciometr a fotorezistor', 5);
  // A) LED s předřadným rezistorem
  text(6, -10, 'A) LED a předřadný rezistor', 3.4);
  const g1 = add(20200, 12, 15, 'G1', { 6: 9 }), s1 = add(20242, 36, 15, 'S1'), r1 = add(20210, 60, 15, 'R1', { 6: 470 }), d1 = add(20222, 84, 15, 'D1');
  J(T(g1, 0), T(s1, 0)); J(T(s1, 1), T(r1, 0)); J(T(r1, 1), T(d1, 0)); J(T(d1, 1), T(g1, 1));
  // B) soumrakový spínač s tranzistorem
  text(120, -10, 'B) Soumrakový spínač (tranzistor + fotorezistor)', 3.4);
  const g2 = add(20201, 126, 30, 'G2', { 6: 5 }), r2 = add(20210, 156, 6, 'R2', { 6: '10k' }), ldr = add(20212, 156, 42, 'R3'), r4 = add(20210, 180, 24, 'R4', { 6: '4k7' }, 3);
  const q1 = add(20228, 204, 30, 'Q1'), r5 = add(20210, 210, 0, 'R5', { 6: 330 }), d2 = add(20223, 222, 0, 'D2');
  const gnd = add(20202, 156, 75);
  J(T(g2, 0), T(r2, 0)); J(T(r2, 1), T(ldr, 0)); J(T(ldr, 1), T(gnd, 0)); J(T(g2, 1), T(gnd, 0));
  J(T(r2, 1), T(r4, 0)); J(T(r4, 1), T(q1, 1)); J(T(q1, 2), T(gnd, 0));
  J(T(g2, 0), T(r5, 0)); J(T(r5, 1), T(d2, 0)); J(T(d2, 1), T(q1, 0));
  // C) nabíjení kondenzátoru
  text(258, -10, 'C) Nabíjení a vybíjení kondenzátoru', 3.4);
  const g3 = add(20201, 264, 30, 'G3', { 6: 9 }), s2 = add(20240, 288, 6, 'S2'), r6 = add(20210, 312, 6, 'R6', { 6: '4k7' }), c1 = add(20215, 336, 30, 'C1', { 6: '470u', 8: 16 }), r7 = add(20210, 360, 30, 'R7', { 6: '22k' }), pv = add(20204, 384, 30, 'PV1');
  J(T(g3, 0), T(s2, 0)); J(T(s2, 1), T(r6, 0)); J(T(r6, 1), T(c1, 0)); J(T(c1, 0), T(r7, 0)); J(T(r7, 0), T(pv, 0));
  J(T(c1, 1), T(g3, 1)); J(T(r7, 1), T(c1, 1)); J(T(pv, 1), T(r7, 1));
  // D) potenciometr jako dělič napětí
  text(6, 70, 'D) Potenciometr jako dělič napětí', 3.4);
  const g4 = add(20200, 12, 95, 'G4', { 6: 9 }), rp = add(20211, 48, 95, 'RP1', { 6: '10k', 7: 50 }), pv2 = add(20204, 84, 95, 'PV2');
  J(T(g4, 0), T(rp, 0)); J(T(rp, 1), T(g4, 1)); J(T(rp, 2), T(pv2, 0)); J(T(pv2, 1), T(rp, 1));
}
if (which === 2) {
  text(0, -36, 'Arduino Uno – semafor s tlačítkem pro chodce', 5);
  text(0, -28, 'Dvojklik na desku = program. Spusťte simulaci a stiskněte tlačítko S1.', 3);
  const b = add(20300, 30, 60, 'U1');
  E.setSketch(b, '// Semafor s tlačítkem pro chodce\nconst int CERVENA = 12;\nconst int ORANZOVA = 11;\nconst int ZELENA = 10;\nconst int TLACITKO = 2;\n\nvoid setup() {\n  pinMode(CERVENA, OUTPUT);\n  pinMode(ORANZOVA, OUTPUT);\n  pinMode(ZELENA, OUTPUT);\n  pinMode(TLACITKO, INPUT_PULLUP);\n  Serial.begin(9600);\n  digitalWrite(ZELENA, HIGH);\n  Serial.println("Zelená pro auta");\n}\n\nvoid loop() {\n  if (digitalRead(TLACITKO) == LOW) {\n    Serial.println("Chodec stiskl tlačítko");\n    digitalWrite(ZELENA, LOW);\n    digitalWrite(ORANZOVA, HIGH);\n    delay(1500);\n    digitalWrite(ORANZOVA, LOW);\n    digitalWrite(CERVENA, HIGH);\n    Serial.println("Červená – chodci jdou");\n    delay(4000);\n    digitalWrite(ORANZOVA, HIGH);\n    delay(1000);\n    digitalWrite(CERVENA, LOW);\n    digitalWrite(ORANZOVA, LOW);\n    digitalWrite(ZELENA, HIGH);\n    Serial.println("Zelená pro auta");\n  }\n}\n');
  const cols = [['D12', 0, 'D1'], ['D11', 5, 'D2'], ['D10', 1, 'D3']];
  cols.forEach(([p, c, n], i) => {
    const x = 102 + i * 15, r = add(20210, x, -6, 'R' + (i + 1), { 6: 220 }), d = add(20222 + c, x, 15, n);
    J(pin(b, p), T(r, 0)); J(T(r, 1), T(d, 0)); J(T(d, 1), pin(b, 'GND'));
  });
  const s1 = add(20240, 30, 18, 'S1');
  J(pin(b, 'D2'), T(s1, 1)); J(T(s1, 0), pin(b, 'GND'));
}
if (which === 3) {
  text(0, -30, 'Logická hradla – přepínejte vstupy A a B', 5);
  const vcc = add(20203, 6, 0), sa = add(20242, 6, 12, 'A'), sb = add(20242, 30, 12, 'B');
  const ra = add(20210, 6, 42, 'R1', { 6: '10k' }), rb = add(20210, 30, 42, 'R2', { 6: '10k' }), gnd = add(20202, 18, 200);
  J(T(vcc, 0), T(sa, 0)); J(T(vcc, 0), T(sb, 0)); J(T(sa, 1), T(ra, 0)); J(T(sb, 1), T(rb, 0)); J(T(ra, 1), T(gnd, 0)); J(T(rb, 1), T(gnd, 0));
  const gates = [[20261, 'AND'], [20262, 'OR'], [20265, 'XOR'], [20263, 'NAND']];
  gates.forEach(([code, n], i) => {
    const y = 6 + i * 36, g = add(code, 66, y, n), r = add(20210, 102, y, 'R' + (i + 3), { 6: 330 }), d = add(20222 + [1, 2, 3, 0][i], 102, y + 18, 'D' + (i + 1));
    J(T(sa, 1), T(g, 0)); J(T(sb, 1), T(g, 1)); J(T(g, 2), T(r, 0)); J(T(r, 1), T(d, 0)); J(T(d, 1), T(gnd, 0));
  });
  const ng = add(20260, 66, 150, 'NOT'), rn = add(20210, 102, 150, 'R7', { 6: 330 }), dn = add(20222 + 4, 102, 168, 'D5');
  J(T(sa, 1), T(ng, 0)); J(T(ng, 1), T(rn, 0)); J(T(rn, 1), T(dn, 0)); J(T(dn, 1), T(gnd, 0));
}
const res = ES.Real.rerouteSchema(doc, joins);
print(ES.serializeCad(doc));
