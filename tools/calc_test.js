// Testy kalkulaček.  Spuštění: jsc app/calc.js tools/calc_test.js
let fails = 0;
const C = ESCalc.calc, N = s => parseFloat(String(s).replace(/\s/g, '').replace(/ /g, '').replace(',', '.'));
const row = (r, label) => { const x = r.rows.find(q => q[0].startsWith(label)); if (!x) throw new Error('chybí řádek ' + label); return x[1]; };
const ok = (c, m) => { if (!c) fails++; print((c ? 'ok   ' : 'FAIL ') + m); };
const near = (a, b, t) => Math.abs(a - b) <= t;
let r;
// Ohm
r = C.ohm({ U: '230', I: '', R: '', P: '2000' }); ok(near(N(row(r, 'Proud')), 8.696, 0.001) && row(r, 'Odpor').startsWith('26,45'), 'Ohm: 2 kW na 230 V → 8,696 A, 26,45 Ω (' + row(r, 'Proud') + ' A, ' + row(r, 'Odpor') + ')');
r = C.ohm({ U: '', I: '2', R: '4,7k', P: '' }); ok(N(row(r, 'Napětí')) === 9400 && N(row(r, 'Výkon')) === 18800, 'Ohm: 2 A přes 4k7 → 9400 V, 18 800 W');
ok(C.ohm({ U: '1', I: '', R: '', P: '' }).err, 'Ohm: jedna hodnota → výzva k doplnění');
// Motor 5,5 kW 400 V cos 0,85 η 88 % → In = 5500/0,88/(√3·400·0,85) = 10,61 A
r = C.motor({ sys: '3f', P: '5.5', U: '400', cos: '0.85', eta: '88', k: '6.5' });
ok(near(N(row(r, 'Jmenovitý')), 10.61, 0.01), 'Motor 5,5 kW: Iₙ = ' + row(r, 'Jmenovitý') + ' A (čekáno 10,61)');
ok(near(N(row(r, 'Záběrový proud při přímém')), 68.98, 0.05) && near(N(row(r, 'Záběrový proud při rozběhu Y')), 22.99, 0.05), 'Motor: záběr přímo ≈ 69 A, Y/Δ ≈ 23 A');
ok(row(r, 'Jistič') === 13, 'Motor: jistič 13 A');
// Úbytek: 1f, 16 A, 30 m, 2,5 mm² Cu: 2·30·16·0,0225/2,5 = 8,64 V = 3,76 %
r = C.drop({ sys: '1f', I: '16', L: '30', S: '2.5', mat: 'cu', cos: '1', lim: '5' });
ok(near(N(row(r, 'Úbytek napětí ΔU')), 8.64, 0.005) && near(N(r.rows[1][1]), 3.76, 0.005), 'Úbytek 1f 16 A/30 m/2,5 mm²: 8,64 V = 3,76 %');
ok(N(row(r, 'Nejmenší průřez pro')) === 2.5 && N(row(r, 'Nejmenší průřez podle')) === 2.5, 'Úbytek: vyhoví 2,5 mm² (ΔU) i proudově (1,5 mm² unese jen 15,5 A)');
r = C.drop({ sys: '1f', I: '25', L: '60', S: '2.5', mat: 'cu', cos: '1', lim: '5' });
ok(r.warn.length === 2 && N(row(r, 'Nejmenší průřez pro')) === 6, 'Úbytek 25 A/60 m na 2,5 mm²: dvě varování, potřeba 6 mm²');
r = C.drop({ sys: '3f', I: '20', L: '50', S: '4', mat: 'cu', cos: '0.85', lim: '5' });
ok(near(N(row(r, 'Úbytek napětí ΔU')), Math.sqrt(3) * 50 * 20 * 0.0225 * 0.85 / 4, 0.01), '3f úbytek: ' + row(r, 'Úbytek napětí ΔU') + ' V');
// Odpory
r = C.resist({ list: '100 220 1k5' }); ok(row(r, 'Sériově').startsWith('1,82 k') && near(N(row(r, 'Paralelně')), 65.74, 0.01), 'Odpory 100, 220, 1k5: série 1,82 kΩ, paralelně 65,74 Ω (' + row(r, 'Paralelně') + ')');
r = C.resist({ list: '2,2k; 2,2k' }); ok(row(r, 'Paralelně').startsWith('1,1 k'), 'Odpory 2,2k ∥ 2,2k = 1,1 kΩ');
// Otáčky
r = C.speed({ f: '50', poles: '4', n: '1450' }); ok(N(row(r, 'Synchronní')) === 1500 && near(N(row(r, 'Skluz')), 3.33, 0.01), 'Otáčky: 4 póly → 1500, skluz při 1450 = 3,33 %');
// Kompenzace: 10 kW, 0,75 → 0,95: Qc = 10·(0,8819 − 0,3287) = 5,53 kvar; CΔ = 5532/(3·314,16·400²) = 36,7 µF
r = C.pf({ sys: '3f', P: '10', U: '400', c1: '0.75', c2: '0.95', f: '50' });
ok(near(N(row(r, 'Potřebný')), 5.53, 0.01) && near(N(row(r, 'Kapacita na fázi – zapojení do Δ')), 36.7, 0.1), 'Kompenzace 10 kW 0,75→0,95: 5,53 kvar, 36,7 µF do Δ');
// Hvězda / trojúhelník
r = C.ycon({ U: '400', Z: '50', cos: '1' }); ok(near(N(row(r, 'Hvězda Y – proud')), 4.619, 0.001) && near(N(row(r, 'Trojúhelník Δ – proud')), 13.86, 0.01), 'Y/Δ 50 Ω: Y 4,62 A, Δ 13,86 A (3×)');
// Energie
r = C.energy({ P: '2000', h: '3', days: '30', price: '6' }); ok(N(row(r, 'Spotřeba za 30')) === 180 && N(row(r, 'Cena za 30')) === 1080, 'Energie 2 kW × 3 h × 30 dní = 180 kWh = 1080 Kč');

