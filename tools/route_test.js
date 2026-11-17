// jsc app/core.js app/real.js tools/route_test.js -- Priklady
const dir = arguments[0]; let fails = 0;
function rd(f){ const b=new Uint8Array(readFile(dir+'/'+f,'binary')); let s=''; for(const c of b) s+=String.fromCharCode(c); return s; }
const R = ES.Real;
const files = ['1 ARRANQUE DIRECTO MOTOR 3 FASES.cad','2 ARRAN DIRECT INVERSION DE GIRO.cad','4 ARRAN ESTRE-TRIANGULO.cad','ARRANQUE DE TRES MOTORES.cad','FIFO.cad','PROYECTOMOC.cad','Arranque estrella - triangulo - temporizado.cad','ElectroSchool - mereni a ochrany.cad','ElectroSchool - domovni instalace.cad','ElectroSchool - domovni instalace 3f.cad'];
for (const f of files) {
  const d = ES.parseCad(rd(f)); if (!d.real || !d.real.wires.length) { d.real = d.real || ES.emptyReal(); d.real.wires = R.wiresFromSchema(d); }
  const sc = R.scene(d), t0 = Date.now(), rt = R.routes(d, sc), ms = Date.now() - t0;
  let inside = 0, fallback = 0, overlap = 0; const segs = [];
  d.real.wires.forEach((w, i) => {
    const pts = rt[i]; if (!pts) return; if (pts.fallback) fallback++;
    const A = sc.T.get(w.a.join(':')), B = sc.T.get(w.b.join(':'));
    for (let k = 1; k < pts.length; k++) {
      const [x1, y1] = pts[k - 1], [x2, y2] = pts[k], L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.ceil(L));
      for (let q = 0; q <= n; q++) { const x = x1 + (x2 - x1) * q / n, y = y1 + (y2 - y1) * q / n;
        if (sc.devs.some(g => g !== A.g && g !== B.g && x > g.x + 0.5 && x < g.x + g.w - 0.5 && y > g.y + 0.5 && y < g.y + g.h - 0.5)) inside++; }
      if (L > 2 && (Math.abs(y2 - y1) < 1e-6 || Math.abs(x2 - x1) < 1e-6)) segs.push({ i, h: Math.abs(y2 - y1) < 1e-6, c: Math.abs(y2 - y1) < 1e-6 ? y1 : x1, a: Math.abs(y2 - y1) < 1e-6 ? Math.min(x1, x2) : Math.min(y1, y2), b: Math.abs(y2 - y1) < 1e-6 ? Math.max(x1, x2) : Math.max(y1, y2), keys: [w.a.join(':'), w.b.join(':')] });
    }
  });
  for (let p = 0; p < segs.length; p++) for (let q = p + 1; q < segs.length; q++) {
    const s1 = segs[p], s2 = segs[q]; if (s1.i === s2.i || s1.h !== s2.h || Math.abs(s1.c - s2.c) >= 2) continue;
    if (s1.keys.some(k => s2.keys.includes(k))) continue;
    if (Math.min(s1.b, s2.b) - Math.max(s1.a, s2.a) > 1.5) overlap++;
  }
  const ok = inside <= 10 && overlap === 0 && fallback === 0; if (!ok) fails++;
  print((ok ? 'ok: ' : 'FAIL: ') + f + ': ' + d.real.wires.length + ' vodičů, ' + ms + ' ms, přes přístroj ' + inside + ', souběh ' + overlap + ', bez cesty ' + fallback);
}
print(fails ? fails + ' CHYB' : 'VŠE OK');
