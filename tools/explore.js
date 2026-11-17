const dir = arguments[0];
function rd(f){ const b=new Uint8Array(readFile(dir+'/'+f,'binary')); let s=''; for(const c of b) s+=String.fromCharCode(c); return s; }
function run(st,sec){ for(let i=0;i<sec*25;i++) ES.simStep(st,0.04); }
function snap(st){ const m=st.comps.filter(c=>c.d.sym==='motor').map(c=>(c.it.t[0]||'M')+':'+(st.motor[c.it.uid].mode||'-')+(st.motor[c.it.uid].dir||'')).join(' ');
  const l=st.comps.filter(c=>c.d.sub==='lamp'&&st.on[c.it.uid]).map(c=>c.it.t[0]).join(',');
  const sg=st.comps.filter(c=>c.d.kind==='stage'&&st.stage[c.it.uid]&&st.stage[c.it.uid].on).map(c=>c.it.t[0]).join(',');
  return 't='+st.t.toFixed(1)+' coils['+Object.keys(st.coil).join(',')+'] motors['+m+'] lamps['+l+']'+(sg?' stages['+sg+'] vars['+Object.keys(st.vars)+']':'')+(st.short?' SHORT '+st.msg:''); }
for (const f of arguments.slice(1)) {
  print('=== '+f); const st=ES.simStart(ES.parseCad(rd(f)));
  const btn=st.comps.filter(c=>c.d.click==='momentary'); print(' buttons: '+btn.map(c=>c.it.type+':'+c.it.t[0]).join(' ')+' | timers: '+st.comps.filter(c=>c.d.sub==='ton'||c.d.sub==='toff').map(c=>c.it.t[0]+'='+ES.secondsOf(c.it)+'s').join(' '));
  for (const c of st.comps) if (c.d.kind==='breaker') ES.simPress(st,c.it,true);
  run(st,0.3); print(' '+snap(st));
  for (const b of btn.filter(c=>!c.d.poles||!c.d.poles[0].nc)) { ES.simPress(st,b.it,true); run(st,0.3); ES.simPress(st,b.it,false); run(st,0.4); print(' press '+b.it.t[0]+' -> '+snap(st)); let last=''; for(let i=0;i<14;i++){ run(st,1); const s=snap(st).replace(/t=[\d.]+ /,''); if(s!==last){ print('    '+snap(st)); last=s; } }
    for (const n of btn.filter(c=>c.d.poles&&c.d.poles[0].nc).slice(0,1)) { ES.simPress(st,n.it,true); run(st,0.3); ES.simPress(st,n.it,false); run(st,0.3); print(' stop '+n.it.t[0]+' -> '+snap(st)); } }
}