// ---- nové kalkulačky
r = C.power({ sys: '3f', U: '400', P: '10', I: '', cos: '0.95' }); ok(near(N(row(r, 'Proud')), 15.19, 0.01) && near(N(row(r, 'Zdánlivý')), 10.53, 0.01) && near(N(row(r, 'Jalový')), 3.287, 0.002), 'Výkon 3f 10 kW cos 0,95: 15,19 A, 10,53 kVA, 3,29 kvar');
r = C.power({ sys: '1f', U: '230', P: '', I: '10', cos: '1' }); ok(N(row(r, 'Činný')) === 2.3, 'Výkon 1f 10 A: 2,3 kW');
r = C.cable({ sys: '1f', Ib: '14', m: 'B2', t: '30', g: '1', prot: 'mcb', S: 'auto' }); ok(N(row(r, 'Jistící')) === 16 && N(row(r, 'Nejmenší průřez')) === 1.5, 'Průřez: 14 A, B2, 1f → jistič 16 A, 1,5 mm²');
r = C.cable({ sys: '1f', Ib: '14', m: 'B2', t: '30', g: '3', prot: 'mcb', S: 'auto' }); ok(N(row(r, 'Nejmenší průřez')) === 2.5, 'Průřez: 3 obvody v souběhu (0,7) → 2,5 mm²');
r = C.cable({ sys: '1f', Ib: '14', m: 'B2', t: '40', g: '1', prot: 'mcb', S: '1.5' }); ok(N(row(r, 'Největší jistič')) === 13 && r.warn.length === 1, 'Průřez 1,5 mm² při 40 °C unese jen jistič 13 A → varování');
r = C.cable({ sys: '1f', Ib: '14', m: 'B2', t: '30', g: '1', prot: 'gG', S: 'auto' }); ok(N(row(r, 'Nejmenší průřez')) === 2.5, 'Pojistka gG 16 A potřebuje Iz ≥ 17,7 A → 2,5 mm²');
r = C.loop({ ch: 'B', In: '16', U0: '230', Zsrc: '0.3', L: '40', S: '2.5', mat: 'cu', Zm: '' });
ok(near(N(row(r, 'Největší impedance')), 2.875, 0.001) && near(N(row(r, 'Zkratový')), 225.5, 0.2) && near(N(row(r, 'Největší délka')), 143, 0.6), 'Smyčka B16: Zs max 2,875 Ω, Ik 225 A, max. 143 m');
r = C.loop({ ch: 'C', In: '16', U0: '230', Zsrc: '0.3', L: '80', S: '2.5', mat: 'cu', Zm: '2' }); ok(near(N(row(r, 'Největší délka')), 63, 0.6) && r.warn.length === 2, 'Smyčka C16 na 80 m: nevypne, max. 63 m, naměřená 2 Ω nevyhovuje');
r = C.rcd({ Idn: '30', type: 'G', UL: '50', RA: '' }); ok(N(row(r, 'Největší odpor')) === 1667 && row(r, 'Vybavovací čas při 1') === '≤ 300', 'Chránič 30 mA: R_A ≤ 1667 Ω, 300 ms');
r = C.insul({ c: '500', R: '0.8' }); ok(N(row(r, 'Nejmenší')) === 1 && r.warn.length === 1, 'Izolace 230/400 V: min 1 MΩ, 0,8 MΩ nevyhovuje');
r = C.ip({ code: 'IP44' }); ok(/1 mm/.test(r.rows[0][1]) && /ze všech směrů/.test(r.rows[1][1]), 'IP44 = drát 1 mm + stříkající voda'); ok(!C.ip({ code: 'IPX4' }).err && C.ip({ code: 'IP99' }).err, 'IPX4 platný, IP99 neplatný');
r = C.steinmetz({ P: '1.1', U: '230' }); ok(N(row(r, 'Provozní')) === 77, 'Steinmetz 1,1 kW: 77 µF');
r = C.demand({ sys: '3f', Pi: '30', b: '0.4', cos: '0.95' }); ok(near(N(row(r, 'Výpočtový')), 18.23, 0.01) && row(r, 'Hlavní') === '3 × 20', 'Soudobost 30 kW × 0,4: 18,2 A → 3 × 20 A');
r = C.water({ V: '120', t1: '10', t2: '60', P: '2', eta: '95' }); ok(near(N(row(r, 'Teplo')), 6.98, 0.01) && row(r, 'Doba') === '3 h 40 min', 'Bojler 120 l 10→60 °C, 2 kW: 6,98 kWh, 3 h 40 min');
r = C.light({ E: '200', A: '20', lm: '1000', eff: '100', eta: '0.5', mf: '0.8' }); ok(N(row(r, 'Potřebný')) === 10000 && row(r, 'Počet') === '10', 'Osvětlení 200 lx, 20 m²: 10 000 lm, 10 svítidel');
r = C.trafo({ sys: '1f', S: '0.1', U1: '230', U2: '24', uk: '' }); ok(near(N(row(r, 'Jmenovitý proud sekundáru')), 4.167, 0.001), 'Trafo 100 VA 230/24 V: I₂ 4,17 A');
r = C.awg({ awg: '14', S: '' }); ok(near(N(row(r, 'Průřez')), 2.08, 0.01), 'AWG 14 = 2,08 mm²');
r = C.awg({ awg: '', S: '2.5' }); ok(row(r, 'Nejbližší') === 'AWG 13', '2,5 mm² ≈ AWG 13');
r = C.led({ Us: '24', n: '1', Vf: '2', I: '10' }); ok(row(r, 'Nejbližší').startsWith('2,2 k') && near(N(row(r, 'Ztrátový')), 0.22, 0.001), 'LED na 24 V, 10 mA: 2,2 kΩ, 0,22 W');
r = C.rlc({ f: '50', R: '100', L: '318', C: '', U: '230' }); ok(near(N(row(r, 'Fázový')), 45, 0.1) && near(N(row(r, 'Proud')), 1.627, 0.002), 'RL 100 Ω + 318 mH: φ 45°, 1,63 A');
// parser čísel
ok(ESCalc.num('1k5') === 1500 && ESCalc.num('4M7') === 4.7e6 && ESCalc.num('2,2') === 2.2 && isNaN(ESCalc.num('abc')), 'čtení čísel: 1k5, 4M7, 2,2, text');
print(fails ? '\n' + fails + ' TESTŮ SELHALO' : '\nvšechny testy kalkulaček prošly');
