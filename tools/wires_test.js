// Pravidla spojování vodičů: jsc app/core.js tools/wires_test.js
let fails = 0; const ok = (c, m) => { if (!c) { fails++; print('FAIL: ' + m); } else print('ok: ' + m); };
function mk(parts, wires, nodes) {
  const doc = { items: [], trailer: ES.DEFAULT_TRAILER }, its = parts.map(([t, x, y]) => { const it = ES.newItem(t, x, y); doc.items.push(it); return it; });
  for (const [a, b, c, d] of wires) { const w = ES.newItem(4000, a, b); w.n[10] = c; w.n[11] = d; doc.items.push(w); }
  for (const [x, y] of nodes || []) { const n = ES.newItem(ES.NODE, x, y); n.n[10] = x; n.n[11] = y; doc.items.push(n); }
  return { doc, its };
}
const top = (doc, it) => ES.buildNets(doc).ofKey.get(ES.termsOf(it)[0] + '');
// čtyři jističe vedle sebe, horní svorky na y = 30
const J4 = [[6010, 30, 30], [6010, 48, 30], [6010, 66, 30], [6010, 84, 30]];
{ const { doc, its } = mk(J4, [[30, 30, 84, 30]]); const n = its.map(i => top(doc, i));
  ok(n[0] === n[3] && n[1] !== n[0] && n[2] !== n[0], 'vodič přes všechny svorky spojí jen krajní dvě'); }
{ const { doc, its } = mk(J4, [[30, 30, 84, 30], [48, 30, 66, 30]]); const n = its.map(i => top(doc, i));
  ok(n[0] === n[3] && n[1] === n[2] && n[0] !== n[1], 'překrývající se vodiče (1–4 a 2–3) se nespojí, nevznikne zkrat'); }
{ const { doc, its } = mk(J4, [[30, 30, 48, 30], [48, 30, 66, 30], [66, 30, 84, 30]]); const n = its.map(i => top(doc, i));
  ok(n.every(x => x === n[0]), 'vodiče 1–2, 2–3, 3–4 navazují konci: všechny spojené'); }
{ const { doc, its } = mk([[6010, 30, 30], [6010, 48, 0]], [[30, 30, 90, 30], [48, 21, 48, 30]], [[48, 30]]); 
  ok(ES.buildNets(doc).ofKey.get(ES.termsOf(its[0])[0] + '') === ES.buildNets(doc).ofKey.get(ES.termsOf(its[1])[1] + ''), 'odbočka s tečkou se spojí'); }
{ const { doc, its } = mk([[6010, 30, 30], [6010, 48, 0]], [[30, 30, 90, 30], [48, 21, 48, 30]]);
  ok(ES.buildNets(doc).ofKey.get(ES.termsOf(its[0])[0] + '') !== ES.buildNets(doc).ofKey.get(ES.termsOf(its[1])[1] + ''), 'dotyk T bez tečky spojení není'); }
{ // starý soubor z CADe_SIMU (bez značky ElectroSchool): souběh se při načtení rozdělí a zůstane spojený
  const { doc, its } = mk(J4, [[30, 30, 84, 30], [48, 30, 66, 30]]);
  const txt = ES.serializeCad(doc).replace('\r\n#ELECTROSCHOOL-VODIC-JEN-KONCE#', ''), back = ES.parseCad(txt), bj = back.items.filter(i => i.type === 6010);
  const n = bj.map(i => top(back, i)); ok(n.every(x => x === n[0]), 'starý soubor: souběžné vodiče a svorky uprostřed se spojí jako v CADe_SIMU');
  const back2 = ES.parseCad(ES.serializeCad(doc)), n2 = back2.items.filter(i => i.type === 6010).map(i => top(back2, i));
  ok(n2[0] === n2[3] && n2[1] === n2[2] && n2[0] !== n2[1], 'soubor uložený v ElectroSchool zůstane bez zkratu');
}
print(fails ? fails + ' CHYB' : 'VŠE OK');
