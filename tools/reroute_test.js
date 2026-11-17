// headless test přetrasování schématu: jsc app/core.js app/symbols.js app/real.js tools/reroute_test.js -- Priklady
const dir = arguments[0];
function rd(f){ const b=new Uint8Array(readFile(dir+'/'+f,'binary')); let s=''; for(const c of b) s+=String.fromCharCode(c); return s; }
let fails=0; const ok=(c,m)=>{ if(!c){fails++; print('FAIL: '+m);} else print('ok: '+m); };
const R = ES.Real, ROUTED = new Set([4000, 4009, 4010]);
// rozdělení svorek do sítí (jen sítě s ≥ 2 svorkami), jako množina řetězců
function partition(d) {
  const sn = ES.buildNets(d), by = new Map();
  for (const it of d.items) ES.termsOf(it).forEach(([x, y], ti) => { const n = sn.ofKey.get(x + ',' + y); if (!by.has(n)) by.set(n, []); by.get(n).push(it.uid + ':' + ti); });
  return new Set([...by.values()].filter(a => a.length > 1).map(a => a.sort().join(' ')));
}
// překryvy: souběžné úseky různých sítí a vodič přes cizí svorku
function overlaps(d) {
  const sn = ES.buildNets(d), ws = d.items.filter(i => ROUTED.has(i.type)).map(i => [i.n[8], i.n[9], i.n[10], i.n[11], sn.ofKey.get(i.n[8] + ',' + i.n[9])]);
  let bad = 0;
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
    const a = ws[i], b = ws[j]; if (a[4] === b[4]) continue;
    const ah = a[1] === a[3], bh = b[1] === b[3];
    if (ah && bh && a[1] === b[1] && Math.min(Math.max(a[0], a[2]), Math.max(b[0], b[2])) > Math.max(Math.min(a[0], a[2]), Math.min(b[0], b[2]))) bad++;
    if (!ah && !bh && a[0] === b[0] && Math.min(Math.max(a[1], a[3]), Math.max(b[1], b[3])) > Math.max(Math.min(a[1], a[3]), Math.min(b[1], b[3]))) bad++;
  }
  return bad;
}
const files = ['1 ARRANQUE DIRECTO MOTOR 3 FASES.cad','2 ARRAN DIRECT INVERSION DE GIRO.cad','4 ARRAN ESTRE-TRIANGULO.cad','ElectroSchool - domovni instalace.cad','ElectroSchool - domovni instalace 3f.cad','ElectroSchool - mereni a ochrany.cad','ARRANQUE DE TRES MOTORES.cad'];
for (const f of files) {
  const d = ES.parseCad(rd(f)); const p0 = partition(d), t0 = Date.now();
  const res = R.rerouteSchema(d);
  const p1 = partition(d), same = p0.size === p1.size && [...p0].every(x => p1.has(x));
  ok(same, f + ': spojení zachována (' + res.wires + ' úseků, ' + (Date.now() - t0) + ' ms, nenalezeno ' + res.failed + ')');
  ok(overlaps(d) === 0, f + ': žádné souběžné překryvy různých sítí (' + overlaps(d) + ')');
}
// nové spojení dvou svorek
{
  const d = ES.parseCad(rd('1 ARRANQUE DIRECTO MOTOR 3 FASES.cad'));
  const comps = d.items.filter(i => (ES.getDef(i.type).terms || []).length);
  const sn = ES.buildNets(d); let A = null, B = null;
  outer: for (const a of comps) for (const pa of ES.termsOf(a)) for (const b of comps) for (const pb of ES.termsOf(b)) if (sn.ofKey.get(pa + '') !== undefined && sn.ofKey.get(pa[0]+','+pa[1]) !== sn.ofKey.get(pb[0]+','+pb[1]) && a !== b) { A = pa; B = pb; break outer; }
  R.rerouteSchema(d, [[A, B, 4009]]);
  const s2 = ES.buildNets(d);
  ok(s2.ofKey.get(A[0]+','+A[1]) === s2.ofKey.get(B[0]+','+B[1]), 'nové spojení ' + A + ' – ' + B + ' vzniklo');
  ok(overlaps(d) === 0, 'po novém spojení žádné překryvy');
}
print(fails ? fails + ' CHYB' : 'VŠE OK');
