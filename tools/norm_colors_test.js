// jsc app/core.js app/real.js tools/norm_colors_test.js -- Priklady
const dir = arguments[0]; let fails = 0;
function rd(f){ const b=new Uint8Array(readFile(dir+'/'+f,'binary')); let s=''; for(const c of b) s+=String.fromCharCode(c); return s; }
const ok = (c, m) => { if (!c) { fails++; print('FAIL: ' + m); } else print('ok: ' + m); };
const R = ES.Real, NAME = R.WNAME;
function colorsByTerm(d, std) { const sc = R.scene(d), f = R.wireFunc(d), out = {}; d.real.wires.forEach(w => { const c = R.normColor(d, w, std, f)[0]; for (const k of [w.a, w.b]) { const t = sc.T.get(k.join(':')); out[R.termName(t)] = c; } }); return out; }
{ // stroj: přímý rozběh – silový obvod černě, řízení červeně, N modře, PE zelenožlutě
  const d = ES.parseCad(rd('1 ARRANQUE DIRECTO MOTOR 3 FASES.cad')); d.real = ES.emptyReal(); d.real.wires = R.wiresFromSchema(d);
  const c = colorsByTerm(d, '60204');
  const motorU = Object.keys(c).find(k => /:U1$/.test(k)), coilA1 = Object.keys(c).find(k => /K1M:A1$/.test(k)), coilA2 = Object.keys(c).find(k => /K1M:A2$/.test(k)), pe = Object.keys(c).find(k => /:PE$/.test(k));
  ok(c[motorU] === '#1b1b1b', 'EN 60204-1: přívod motoru ' + motorU + ' = ' + NAME[c[motorU]]);
  ok(c[coilA1] === '#d62828', 'EN 60204-1: cívka ' + coilA1 + ' (řídicí AC) = ' + NAME[c[coilA1]]);
  ok(c[coilA2] === '#2f80ed' || c[coilA2] === '#d62828', 'EN 60204-1: ' + coilA2 + ' = ' + NAME[c[coilA2]]);
  if (pe) ok(c[pe] === 'gnye', 'PE = zelenožlutá');
  const c2 = colorsByTerm(d, '60445'); const ph = ['L1', 'L2', 'L3'].map(n => c2[Object.keys(c2).find(k => k.endsWith(':' + n))]);
  ok(ph[0] === '#7a4a22' && ph[1] === '#1b1b1b' && ph[2] === '#8d8d8d', 'EN 60445: L1 hnědá, L2 černá, L3 šedá (' + ph.map(x => NAME[x]).join(', ') + ')');
}
{ // domovní instalace: spínaný vodič a přepínací vodiče mají barvu fáze L1, N světle modrá, PE zelenožlutá
  const d = ES.parseCad(rd('ElectroSchool - domovni instalace.cad')); const c = colorsByTerm(d, '60445');
  ok(c['-E1:L'] === '#7a4a22', 'spínaný fázový vodič ke svítidlu -E1:L = ' + NAME[c['-E1:L']]);
  ok(c['-S2:1'] === '#7a4a22' && c['-S2:3'] === '#7a4a22', 'přepínací vodiče schodišťového zapojení = hnědá (fáze L1)');
  ok(c['-E1:N'] === '#2f80ed' && c['-E1:PE'] === 'gnye', 'svítidlo: N světle modrá, PE zelenožlutá');
  ok(c['-XS1:L'] === '#7a4a22' && c['-XS1:N'] === '#2f80ed', 'zásuvka: L hnědá, N modrá');
  const bad = R.colorCheck(d, '60445'); print('   v ukázce nesedí podle EN 60445: ' + bad.length + ' vodičů (ručně kreslené černé/šedé přepínací vodiče)');
}
{ // 3f: zásuvka CEE a sporák L1/L2/L3
  const d = ES.parseCad(rd('ElectroSchool - domovni instalace 3f.cad')); const c = colorsByTerm(d, '60445');
  ok(c['-XS1:L1'] === '#7a4a22' && c['-XS1:L2'] === '#1b1b1b' && c['-XS1:L3'] === '#8d8d8d' && c['-XS1:N'] === '#2f80ed' && c['-XS1:PE'] === 'gnye', 'CEE zásuvka: L1 hnědá, L2 černá, L3 šedá, N modrá, PE zelenožlutá');
  const c2 = colorsByTerm(d, '60204'); ok(c2['-P1:R2'] === '#d62828', 'EN 60204-1: výstup relé HDO elektroměru k cívce stykače = řídicí (červená)');
}
{ // stejnosměrné řízení 24 V podle EN 60204-1 = tmavě modrá
  const d = { items: [], real: ES.emptyReal() }; const P = (t, n) => { const it = ES.newItem(t, 0, 0); it.t[0] = n; d.items.push(it); return it; };
  const x = P(3009, '-G'), s = P(8000, '-S1'), h = P(9008, '-H1'); d.real.wires.push({ a: [x.uid, 0], b: [s.uid, 0], c: '#000', p: [] }, { a: [s.uid, 1], b: [h.uid, 0], c: '#000', p: [] }, { a: [h.uid, 1], b: [x.uid, 1], c: '#000', p: [] });
  const cs = d.real.wires.map(w => R.normColor(d, w, '60204')[0]); ok(cs.every(c => c === '#1f3a93'), 'EN 60204-1: řídicí obvod 24 V DC = tmavě modrá');
}
print(fails ? fails + ' CHYB' : 'VŠE OK');
