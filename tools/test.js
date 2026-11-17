// headless test: jsc core.js test.js -- <dir>
const dir = arguments[0];
function rd(f){ const b=new Uint8Array(readFile(dir+'/'+f,'binary')); let s=''; for(const c of b) s+=String.fromCharCode(c); return s; }
let fails=0; const ok=(c,m)=>{ if(!c){fails++; print('FAIL: '+m);} else print('ok: '+m); };
const files = arguments.slice(1);
for(const f of files){ const s=rd(f); const d=ES.parseCad(s); const out=ES.serializeCad({items:d.items.filter(i=>true),trailer:d.trailer});
  const unk={}; d.items.forEach(i=>{ if(ES.getDef(i.type).kind==='unknown') unk[i.type]=1; });
  // roundtrip ignoring ids/bbox/new nodes: re-parse count
  const d2=ES.parseCad(out); print(f+': '+d.items.length+' -> '+d2.items.length+' unknown:'+Object.keys(unk)); }
function run(st,sec){ for(let i=0;i<sec*25;i++) ES.simStep(st,0.04); }
function byName(st,type,name){ return st.comps.find(c=>c.it.type===type && ES.norm(c.it.t[0])===ES.norm(name)).it; }
{ // přímý rozběh
  const d=ES.parseCad(rd('1 ARRANQUE DIRECTO MOTOR 3 FASES.cad')); const st=ES.simStart(d);
  const m=st.comps.find(c=>c.d.kind==='motor3').it;
  ES.simPress(st,byName(st,6009,'Q0'),true); run(st,0.2);
  ok(!st.motor[m.uid].mode,'motor stojí před startem'); ok(!st.short,'bez zkratu');
  const s1=byName(st,8000,'S1Q'); ES.simPress(st,s1,true); run(st,0.2); ES.simPress(st,s1,false); run(st,0.3);
  ok(st.coil['K1M'],'K1M drží (samodržení)'); ok(st.motor[m.uid].mode==='run' && st.motor[m.uid].dir===1,'motor běží vpravo');
  const s0=byName(st,8001,'S0Q'); ES.simPress(st,s0,true); run(st,0.2); ES.simPress(st,s0,false); run(st,0.2);
  ok(!st.coil['K1M'] && !st.motor[m.uid].mode,'stop vypne');
  ES.simPress(st,s1,true); run(st,0.2); ES.simPress(st,s1,false); run(st,0.2);
  ES.simPress(st,byName(st,6007,'F1F'),true); run(st,0.3); ok(!st.coil['K1M'],'tepelné relé vypne stykač');
}
