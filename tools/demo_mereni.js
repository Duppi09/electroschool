// Vytvoří ukázkové schéma s měřicími přístroji a ochranami.  jsc app/core.js tools/demo_mereni.js > "Priklady/ElectroSchool - mereni a ochrany.cad"
const items = [];
const add = (t, x, y, n, extra) => { const it = ES.newItem(t, x, y); if (n !== undefined) it.t[0] = n; if (extra) Object.assign(it.t, extra); items.push(it); return it; };
const w = (a, b, c, d) => { const it = ES.newItem(4000, a, b); it.n[10] = c; it.n[11] = d; items.push(it); };
const pe = (a, b, c, d) => { const it = ES.newItem(4010, a, b); it.n[10] = c; it.n[11] = d; items.push(it); };
const nd = (x, y) => { const it = ES.newItem(4001, x, y); it.n[10] = x; it.n[11] = y; items.push(it); };
const txt = (x, y, s, h) => { const it = ES.newItem(8, x, y); it.extra = s; it.n[10] = x + 6; it.n[11] = y + (h || 4); items.push(it); };
// silový obvod: síť -> motorový spouštěč -> stykač -> ampérmetr -> motor 4 kW
add(3007, 30, 30, '-X1');
add(20004, 30, 42, '-Q1'); for (const x of [30, 36, 42]) w(x, 30, x, 42);
add(2001, 30, 75, '-KM1'); for (const x of [30, 36, 42]) w(x, 63, x, 75);
add(20002, 30, 99, '-PA1'); w(30, 87, 30, 99); w(36, 87, 36, 111); w(42, 87, 42, 111);
add(1000, 30, 123, '-M1', { 9: '4' }); for (const x of [30, 36, 42]) w(x, 111, x, 123);
pe(54, 30, 54, 126); pe(54, 126, 48, 126);
// ovládací obvod: chránič 30 mA -> jistič -> transformátor 230/24 V
add(3008, 90, 30, '-X2');
add(20005, 90, 36, '-FI1'); w(90, 30, 90, 36); w(96, 30, 96, 36);
add(6008, 90, 63, '-Q2'); w(90, 57, 90, 63); w(96, 57, 96, 63);
add(20003, 90, 90, '-T1'); w(90, 84, 90, 90); w(96, 84, 96, 90);
w(90, 114, 90, 120); w(90, 120, 162, 120);              // 24 V
w(96, 114, 96, 174); w(96, 174, 180, 174);              // 0 V
pe(102, 30, 180, 30); pe(180, 30, 180, 174);            // 0 V uzemněna na PE
add(8001, 114, 120, '-S0'); add(8000, 114, 132, '-S1');
add(7000, 126, 132, '-KM1'); w(114, 132, 126, 132); w(114, 144, 126, 144);
add(9000, 114, 150, '-KM1'); w(114, 144, 114, 150);
add(20002, 114, 162, '-PA2');
add(20001, 138, 120, '-PV1'); w(138, 132, 138, 174);
add(7000, 162, 120, '-KM1'); add(9008, 162, 132, '-H1', { 4: '1' }); w(162, 144, 162, 174);
for (const p of [[114, 120], [138, 120], [114, 174], [138, 174], [162, 174]]) nd(...p);
txt(30, 2, 'Měření a ochrany: motorový spouštěč, ampérmetr, transformátor 230/24 V, proudový chránič, voltmetr', 4);
txt(30, 190, 'Zapněte -Q1, -FI1 a -Q2, pak S1. Klik na zapnutý chránič = TEST. Najetím myší se zobrazí proudy a napětí.', 3);
const out = ES.serializeCad({ items, trailer: ES.DEFAULT_TRAILER });
if (typeof SELFTEST !== 'undefined') {
  const st = ES.simStart(ES.parseCad(out)), run = s => { for (let i = 0; i < s * 25; i++) ES.simStep(st, 0.04); };
  const C = n => st.comps.find(c => c.it.t[0] === n && c.d.kind !== 'contact' && c.d.kind !== 'contactor').it;
  for (const n of ['-Q1', '-FI1', '-Q2']) ES.simPress(st, C(n), true); run(0.5);
  const s1 = st.comps.find(c => c.it.t[0] === '-S1').it; ES.simPress(st, s1, true); run(0.3); ES.simPress(st, s1, false); run(8);
  const m = st.meas, M = st.motor[C('-M1').uid];
  print('KM1=' + !!st.coil.KM1 + ' motor ' + Math.round(M.rpm) + ' ot/min, PA1 ' + m[C('-PA1').uid].I.toFixed(2) + ' A, PA2 ' + m[C('-PA2').uid].I.toFixed(3) + ' A, PV1 ' + m[C('-PV1').uid].V.toFixed(1) + ' V, H1 ' + !!st.on[C('-H1').uid] +
    ', FI1 únik ' + (m[C('-FI1').uid].res * 1000).toFixed(1) + ' mA, proud FI1 ' + (m[C('-FI1').uid].I * 1000).toFixed(0) + ' mA, Q1 ' + m[C('-Q1').uid].I.toFixed(2) + ' A, msg "' + st.msg + '", zkrat ' + st.short);
} else print(out);
