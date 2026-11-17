// headless test reality: jsc app/core.js app/real.js tools/real_test.js -- Priklady
const dir = arguments[0];
function rd(f){ const b=new Uint8Array(readFile(dir+'/'+f,'binary')); let s=''; for(const c of b) s+=String.fromCharCode(c); return s; }
let fails=0; const ok=(c,m)=>{ if(!c){fails++; print('FAIL: '+m);} else print('ok: '+m); };
function run(st,sec){ for(let i=0;i<sec*25;i++) ES.simStep(st,0.04); }
const R = ES.Real;
const files = ['1 ARRANQUE DIRECTO MOTOR 3 FASES.cad','2 ARRAN DIRECT INVERSION DE GIRO.cad','4 ARRAN ESTRE-TRIANGULO.cad','ElectroSchool - mereni a ochrany.cad','ARRANQUE DE TRES MOTORES.cad','PROYECTOMOC.cad','FIFO.cad','mezcladora_de_4_productos.cad','Arranque estrella - triangulo - temporizado.cad'];
for (const f of files) {
  const d = ES.parseCad(rd(f)); d.real = ES.emptyReal();
  const t0 = Date.now();
  d.real.wires = R.wiresFromSchema(d);
  const c1 = R.compare(d);
  ok(c1.missing.length === 0 && c1.extra.length === 0, f + ': realita podle schématu = schéma (' + d.real.wires.length + ' vodičů, ' + R.devices(d).length + ' přístrojů)');
  // uložení / načtení
  const d2 = ES.parseCad(ES.serializeCad(d));
  ok(d2.real && d2.real.wires.length === d.real.wires.length && Object.keys(d2.real.pos).length === Object.keys(d.real.pos).length, f + ': realita přežije uložení');
  ok(d2.trailer === d.trailer, f + ': konec souboru beze změny');
  // překreslení schématu podle reality
  const res = R.schemaFromReal(d2);
  ok(res.missing.length === 0 && res.extra.length === 0, f + ': schéma překreslené podle reality odpovídá (vodičů ' + res.wires + ', překryvů svorek ' + res.conflicts + ', nenalezeno cest ' + res.failed + ', ' + (Date.now() - t0) + ' ms)');
  if (res.missing.length || res.extra.length) print('   chybí ' + res.missing.slice(0,4).map(p=>R.termName(p[0])+'–'+R.termName(p[1])).join(', ') + ' | navíc ' + res.extra.slice(0,4).map(p=>R.termName(p[0])+'–'+R.termName(p[1])).join(', '));
}
// simulace v realitě: přímý rozběh
{
  const d = ES.parseCad(rd('1 ARRANQUE DIRECTO MOTOR 3 FASES.cad')); d.real = ES.emptyReal(); d.real.wires = R.wiresFromSchema(d);
  const st = ES.simStart(d, true); st.byUid = new Map(st.comps.map(c => [c.it.uid, c]));
  const by = (type, name) => st.comps.find(c => c.it.type === type && ES.norm(c.it.t[0]) === ES.norm(name)).it;
  const m = st.comps.find(c => c.d.kind === 'motor3').it;
  ES.simPress(st, by(6009, 'Q0'), true); run(st, 0.2);
  const s1 = by(8000, 'S1Q'); ES.simPress(st, s1, true); run(st, 0.2); ES.simPress(st, s1, false); run(st, 3);
  ok(st.coil['K1M'] && st.motor[m.uid].rpm > 1300, 'realita: motor se rozběhne a drží (' + Math.round(st.motor[m.uid].rpm) + ' ot/min)');
  // odpojit vodič k cívce -> stykač odpadne
  const coil = st.comps.find(c => c.d.kind === 'load' && c.d.sub === 'coil').it;
  const before = d.real.wires.length; d.real.wires = d.real.wires.filter(w => !((w.a[0] === coil.uid && w.a[1] === 0) || (w.b[0] === coil.uid && w.b[1] === 0)));
  ok(d.real.wires.length < before, 'realita: odpojen vodič od A1');
  const st2 = ES.simStart(d, true); ES.simPress(st2, st2.comps.find(c=>c.it.type===6009).it, true); run(st2,0.2);
  const s1b = st2.comps.find(c=>c.it.type===8000).it; ES.simPress(st2, s1b, true); run(st2, 0.3);
  ok(!st2.coil['K1M'], 'realita: bez vodiče k A1 stykač nesepne');
  const c = R.compare(d); ok(c.missing.length > 0, 'porovnání najde chybějící spoj (' + c.missing.map(p=>R.termName(p[0])+'–'+R.termName(p[1])).join(', ') + ')');
}
// skupiny přístrojů
{
  const d = ES.parseCad(rd('2 ARRAN DIRECT INVERSION DE GIRO.cad'));
  const devs = R.devices(d);
  print('   přístroje: ' + devs.map(g => g.type + ' ' + g.name + '(' + g.items.length + ')').join(', '));
  ok(devs.some(g => g.type === 'contactor' && g.items.length >= 3), 'stykač se skládá z hlavních kontaktů, cívky a pomocných kontaktů');
}
print(fails ? fails + ' CHYB' : 'VŠE OK');
