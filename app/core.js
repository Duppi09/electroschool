// ElectroSchool – jádro: formát .cad, knihovna součástek, simulace.
// Bez závislosti na DOM (lze testovat samostatně).
(function (root) {
'use strict';

const WIRE = new Set([4000, 4009, 4010, 10106]);
const NODE = 4001;
const POT = { L1: 1, L2: 2, L3: 4, N: 8, PE: 16, P: 32, M: 64 };
const POT_NAME = { 1: 'L1', 2: 'L2', 4: 'L3', 8: 'N', 16: 'PE', 32: 'L+', 64: 'L−' }; // ČSN EN 60445

function norm(s) { return (s || '').trim().replace(/^-/, '').toUpperCase(); }
function rot(x, y, r) { for (let i = 0; i < (r & 3); i++) { const t = x; x = -y; y = t; } return [x, y]; }

// ---------------------------------------------------------------- knihovna
const LIB = {};
const CATS = [];
function def(code, d) {
  d.code = code; LIB[code] = d;
  if (d.cat) { let c = CATS.find(c => c.name === d.cat); if (!c) CATS.push(c = { name: d.cat, items: [], set: d.home ? 'home' : 'ind', norm: d.norm || '' }); c.items.push(code); }
  return d;
}
function tb(n, h, dx) { const a = []; dx = dx || 6; for (let i = 0; i < n; i++) a.push([i * dx, 0]); for (let i = 0; i < n; i++) a.push([i * dx, h]); return a; }
function pp(n, nc) { return Array.from({ length: n }, (_, i) => ({ a: i, b: i + n, nc: !!nc })); }
const L3 = ['1', '3', '5', '2', '4', '6'], L2 = ['1', '3', '2', '4'], L1 = ['1', '2'], L4 = ['1', '3', '5', '7', '2', '4', '6', '8'];
const lab = n => n === 1 ? L1 : n === 2 ? L2 : n === 3 ? L3 : L4;

// Napájení (svorky dole, symbol nad nimi)
function supply(code, name, pots) {
  def(code, { name, cat: 'Napájení', pre: '-X', kind: 'supply', pots, labels: [], terms: pots.map((_, i) => [i * 6, 0]),
    bbox: [-12, -9, 6 * pots.length, 3], sym: 'supply' });
}
supply(3004, 'Síť L1+L2+L3', ['L1', 'L2', 'L3']);
supply(3005, 'Síť L1+L2+L3+N', ['L1', 'L2', 'L3', 'N']);
supply(3007, 'Síť L1+L2+L3+N+PE', ['L1', 'L2', 'L3', 'N', 'PE']);
supply(3006, 'Síť L1+L2+L3+PE', ['L1', 'L2', 'L3', 'PE']);
supply(3003, 'Fáze + N', ['L1', 'N']);
supply(3008, 'Fáze + N + PE', ['L1', 'N', 'PE']);
supply(3000, 'Fáze L1', ['L1']);
supply(3001, 'Nulový vodič N', ['N']);
supply(3002, 'Ochranný vodič PE', ['PE']);
supply(3009, 'Stejnosměrné L+ L−', ['P', 'M']);
supply(3010, 'Kladný pól L+', ['P']);
supply(3011, 'Záporný pól L−', ['M']);

// Vodiče
def(4000, { name: 'Vodič', kind: 'wire' });
def(4009, { name: 'Nulový vodič', kind: 'wire' });
def(4010, { name: 'Ochranný vodič', kind: 'wire' });
def(4001, { name: 'Uzel', kind: 'node' });
def(10106, { name: 'Spojnice GRAFCET', kind: 'wire' });

// Jištění
function multi(code, name, cat, pre, n, h, kind, sym, bbox, extra) {
  return def(code, Object.assign({ name, cat, pre, kind, sym, n, h, labels: lab(n), terms: tb(n, h), poles: pp(n), bbox }, extra || {}));
}
multi(5008, 'Pojistka 1P', 'Jištění', '-F', 1, 12, 'fuse', 'fuse', [-12, -3, 6, 15]);
multi(5000, 'Pojistka 2P', 'Jištění', '-F', 2, 12, 'fuse', 'fuse', [-12, -3, 12, 15]);
multi(5001, 'Pojistka 3P', 'Jištění', '-F', 3, 12, 'fuse', 'fuse', [-12, -3, 18, 15]);
multi(6010, 'Jistič 1P', 'Jištění', '-Q', 1, 21, 'breaker', 'breaker', [-21, -3, 6, 24]);
multi(6008, 'Jistič 2P', 'Jištění', '-Q', 2, 21, 'breaker', 'breaker', [-21, -3, 12, 24]);
multi(6009, 'Jistič 3P', 'Jištění', '-Q', 3, 21, 'breaker', 'breaker', [-21, -3, 18, 24]);
multi(6007, 'Tepelné relé 3P', 'Jištění', '-F', 3, 12, 'thermal', 'thermal', [-15, -3, 21, 15]);

// Stykače a vypínače
multi(2006, 'Stykač 1P', 'Stykače a vypínače', '-KM', 1, 12, 'contactor', 'contactor', [-12, -3, 6, 15]);
multi(2000, 'Stykač 2P', 'Stykače a vypínače', '-KM', 2, 12, 'contactor', 'contactor', [-12, -3, 12, 15]);
multi(2001, 'Stykač 3P', 'Stykače a vypínače', '-KM', 3, 12, 'contactor', 'contactor', [-12, -3, 18, 15]);
multi(2002, 'Stykač 4P', 'Stykače a vypínače', '-KM', 4, 12, 'contactor', 'contactor', [-12, -3, 24, 15]);
multi(2007, 'Vypínač 1P', 'Stykače a vypínače', '-Q', 1, 12, 'mswitch', 'mswitch', [-12, -3, 6, 15]);
multi(2003, 'Vypínač 2P', 'Stykače a vypínače', '-Q', 2, 12, 'mswitch', 'mswitch', [-12, -3, 12, 15]);
multi(2004, 'Vypínač 3P', 'Stykače a vypínače', '-Q', 3, 12, 'mswitch', 'mswitch', [-12, -3, 18, 15]);

// Kontakty (jednopólové, 2 svorky)
function contact(code, name, cat, pre, labels, nc, src, deco, click) {
  return def(code, { name, cat, pre, kind: 'contact', sym: 'contact', nc, src, deco, click, labels, terms: tb(1, 12), poles: pp(1, nc), bbox: [-18, -3, 6, 15] });
}
const CK = 'Pomocné kontakty', CB = 'Tlačítka a spínače';
contact(7000, 'Kontakt spínací (NO)', CK, '-KM', ['13', '14'], false, 'act', null);
contact(7001, 'Kontakt rozpínací (NC)', CK, '-KM', ['11', '12'], true, 'act', null);
contact(7004, 'Časový NO – zpožděný přítah', CK, '-KT', ['67', '68'], false, 'ton', 'ton');
contact(7005, 'Časový NC – zpožděný přítah', CK, '-KT', ['55', '56'], true, 'ton', 'ton');
contact(7008, 'Časový NO – zpožděný odpad', CK, '-KT', ['57', '58'], false, 'toff', 'toff');
contact(7009, 'Časový NC – zpožděný odpad', CK, '-KT', ['65', '66'], true, 'toff', 'toff');
contact(8016, 'Kontakt tepelného relé NO', CK, '-F', ['97', '98'], false, 'act', 'thermal', 'trip');
contact(8017, 'Kontakt tepelného relé NC', CK, '-F', ['95', '96'], true, 'act', 'thermal', 'trip');
def(8018, { name: 'Kontakt tepelného relé NC+NO', cat: CK, pre: '-F', kind: 'contact', sym: 'contact', src: 'act', deco: 'thermal', click: 'trip',
  labels: ['95', '97', '96', '98'], terms: tb(2, 12, 9), poles: [{ a: 0, b: 2, nc: true }, { a: 1, b: 3, nc: false }], bbox: [-18, -3, 15, 15] });
contact(8000, 'Tlačítko spínací (NO)', CB, '-S', ['13', '14'], false, 'act', 'push', 'momentary');
contact(8001, 'Tlačítko rozpínací (NC)', CB, '-S', ['11', '12'], true, 'act', 'push', 'momentary');
contact(8004, 'Hřibové tlačítko NO (aretace)', CB, '-S', ['13', '14'], false, 'act', 'mushroom', 'toggle');
contact(8005, 'Hřibové tlačítko NC (aretace)', CB, '-S', ['11', '12'], true, 'act', 'mushroom', 'toggle');
contact(8008, 'Přepínač NO', CB, '-S', ['13', '14'], false, 'act', 'toggle', 'toggle');
contact(8009, 'Přepínač NC', CB, '-S', ['11', '12'], true, 'act', 'toggle', 'toggle');
contact(8012, 'Koncový spínač NO', CB, '-SQ', ['13', '14'], false, 'act', 'limit', 'toggle');
contact(8013, 'Koncový spínač NC', CB, '-SQ', ['11', '12'], true, 'act', 'limit', 'toggle');
def(8023, { name: 'Klávesa / proměnná', cat: CB, pre: 'X', kind: 'key', sym: 'key', click: 'momentary', labels: [], terms: [], bbox: [-18, -6, 6, 6] });

// Cívky a signalizace
function load(code, name, pre, sub, labels, extra) {
  def(code, Object.assign({ name, cat: 'Cívky a signalizace', pre, kind: 'load', sub, sym: 'load', labels, terms: tb(1, 12), bbox: [-15, -3, 9, 15] }, extra || {}));
}
load(9000, 'Cívka stykače / relé', '-KM', 'coil', ['A1', 'A2']);
load(9004, 'Časové relé – zpožděný přítah', '-KT', 'ton', ['A1', 'A2', '0', '5']);
load(9005, 'Časové relé – zpožděný odpad', '-KT', 'toff', ['A1', 'A2', '0', '5']);
load(9003, 'Elektromagnetický ventil', '-Y', 'valve', ['A1', 'A2']);
load(9008, 'Signálka', '-H', 'lamp', ['X1', 'X2', '0']);
load(9009, 'Blikající signálka', '-H', 'blink', ['X1', 'X2', '0']);
load(9010, 'Houkačka', '-HA', 'horn', ['X1', 'X2']);

// Motory
def(1000, { name: 'Třífázový motor', cat: 'Motory', pre: '-M', kind: 'motor3', sym: 'motor', labels: ['U1', 'V1', 'W1', 'PE'],
  terms: [[0, 0], [6, 0], [12, 0], [18, 3]], bbox: [-12, -6, 24, 24] });
def(1001, { name: 'Třífázový motor Y/Δ (6 svorek)', cat: 'Motory', pre: '-M', kind: 'motorYD', sym: 'motor', labels: ['U1', 'V1', 'W1', 'PE', 'W2', 'U2', 'V2'],
  terms: [[0, 0], [6, 0], [12, 0], [18, 3], [0, 24], [6, 24], [12, 24]], bbox: [-12, -6, 24, 27] });
// Měření a ochrany (kódy 20000+ jsou rozšíření ElectroSchool, původní CADe_SIMU je nezná)
def(20001, { name: 'Voltmetr', cat: 'Měření', pre: '-PV', kind: 'meter', sub: 'V', sym: 'meter', labels: ['1', '2'], terms: tb(1, 12), bbox: [-15, -3, 9, 15] });
def(20002, { name: 'Ampérmetr', cat: 'Měření', pre: '-PA', kind: 'meter', sub: 'A', sym: 'meter', labels: ['1', '2'], terms: tb(1, 12), poles: pp(1), bbox: [-15, -3, 9, 15] });
def(20003, { name: 'Transformátor 230/24 V', cat: 'Napájení', pre: '-T', kind: 'trafo', sym: 'trafo', labels: ['1.1', '1.2', '2.1', '2.2'],
  terms: [[0, 0], [6, 0], [0, 24], [6, 24]], bbox: [-12, -3, 18, 27], defaults: { 6: '230', 7: '24' } });
multi(20004, 'Motorový spouštěč 3P', 'Jištění', '-Q', 3, 21, 'mstarter', 'breaker', [-21, -3, 18, 24], { defaults: { 8: '10' } });
multi(20005, 'Proudový chránič 2P (1+N)', 'Jištění', '-FI', 2, 21, 'rcd', 'rcd', [-21, -3, 12, 24], { labels: ['1', 'N', '2', 'N'] });
multi(20006, 'Proudový chránič 4P (3+N)', 'Jištění', '-FI', 4, 21, 'rcd', 'rcd', [-21, -3, 24, 24], { labels: ['1', '3', '5', 'N', '2', '4', '6', 'N'] });
def(1002, { name: 'Jednofázový motor', cat: 'Motory', pre: '-M', kind: 'motor1', sym: 'motor', labels: ['U', 'N', 'PE'],
  terms: [[0, 0], [12, 0], [18, 3]], bbox: [-12, -6, 24, 24] });

// GRAFCET
const CG = 'GRAFCET';
def(10100, { name: 'Počáteční krok', cat: CG, pre: '0', kind: 'stage', init: true, sym: 'stage', labels: [], terms: [[0, 0], [0, 12]], bbox: [-6, -3, 12, 15], noAuto: true });
def(10101, { name: 'Krok', cat: CG, pre: '1', kind: 'stage', sym: 'stage', labels: [], terms: [[0, 0], [0, 12]], bbox: [-6, -3, 12, 15], noAuto: true });
def(10102, { name: 'Přechod', cat: CG, pre: '', kind: 'trans', sym: 'trans', labels: [], terms: [[0, 0], [0, 6]], bbox: [-6, -3, 24, 9], noAuto: true });
def(10103, { name: 'Akce', cat: CG, pre: 'A', kind: 'action', sym: 'action', labels: ['0', '0', '0', '0', '0', '0', '0'], terms: [], bbox: [-3, -12, 21, 6], noAuto: true });
def(10108, { name: 'Odkaz', kind: 'gref', sym: 'gref', labels: [], terms: [], bbox: [-3, -12, 3, 3] });
def(10501, { name: 'Pneumatický válec', kind: 'cyl', sym: 'cyl', labels: [], terms: [], bbox: [-18, -9, 69, 57] });

// Kreslení
const CD = 'Kreslení';
def(1, { name: 'Čára', cat: CD, kind: 'gfx', shape: 'line' });
def(2, { name: 'Obdélník', cat: CD, kind: 'gfx', shape: 'rect' });
def(3, { name: 'Elipsa', cat: CD, kind: 'gfx', shape: 'ell' });
def(4, { name: 'Vyplněný obdélník', cat: CD, kind: 'gfx', shape: 'frect' });
def(5, { name: 'Vyplněný obdélník', kind: 'gfx', shape: 'frect' });
def(6, { name: 'Vyplněná elipsa', cat: CD, kind: 'gfx', shape: 'fell' });
def(8, { name: 'Text', cat: CD, kind: 'text' });
def(0, { name: 'Text', kind: 'text' });

// ---- Domovní instalace (samostatná sada palety; kódy 20100+ jsou rozšíření ElectroSchool)
const HR = 'Rozvodnice', HS = 'Spínače', HZ = 'Zásuvky', HL = 'Svítidla a spotřebiče', HO = 'Ovládací přístroje', HX = 'Spojování';
const HN = { [HR]: 'ČSN 33 2000-4-41 · ČSN 33 2000-5-53', [HS]: 'řazení dle ČSN EN 60669-1', [HZ]: 'ČSN EN 60884-1 · ČSN 35 4516', [HL]: 'ČSN EN 60598 · ČSN EN 62080', [HO]: 'ČSN EN 60669-2-1, -2-2, -2-3', [HX]: 'ČSN EN 60998 · značky ČSN EN 60617' };
const home = (d, cat) => Object.assign(d, { home: true, cat, norm: HN[cat] });
const HCAT = n => { let c = CATS.find(c => c.name === n); if (!c) CATS.push(c = { name: n, items: [], set: 'home', norm: HN[n] }); return c; };
HCAT(HR).items.push(3008, 3007);
def(20116, home({ name: 'Elektroměr 1f (1-3 / 4-6)', pre: '-P', kind: 'emeter', sym: 'emeter', labels: ['1', '4', '3', '6'], terms: tb(2, 12), poles: pp(2), bbox: [-12, -3, 12, 15] }, HR));
HCAT(HR).items.push(6010, 6008, 6009, 20005, 20006, 5008);
home(contact(20101, 'Spínač č. 1 (jednopólový)', null, '-S', ['L', '1'], false, 'act', 'rocker', 'toggle'), HS);
def(20102, home({ name: 'Spínač č. 2 (dvoupólový)', pre: '-S', kind: 'contact', sym: 'contact', src: 'act', deco: 'rocker', click: 'toggle', labels: ['L', 'N', 'L′', 'N′'], terms: tb(2, 12), poles: pp(2), bbox: [-18, -3, 12, 15] }, HS));
def(20105, home({ name: 'Spínač č. 5 (sériový, lustrový)', pre: '-S', kind: 'hsw', sym: 'hsw', v: 5, bits: 2, labels: ['L', '1', '2'], terms: [[3, 12], [0, 0], [6, 0]], poles: [{ a: 0, b: 1, bit: 0 }, { a: 0, b: 2, bit: 1 }], bbox: [-12, -3, 9, 15] }, HS));
def(20106, home({ name: 'Spínač č. 6 (střídavý, schodišťový)', pre: '-S', kind: 'hsw', sym: 'hsw', v: 6, bits: 1, labels: ['L', '1', '2'], terms: [[3, 12], [0, 0], [6, 0]], poles: [{ a: 0, b: 1, bit: 0, nc: true }, { a: 0, b: 2, bit: 0 }], bbox: [-12, -3, 9, 15] }, HS));
def(20107, home({ name: 'Spínač č. 7 (křížový)', pre: '-S', kind: 'hsw', sym: 'hsw', v: 7, bits: 1, labels: ['1', '2', '3', '4'], terms: [[0, 0], [6, 0], [0, 12], [6, 12]],
  poles: [{ a: 0, b: 2, bit: 0, nc: true }, { a: 1, b: 3, bit: 0, nc: true }, { a: 0, b: 3, bit: 0 }, { a: 1, b: 2, bit: 0 }], bbox: [-12, -3, 9, 15] }, HS));
home(contact(20108, 'Tlačítko č. 1/0 (zvonkové, ovladač)', null, '-SB', ['L', '1'], false, 'act', 'rocker', 'momentary'), HS);
def(20110, home({ name: 'Zásuvka 230 V s ochranným kolíkem', pre: '-XS', kind: 'socket', sym: 'socket', labels: ['L', 'N', 'PE'], terms: [[0, 0], [6, 0], [12, 0]], bbox: [-6, -3, 15, 12], defaults: { 9: '1000' } }, HZ));
def(20111, home({ name: 'Svítidlo', pre: '-E', kind: 'load', sub: 'light', sym: 'load', labels: ['L', 'N', 'PE'], terms: [[0, 0], [0, 12], [6, 12]], bbox: [-15, -3, 9, 15], defaults: { 9: '60' } }, HL));
def(20112, home({ name: 'Zvonek', pre: '-HA', kind: 'load', sub: 'bell', sym: 'load', labels: ['1', '2'], terms: tb(1, 12), bbox: [-15, -3, 9, 15] }, HL));
def(20113, home({ name: 'Impulsní relé (cívka)', pre: '-K', kind: 'load', sub: 'pulse', sym: 'load', labels: ['A1', 'A2'], terms: tb(1, 12), bbox: [-15, -3, 9, 15] }, HO));
def(20114, home({ name: 'Schodišťový automat (cívka)', pre: '-K', kind: 'load', sub: 'stair', sym: 'load', labels: ['A1', 'A2'], terms: tb(1, 12), bbox: [-15, -3, 9, 15], defaults: { 5: '60' } }, HO));
HCAT(HO).items.push(7000, 7001);
home(contact(20115, 'Pohybové čidlo', null, '-B', ['L', 'L′', 'N'], false, 'act', 'pir', 'pir'), HO);
Object.assign(LIB[20115], { terms: [[0, 0], [0, 12], [6, 12]], bbox: [-18, -3, 9, 15], defaults: { 5: '20' } });
def(20117, home({ name: 'Spojovací svorka 3×', pre: '-X', kind: 'clamp', sym: 'clamp', labels: ['1', '2', '3'], terms: [[0, 0], [3, 0], [6, 0]], poles: [{ a: 0, b: 1 }, { a: 0, b: 2 }], bbox: [-3, -3, 9, 3] }, HX));
def(20118, home({ name: 'Spojovací svorka 5×', pre: '-X', kind: 'clamp', sym: 'clamp', labels: ['1', '2', '3', '4', '5'], terms: [[0, 0], [3, 0], [6, 0], [9, 0], [12, 0]], poles: [1, 2, 3, 4].map(b => ({ a: 0, b })), bbox: [-3, -3, 15, 3] }, HX));
HCAT(HS).items.unshift(20101); HCAT(HS).items.push(20108); HCAT(HO).items.push(20115);
// ---- třífázové a další domácí prvky
def(20130, home({ name: 'Elektroměr 3f', pre: '-P', kind: 'emeter3', sym: 'emeter3', labels: ['1', '4', '7', '10', '3', '6', '9', '12'], terms: tb(4, 12), poles: pp(4), bbox: [-12, -3, 24, 15] }, HR));
HCAT(HR).items.push(2004);
const cee = (code, A) => def(code, home({ name: 'Zásuvka 400 V ' + A + ' A (CEE 5p)', pre: '-XS', kind: 'socket3', sym: 'socket3', amp: A, labels: ['L1', 'L2', 'L3', 'N', 'PE'], terms: [0, 6, 12, 18, 24].map(x => [x, 0]), bbox: [-6, -3, 27, 15], defaults: { 9: '3000' } }, HZ));
cee(20131, 16); cee(20132, 32);
def(20133, home({ name: 'Sporák / varná deska 3f', pre: '-E', kind: 'load3', sym: 'load3', labels: ['L1', 'L2', 'L3', 'N', 'PE'], terms: [0, 6, 12, 18, 24].map(x => [x, 0]), bbox: [-12, -3, 27, 12], defaults: { 9: '7000' } }, HL));
def(20134, home({ name: 'Ohřívač vody (bojler)', pre: '-E', kind: 'load', sub: 'heater', sym: 'load', labels: ['L', 'N', 'PE'], terms: [[0, 0], [0, 12], [6, 12]], bbox: [-15, -3, 9, 15], defaults: { 9: '2000' } }, HL));
def(20135, home({ name: 'Ventilátor', pre: '-M', kind: 'load', sub: 'fan', sym: 'load', labels: ['L', 'N', 'PE'], terms: [[0, 0], [0, 12], [6, 12]], bbox: [-15, -3, 9, 15], defaults: { 9: '30' } }, HL));
HCAT(HO).items.push(9004, 9005, 7004, 7005, 7008, 7009, 2000, 9000);
home(contact(20136, 'Termostat (prostorový)', null, '-B', ['L', '1'], false, 'act', 'thermo', 'toggle'), HO);
home(contact(20137, 'Soumrakový spínač', null, '-B', ['L', '1'], false, 'act', 'dusk', 'toggle'), HO);
home(contact(20138, 'Spínací hodiny', null, '-KT', ['L', '1'], false, 'act', 'clock', 'clock'), HO);
Object.assign(LIB[20138], { defaults: { 5: '10', 6: '10' } });
HCAT(HO).items.push(20136, 20137, 20138);
{ const k = CATS.find(c => c.name === 'Kreslení'); if (k) k.set = 'both'; }

// kategorie Měření v paletě před GRAFCET
{ const i = CATS.findIndex(c => c.name === 'Měření'), g = CATS.findIndex(c => c.name === 'GRAFCET'); if (i > g && g >= 0) CATS.splice(g, 0, CATS.splice(i, 1)[0]); }

function getDef(type) { return LIB[type] || { code: type, name: 'Nepodporovaný prvek ' + type, kind: 'unknown', sym: 'unknown', terms: [], labels: [] }; }

// ---------------------------------------------------------------- formát .cad
let UID = 1;
const DEFAULT_TRAILER = '$$$*1*1*1*2*4*0*1*0*0*333*3234&&&*           *           *           *           *                         *                         *' +
  '01-Jan-2026*1          *1          *CADe_S1              *1*1*1*1*1*1*1*1*1*1*1*1*1*1***$$$&&&';

function parseCad(text) {
  if (!text.startsWith('CADe_SIMU')) throw new Error('Soubor není schéma ve formátu CADe_SIMU (.cad).');
  let body = text.slice(9), trailer = DEFAULT_TRAILER;
  const ti = body.indexOf('$$$');
  if (ti >= 0) { trailer = body.slice(ti); body = body.slice(0, ti); }
  const H = /\*(\d+)\*(\d+)#/y, HN = /\*(\d+)\*(\d+)#/g, N = /\*(-?\d+(?:\*-?\d+){22})#/g;
  const items = [];
  let pos = 0;
  while (pos < body.length) {
    H.lastIndex = pos; const h = H.exec(body); if (!h) break;
    N.lastIndex = H.lastIndex; const n = N.exec(body); if (!n) break;
    HN.lastIndex = N.lastIndex; const nx = HN.exec(body); const end = nx ? nx.index : body.length;
    items.push({ uid: UID++, id: +h[1], type: +h[2], t: body.slice(H.lastIndex, n.index).split('#'),
      n: n[1].split('*').map(Number), extra: body.slice(N.lastIndex, end) });
    pos = end;
  }
  const doc = { items, trailer };
  // rozšíření ElectroSchool: realistické zapojení (pozice přístrojů, barvy, vodiče) za koncem souboru
  const ri = trailer.indexOf(REAL_TAG.trim());
  if (ri >= 0) {
    try { doc.real = realFromFile(JSON.parse(trailer.slice(ri + REAL_TAG.trim().length)), items); } catch (e) { /* poškozená data reality se ignorují */ }
    doc.trailer = trailer.slice(0, trailer.slice(ri - 2, ri) === '\r\n' ? ri - 2 : ri);
  }
  return doc;
}
const REAL_TAG = '\r\n#ELEKTROSIMU-REALITA#';
function emptyReal() { return { pos: {}, col: {}, wires: [] }; }
function realFromFile(j, items) {
  const r = emptyReal(), U = i => items[i] && items[i].uid;
  for (const k in j.pos || {}) if (U(+k)) r.pos[U(+k)] = j.pos[k];
  for (const k in j.col || {}) if (U(+k)) r.col[U(+k)] = j.col[k];
  for (const w of j.wires || []) if (U(w.a[0]) && U(w.b[0])) r.wires.push({ a: [U(w.a[0]), w.a[1]], b: [U(w.b[0]), w.b[1]], c: w.c, p: w.p || [] });
  return r;
}
function realToFile(r, items) {
  const ix = new Map(items.map((it, i) => [it.uid, i])), j = { v: 1, pos: {}, col: {}, wires: [] };
  for (const k in r.pos) if (ix.has(+k)) j.pos[ix.get(+k)] = r.pos[k].map(v => Math.round(v * 10) / 10);
  for (const k in r.col) if (ix.has(+k)) j.col[ix.get(+k)] = r.col[k];
  for (const w of r.wires) if (ix.has(w.a[0]) && ix.has(w.b[0])) j.wires.push({ a: [ix.get(w.a[0]), w.a[1]], b: [ix.get(w.b[0]), w.b[1]], c: w.c, p: (w.p || []).map(q => q.map(v => Math.round(v * 10) / 10)) });
  return j;
}

function bboxOf(it) {
  const d = getDef(it.type); if (!d.bbox) return [0, 0, 0, 0];
  const [a, b] = rot(d.bbox[0], d.bbox[1], it.n[17]), [c, e] = rot(d.bbox[2], d.bbox[3], it.n[17]);
  return [Math.min(a, c), Math.min(b, e), Math.max(a, c), Math.max(b, e)];
}

function serializeCad(doc) {
  let out = 'CADe_SIMU', id = 0;
  const items = doc.items.slice();
  // doplnit uzly v místech odboček, aby schéma fungovalo i v původním programu
  const have = new Set(items.filter(i => i.type === NODE).map(i => i.n[8] + ',' + i.n[9]));
  for (const k of junctions(doc)) if (!have.has(k)) { const [x, y] = k.split(',').map(Number); const nd = newItem(NODE, x, y); nd.n[10] = x; nd.n[11] = y; items.push(nd); }
  for (const it of items) {
    const d = getDef(it.type), n = it.n.slice();
    if (d.bbox && d.kind !== 'unknown') { const b = bboxOf(it); n[12] = b[0]; n[13] = b[1]; n[14] = b[2]; n[15] = b[3]; }
    out += '*' + (id++) + '*' + it.type + '#' + it.t.join('#') + '*' + n.join('*') + '#' + (it.extra || '');
  }
  out += doc.trailer || DEFAULT_TRAILER;
  const r = doc.real;
  if (r && (r.wires.length || Object.keys(r.pos).length || Object.keys(r.col).length)) out += REAL_TAG + JSON.stringify(realToFile(r, items));
  return out;
}

function newItem(type, x, y, r) {
  const d = getDef(type), t = new Array(10).fill(''), n = new Array(23).fill(0);
  (d.labels || []).forEach((l, i) => { t[2 + i] = l; });
  (d.terms || []).forEach((_, i) => { if (i < 8) n[i] = 1; });
  n[8] = x; n[9] = y; n[17] = r || 0; n[19] = 1;
  if (d.kind === 'text') { for (let i = 2; i < 10; i++) t[i] = ' 0'; n[20] = 400; n[21] = -16; n[19] = 0; }
  if (d.kind === 'gfx' || d.kind === 'wire' || d.kind === 'node') n[19] = 0;
  if (d.defaults) for (const k in d.defaults) t[k] = d.defaults[k];
  const it = { uid: UID++, id: 0, type, t, n, extra: '' };
  return it;
}
function cloneItem(it) { return { uid: UID++, id: it.id, type: it.type, t: it.t.slice(), n: it.n.slice(), extra: it.extra }; }

function termsOf(it) {
  const d = getDef(it.type);
  return (d.terms || []).map(p => { const [x, y] = rot(p[0], p[1], it.n[17]); return [it.n[8] + x, it.n[9] + y]; });
}

// ---------------------------------------------------------------- sítě (spoje)
function onSeg(px, py, w) { // bod uvnitř úsečky (ne na koncích)
  const [x1, y1, x2, y2] = w;
  if ((px === x1 && py === y1) || (px === x2 && py === y2)) return false;
  if ((x2 - x1) * (py - y1) !== (y2 - y1) * (px - x1)) return false;
  return px >= Math.min(x1, x2) && px <= Math.max(x1, x2) && py >= Math.min(y1, y2) && py <= Math.max(y1, y2);
}
function wiresOf(doc) { return doc.items.filter(i => WIRE.has(i.type)).map(i => [i.n[8], i.n[9], i.n[10], i.n[11], i]); }

function buildNets(doc) {
  const idx = new Map(), par = [];
  const pt = (x, y) => { const k = x + ',' + y; let i = idx.get(k); if (i === undefined) { i = par.length; par.push(i); idx.set(k, i); } return i; };
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
  const ws = wiresOf(doc);
  for (const w of ws) uni(pt(w[0], w[1]), pt(w[2], w[3]));
  // Bod uvnitř vodiče se s ním spojí jen tehdy, je-li to uzel (tečka), svorka součástky,
  // konec souběžného (překrývajícího se) vodiče nebo spojnice GRAFCETu. Pouhé křížení ani
  // dotyk tvaru T bez tečky spojení není – stejně jako v CADe_SIMU.
  const hard = new Set(), endsAt = new Map();
  for (const it of doc.items) {
    if (it.type === NODE) { pt(it.n[8], it.n[9]); hard.add(it.n[8] + ',' + it.n[9]); }
    else for (const [x, y] of termsOf(it)) { pt(x, y); hard.add(x + ',' + y); }
  }
  for (const w of ws) for (const k of [w[0] + ',' + w[1], w[2] + ',' + w[3]]) { if (!endsAt.has(k)) endsAt.set(k, []); endsAt.get(k).push(w); }
  const colin = (v, w) => (v[2] - v[0]) * (w[3] - w[1]) === (v[3] - v[1]) * (w[2] - w[0]);
  for (const [k, i] of idx) {
    const [x, y] = k.split(',').map(Number), ends = endsAt.get(k) || [];
    for (const w of ws) if (onSeg(x, y, w) && (hard.has(k) || ends.some(v => colin(v, w) || (v[4].type === 10106 && w[4].type === 10106)))) uni(i, pt(w[0], w[1]));
  }
  const ids = new Map(), ofKey = new Map(); let count = 0;
  for (const [k, i] of idx) { const r = find(i); if (!ids.has(r)) ids.set(r, count++); ofKey.set(k, ids.get(r)); }
  return { ofKey, count };
}

// sítě podle realistického zapojení: svorka = „uid:index“, spojují je jen vodiče z reality
// Prvky, které nemají fyzickou podobu (GRAFCET), zůstávají spojené podle schématu.
const REAL_KINDS = new Set(['supply', 'fuse', 'breaker', 'mstarter', 'rcd', 'mswitch', 'thermal', 'contactor', 'contact', 'load', 'motor3', 'motorYD', 'motor1', 'meter', 'trafo', 'hsw', 'socket', 'emeter', 'clamp', 'socket3', 'load3', 'emeter3']);
function buildRealNets(doc) {
  const idx = new Map(), par = [];
  const pt = k => { let i = idx.get(k); if (i === undefined) { i = par.length; par.push(i); idx.set(k, i); } return i; };
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  let sn = null;
  for (const it of doc.items) {
    const d = getDef(it.type); if (!d.terms || !d.terms.length) continue;
    if (REAL_KINDS.has(d.kind)) d.terms.forEach((_, i) => pt(it.uid + ':' + i));
    else { sn = sn || buildNets(doc); termsOf(it).forEach(([x, y], i) => { const a = pt(it.uid + ':' + i), b = pt('s' + sn.ofKey.get(x + ',' + y)); const p = find(a), q = find(b); if (p !== q) par[p] = q; }); }
  }
  for (const w of (doc.real && doc.real.wires) || []) {
    const a = idx.get(w.a[0] + ':' + w.a[1]), b = idx.get(w.b[0] + ':' + w.b[1]);
    if (a !== undefined && b !== undefined) { const x = find(a), y = find(b); if (x !== y) par[x] = y; }
  }
  const ids = new Map(), ofKey = new Map(); let count = 0;
  for (const [k, i] of idx) { const r = find(i); if (!ids.has(r)) ids.set(r, count++); if (k[0] !== 's') ofKey.set(k, ids.get(r)); }
  return { ofKey, count, real: true };
}

// body, kde se má kreslit spojovací tečka
function junctions(doc) {
  const ws = wiresOf(doc), deg = new Map(), res = new Set();
  const add = (k, v) => deg.set(k, (deg.get(k) || 0) + v);
  for (const w of ws) { if (w[0] === w[2] && w[1] === w[3]) continue; add(w[0] + ',' + w[1], 1); add(w[2] + ',' + w[3], 1); }
  for (const [k, v] of deg) if (v >= 3) res.add(k);
  return res;
}

// ---------------------------------------------------------------- simulace
function keyOf(it) { const k = norm(it.t[0]); return k || '#' + it.uid; }
function secondsOf(it) { const a = parseFloat(it.t[4]) || 0, b = parseFloat(it.t[5]) || 0; return a * 60 + b; }

function simStart(doc, real) {
  const nets = real ? buildRealNets(doc) : buildNets(doc);
  const st = { doc, nets, t: 0, coil: {}, man: {}, trip: {}, vars: {}, timers: {}, on: {}, motor: {}, brk: {}, stage: {}, latch: {}, cyl: {}, blown: {}, volt: {}, lvl: {}, heat: {}, meas: {}, trafoV: {}, trafoP: {}, sw: {}, plug: {}, pulse: {}, pulsePrev: {}, stair: {}, pir: {}, energy: {}, tbitV: {}, trafos: [], fineV: new Map(), netPot: new Int32Array(nets.count), short: false, msg: '', comps: [] };
  for (const it of doc.items) {
    const d = getDef(it.type);
    if (!d.kind || d.kind === 'wire' || d.kind === 'node' || d.kind === 'gfx' || d.kind === 'text') continue;
    const tn = real ? (d.terms || []).map((_, i) => nets.ofKey.get(it.uid + ':' + i)) : termsOf(it).map(([x, y]) => nets.ofKey.get(x + ',' + y));
    st.comps.push({ it, d, tn, key: keyOf(it) });
    if (d.kind === 'stage' && d.init) st.stage[it.uid] = { on: true, since: 0 };
    if (d.kind === 'cyl') st.cyl[it.uid] = 0;
    if (d.kind === 'trafo' && st.trafos.length < 20) st.trafos.push({ c: st.comps[st.comps.length - 1], bit: 128 << st.trafos.length });
  }
  simStep(st, 0);
  return st;
}

function actuated(st, k) { return !!(st.coil[k] || st.man[k] || st.trip[k] || st.vars[k]); }

function poleClosed(st, c, p) {
  const d = c.d;
  let a;
  switch (d.kind) {
    case 'fuse': return !st.blown[c.it.uid];
    case 'thermal': return true;
    case 'breaker': case 'mswitch': case 'mstarter': case 'rcd': return !!st.brk[c.it.uid];
    case 'meter': case 'emeter': case 'emeter3': case 'clamp': return true;
    case 'hsw': { const on = ((st.sw[c.it.uid] | 0) >> (p.bit || 0)) & 1; return p.nc ? !on : !!on; }
    case 'contactor': a = !!st.coil[c.key]; break;
    default:
      if (d.src === 'ton') { const tm = st.timers[c.key]; a = tm ? tm.done : actuated(st, c.key); }
      else if (d.src === 'toff') { const tm = st.timers[c.key]; a = tm ? tm.done : actuated(st, c.key); }
      else a = actuated(st, c.key);
  }
  return p.nc ? !a : a;
}
function isActuated(st, c) { // pro kreslení
  const d = c.d;
  if (d.kind === 'breaker' || d.kind === 'mswitch' || d.kind === 'mstarter' || d.kind === 'rcd') return !!st.brk[c.it.uid];
  if (d.kind === 'contactor') return !!st.coil[c.key];
  if (d.kind === 'hsw') return !!st.sw[c.it.uid];
  if (d.kind === 'socket' || d.kind === 'socket3' || d.kind === 'load3') return !!st.plug[c.it.uid];
  if (d.kind === 'thermal') return !!st.trip[c.key];
  if (d.kind === 'fuse') return !!st.blown[c.it.uid];
  if (d.kind === 'key') return !!st.man[c.key];
  if (d.kind === 'contact') return d.poles[0].nc ? !poleClosed(st, c, d.poles[0]) : poleClosed(st, c, d.poles[0]);
  return false;
}

// Prvky, jejichž sepnuté póly jsou ve výpočtu samostatné větve s vlastním proudem
// (měří se jimi proud): ampérmetr, motorový spouštěč, tepelné relé, proudový chránič.
const MEAS = new Set(['meter', 'mstarter', 'thermal', 'rcd', 'emeter', 'emeter3']);
const TZ = 1 << 30;           // „0 V“ sekundáru transformátoru
const SQ3 = Math.sqrt(3);

// Hrubé sítě (všechny sepnuté póly = jeden uzel) slouží ke zkratům a barvení vodičů,
// jemné sítě (měřicí póly rozpojené) k výpočtu napětí a proudů.
function solve(st) {
  const n = st.nets.count, par = new Int32Array(n), parF = new Int32Array(n);
  for (let i = 0; i < n; i++) { par[i] = i; parF[i] = i; }
  const fnd = P => i => { while (P[i] !== i) { P[i] = P[P[i]]; i = P[i]; } return i; };
  const find = fnd(par), findF = fnd(parF), meas = [];
  for (const c of st.comps) if (c.d.poles) c.d.poles.forEach((p, pi) => {
    if (!poleClosed(st, c, p)) return;
    const a = find(c.tn[p.a]), b = find(c.tn[p.b]); if (a !== b) par[a] = b;
    if (MEAS.has(c.d.kind)) meas.push({ c, pi, p });
    else { const x = findF(c.tn[p.a]), y = findF(c.tn[p.b]); if (x !== y) parF[x] = y; }
  });
  const pot = new Int32Array(n), potF = new Int32Array(n);
  const put = (t, bit) => { pot[find(t)] |= bit; potF[findF(t)] |= bit; };
  for (const c of st.comps) if (c.d.kind === 'supply') c.d.pots.forEach((p, i) => put(c.tn[i], POT[p]));
  for (const tr of st.trafos) { const v = st.trafoV[tr.c.it.uid]; if (v) { st.tbitV[tr.bit] = v; put(tr.c.tn[2], tr.bit); put(tr.c.tn[3], TZ); } }
  return { find, findF, pot, potF, meas };
}
const bits = v => { let c = 0; while (v) { c += v & 1; v >>>= 1; } return c; };
// Fázory napětí proti zemi (TN síť 3×400/230 V, 50 Hz; stejnosměrný zdroj 24 V, − spojen se zemí)
const S3 = 230 * Math.sqrt(3) / 2;
const PHASOR = { 1: [230, 0], 2: [-115, -S3], 4: [-115, S3], 8: [0, 0], 16: [0, 0], 32: [24, 0], 64: [0, 0] };
const PKEY = { 1: 'a', 2: 'b', 4: 'c', 8: '0', 16: '0', 32: 'p', 64: '0' };
const pkey = b => b <= 64 ? PKEY[b] : b === TZ ? '0' : 't' + b;
function eachBit(p, f) { for (let b = 1; b <= TZ; b *= 2) if (p & b) { const r = f(b); if (r !== undefined) return r; } }
function shorted(p) { let k = null; return !!eachBit(p, b => { const q = pkey(b); if (k === null) k = q; else if (k !== q) return true; }); }
function fixedV(st, p) { return eachBit(p, b => b <= 64 ? PHASOR[b] : b === TZ ? [0, 0] : (st.tbitV[b] || [0, 0])) || null; }
const U_AC = 230, U_DC = 24, N_SYNC = 1500;
// jmenovité příkony zátěží [W]
const P_LOAD = { coil: 8, ton: 3, toff: 3, lamp: 2, blink: 2, horn: 15, valve: 6, light: 60, bell: 8, pulse: 3, stair: 3 };
const loadP = c => c.d.defaults && c.d.defaults[9] ? pnum(c.it.t[9], +c.d.defaults[9]) : (P_LOAD[c.d.sub] || 5);

// jmenovité napětí zátěže podle zdroje, ke kterému je připojená (síť 230 V, 24 V DC, sekundár transformátoru)
function loadUn(st, s, c) {
  let u = U_AC;
  for (const t of c.tn) { const p = s.pot[s.find(t)];
    if (p & 96) u = U_DC;
    for (const tr of st.trafos) if (p & (tr.bit | TZ)) u = trafoUs(tr.c.it); }
  return u;
}
const pnum = (v, d) => { const x = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(x) && x > 0 ? x : d; };
const trafoUp = it => pnum(it.t[6], 230), trafoUs = it => pnum(it.t[7], 24);
// impedance vinutí motoru: jmenovitá při jmenovitých otáčkách, v klidu 6× menší (záběrový proud)
function motorZ(st, c) {
  const k = c.d.kind, m = st.motor[c.it.uid] || (st.motor[c.it.uid] = { ang: 0, rpm: 0, revs: 0 });
  const P = pnum(c.it.t[9], k === 'motor1' ? 0.75 : k === 'motorYD' ? 7.5 : 4) * 1000;
  const In = k === 'motor1' ? P / (0.75 * 230 * 0.85) : P / (0.86 * SQ3 * 400 * 0.85);
  m.In = In;
  const slipK = 1 + 5 * (1 - Math.min(1, Math.abs(m.rpm) / 1450));
  return (k === 'motorYD' ? 400 / (In / SQ3) : 230 / In) / slipK;
}

// Modifikovaná uzlová metoda: zátěže a vinutí jsou vodivosti, zdroje ideální, měřicí póly
// jsou větve s nulovým napětím, jejichž proud je další neznámá.
function network(st, s) {
  const idx = new Map(), nodes = [], els = [], brs = [];
  const node = key => { let i = idx.get(key); if (i === undefined) { i = nodes.length; idx.set(key, i); const f = typeof key === 'number' ? fixedV(st, s.potF[key]) : null; nodes.push({ key, fixed: f }); } return i; };
  const el = (c, w, a, b, g) => { const e = { c, w, a: node(a), b: node(b), g }; els.push(e); return e; };
  for (const c of st.comps) {
    const k = c.d.kind, r = i => s.findF(c.tn[i]);
    if (k === 'load') { const u = c.Un; el(c, 0, r(0), r(1), loadP(c) / (u * u)); }
    else if (k === 'socket') { if (st.plug[c.it.uid]) el(c, 0, r(0), r(1), pnum(c.it.t[9], 1000) / (U_AC * U_AC)); }
    else if (k === 'socket3' || k === 'load3') { // souměrná odporová zátěž do hvězdy, uzel hvězdy spojen s N
      if (st.plug[c.it.uid]) { const star = 's' + c.it.uid, g = pnum(c.it.t[9], k === 'load3' ? 7000 : 3000) / 3 / (U_AC * U_AC); for (let i = 0; i < 3; i++) el(c, i, r(i), star, g); el(c, 3, star, r(3), 1); } }
    else if (k === 'motor1') el(c, 0, r(0), r(1), 1 / motorZ(st, c));
    else if (k === 'motor3') { const star = 'm' + c.it.uid, g = 1 / motorZ(st, c); for (let i = 0; i < 3; i++) el(c, i, r(i), star, g); }
    else if (k === 'motorYD') { const g = 1 / motorZ(st, c); el(c, 0, r(0), r(5), g); el(c, 1, r(1), r(6), g); el(c, 2, r(2), r(4), g); }
    else if (k === 'trafo') { const up = trafoUp(c.it); el(c, 0, r(0), r(1), Math.max(2, st.trafoP[c.it.uid] || 0) / (up * up)); }
  }
  for (const m of s.meas) brs.push({ m, a: node(s.findF(m.c.tn[m.p.a])), b: node(s.findF(m.c.tn[m.p.b])), J: null });
  // souvislé části (přes zátěže i měřicí větve); bez pevného potenciálu = plovoucí, proud neteče
  const par = nodes.map((_, i) => i), find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (const e of [...els, ...brs]) { const a = find(e.a), b = find(e.b); if (a !== b) par[a] = b; }
  const live = new Set(); nodes.forEach((n, i) => { if (n.fixed) live.add(find(i)); });
  let m = 0; nodes.forEach((n, i) => { n.V = n.fixed; n.u = -1; if (!n.fixed && live.has(find(i))) n.u = m++; });
  const act = brs.filter(b => live.has(find(b.a)) && !(nodes[b.a].fixed && nodes[b.b].fixed) && b.a !== b.b);
  act.forEach(b => { b.u = m++; });
  if (m) {
    const A = Array.from({ length: m }, () => new Float64Array(m + 2));
    for (const e of els) {
      if (e.a === e.b) continue; const na = nodes[e.a], nb = nodes[e.b];
      for (const [x, y] of [[na, nb], [nb, na]]) {
        if (x.u < 0) continue; A[x.u][x.u] += e.g;
        if (y.u >= 0) A[x.u][y.u] -= e.g; else if (y.fixed) { A[x.u][m] += e.g * y.fixed[0]; A[x.u][m + 1] += e.g * y.fixed[1]; }
      }
    }
    for (const b of act) {
      const na = nodes[b.a], nb = nodes[b.b], row = A[b.u];
      if (na.u >= 0) { A[na.u][b.u] += 1; row[na.u] += 1; } else { row[m] -= na.fixed[0]; row[m + 1] -= na.fixed[1]; }
      if (nb.u >= 0) { A[nb.u][b.u] -= 1; row[nb.u] -= 1; } else { row[m] += nb.fixed[0]; row[m + 1] += nb.fixed[1]; }
    }
    const piv = new Int32Array(m).fill(-1);
    for (let i = 0; i < m; i++) { // Gaussova–Jordanova eliminace s výběrem hlavního prvku
      let pv = i; for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[pv][i])) pv = r;
      if (Math.abs(A[pv][i]) < 1e-12) continue; const t = A[i]; A[i] = A[pv]; A[pv] = t; piv[i] = 1;
      for (let r = 0; r < m; r++) { if (r === i) continue; const f = A[r][i] / A[i][i]; if (f) for (let k = i; k < m + 2; k++) A[r][k] -= f * A[i][k]; }
    }
    const val = i => piv[i] < 0 || Math.abs(A[i][i]) < 1e-12 ? null : [A[i][m] / A[i][i], A[i][m + 1] / A[i][i]];
    nodes.forEach(n => { if (n.u >= 0) n.V = val(n.u); });
    act.forEach(b => { b.J = val(b.u); });
  }
  for (const e of els) { const a = nodes[e.a].V, b = nodes[e.b].V; e.V = a && b ? [a[0] - b[0], a[1] - b[1]] : [0, 0]; e.I = [e.V[0] * e.g, e.V[1] * e.g]; }
  const fineV = new Map(); nodes.forEach(n => { if (typeof n.key === 'number' && n.V) fineV.set(n.key, n.V); });
  return { els, brs, nodes, idx, fineV };
}
// napětí sítě (fázor proti zemi) nebo null, když je síť plovoucí / bez napětí
function netVoltage(st, net) {
  if (net === undefined || !st.findF) return null;
  const f = st.findF(net); return st.fineV.get(f) || fixedV(st, st.potF ? st.potF[f] : 0);
}
// popis potenciálů sítě pro měření myší
function potNames(p) {
  const out = []; eachBit(p, b => { out.push(b <= 64 ? POT_NAME[b] : b === TZ ? '0 V sek.' : 'sek. T' + (Math.log2(b) - 6)); }); return out;
}
const cabs = v => v ? Math.hypot(v[0], v[1]) : 0;

function simStep(st, dt) {
  st.t += dt;
  for (const c of st.comps) if (c.d.click === 'pir') st.man[c.key] = (st.pir[c.it.uid] || 0) > st.t; // čidlo drží výstup po dobu doběhu
  for (const c of st.comps) if (c.d.click === 'clock') { const on = pnum(c.it.t[5], 10), off = pnum(c.it.t[6], 10); st.man[c.key] = (st.t % (on + off)) < on; } // spínací hodiny (zkrácený čas)
  let s = solve(st);
  // zkrat -> vybavit jističe v postižené větvi
  st.short = false;
  for (let pass = 0; pass < 4; pass++) {
    const bad = new Set();
    for (let i = 0; i < st.nets.count; i++) if (s.find(i) === i && shorted(s.pot[i])) bad.add(i);
    if (!bad.size) { st.short = false; break; }
    st.short = true;
    let tripped = false;
    for (const c of st.comps) {
      if (!st.brk[c.it.uid] || !c.tn.some(t => bad.has(s.find(t)))) continue;
      if (c.d.kind === 'breaker' || c.d.kind === 'mstarter') { st.brk[c.it.uid] = false; tripped = true; st.msg = 'Zkrat! ' + (c.d.kind === 'mstarter' ? 'Motorový spouštěč ' : 'Jistič ') + (c.it.t[0] || '') + ' vybavil.'; }
      else if (c.d.kind === 'rcd' && c.tn.some(t => bad.has(s.find(t)) && (s.pot[s.find(t)] & 16))) { st.brk[c.it.uid] = false; tripped = true; st.msg = 'Zemní spojení! Proudový chránič ' + (c.it.t[0] || '') + ' vybavil.'; }
    }
    if (!tripped) for (const c of st.comps) if (c.d.kind === 'fuse' && !st.blown[c.it.uid] && c.tn.some(t => bad.has(s.find(t)))) { st.blown[c.it.uid] = true; tripped = true; st.msg = 'Zkrat! Pojistka ' + (c.it.t[0] || '') + ' je přepálená (kliknutím ji vyměníte).'; }
    if (!tripped) { st.msg = 'Zkrat! Mezi různými potenciály je přímé spojení bez jištění.'; break; }
    s = solve(st);
  }
  for (let i = 0; i < st.nets.count; i++) st.netPot[i] = s.pot[s.find(i)];
  st.find = s.find; st.findF = s.findF; st.potF = s.potF;
  for (const c of st.comps) if (c.d.kind === 'load') c.Un = loadUn(st, s, c);
  const net = network(st, s); st.fineV = net.fineV;
  measure(st, s, net, dt);
  const coil = {}, wind = new Map();
  for (const e of net.els) { let w = wind.get(e.c); if (!w) wind.set(e.c, w = []); w[e.w] = e; }
  for (const c of st.comps) {
    const d = c.d, u = c.it.uid, w = wind.get(c);
    if (d.kind === 'load') {
      const U = Math.hypot(w[0].V[0], w[0].V[1]), ref = c.Un;
      let on = U >= 0.7 * ref, lvl = Math.min(1, (U / ref) * (U / ref));
      if (!on && st.vars[c.key] && d.sub !== 'coil') { on = true; lvl = 1; } // výstup řízený GRAFCETem
      st.on[u] = on; st.volt[u] = U; st.lvl[u] = lvl; st.meas[u] = { I: cabs(w[0].I), Un: ref };
      if (d.sub === 'coil' || d.sub === 'ton' || d.sub === 'toff') { if (on) coil[c.key] = true; }
      if (d.sub === 'pulse' || d.sub === 'stair') { // impulsní relé přepne na každý impulz, automat při impulzu odměří čas
        const rise = on && !st.pulsePrev[u]; st.pulsePrev[u] = on;
        if (d.sub === 'pulse') { if (rise) st.pulse[c.key] = !st.pulse[c.key]; if (st.pulse[c.key]) coil[c.key] = true; }
        else { if (on) st.stair[c.key] = st.t + (secondsOf(c.it) || 60); const left = (st.stair[c.key] || 0) - st.t; st.meas[u].left = Math.max(0, left); if (left > 0) coil[c.key] = true; }
      }
      if (d.sub === 'ton' || d.sub === 'toff') {
        const tm = st.timers[c.key] || (st.timers[c.key] = { on: false, since: 0, done: false, T: 0, left: 0, sub: d.sub });
        tm.T = secondsOf(c.it); tm.sub = d.sub; tm.next = tm.next || on;
      }
    } else if (d.kind === 'motor3' || d.kind === 'motorYD' || d.kind === 'motor1') {
      const m = st.motor[u] || (st.motor[u] = { ang: 0, rpm: 0, revs: 0 });
      let tau = 0, U = 0;
      if (d.kind === 'motor1') { U = Math.hypot(w[0].V[0], w[0].V[1]); tau = (U / U_AC) * (U / U_AC); if (tau < 0.5) tau = 0; }
      else {
        // souměrné složky napětí vinutí: sousledná složka motor roztáčí, zpětná brzdí
        const [a, b, cc] = [w[0].V, w[1].V, w[2].V], h = Math.sqrt(3) / 2;
        const p = [(a[0] - 0.5 * b[0] - h * b[1] - 0.5 * cc[0] + h * cc[1]) / 3, (a[1] - 0.5 * b[1] + h * b[0] - 0.5 * cc[1] - h * cc[0]) / 3];
        const n = [(a[0] - 0.5 * b[0] + h * b[1] - 0.5 * cc[0] - h * cc[1]) / 3, (a[1] - 0.5 * b[1] - h * b[0] - 0.5 * cc[1] + h * cc[0]) / 3];
        const Un = d.kind === 'motor3' ? 230 : 400;
        tau = (p[0] * p[0] + p[1] * p[1] - n[0] * n[0] - n[1] * n[1]) / (Un * Un);
        U = Math.max(Math.hypot(a[0], a[1]), Math.hypot(b[0], b[1]), Math.hypot(cc[0], cc[1]));
      }
      const drive = Math.abs(tau) >= 0.2;
      m.tau = tau; m.U = U; m.dir = drive ? Math.sign(tau) : 0;
      m.fault = !drive && U > 50;                       // napětí je, ale točivé pole ne (chybí fáze)
      m.mode = !drive ? '' : d.kind !== 'motorYD' ? 'run' : (s.find(c.tn[4]) === s.find(c.tn[5]) && s.find(c.tn[5]) === s.find(c.tn[6]) ? 'Y' : 'D');
      const target = drive ? Math.sign(tau) * N_SYNC * (1 - Math.min(0.2, 0.0333 / Math.abs(tau))) : 0;
      const rate = drive ? 0.3 + 2 * Math.min(1, Math.abs(tau)) : 0.8;
      m.rpm += (target - m.rpm) * Math.min(1, dt * rate);
      if (!drive && Math.abs(m.rpm) < 3) m.rpm = 0;
      m.revs += Math.abs(m.rpm) / 60 * dt;
      m.ang += m.rpm / N_SYNC * 2 * Math.PI * 1.1 * dt;  // zpomaleně, aby byl směr vidět
      m.speed = m.rpm / N_SYNC;
      const Iw = w.slice(0, 3).filter(Boolean).map(e => cabs(e.I));
      m.I = d.kind === 'motorYD' ? (m.mode === 'D' ? Iw[0] * SQ3 : Iw[0]) : Math.max(...Iw); // proud přívodem (v Δ √3× proud vinutí)
    }
  }
  // časovače
  for (const k in st.timers) {
    const tm = st.timers[k], on = !!tm.next; tm.next = false;
    if (tm.sub === 'ton') {
      if (on && !tm.on) tm.since = st.t;
      tm.done = on && st.t - tm.since >= tm.T; tm.left = on && !tm.done ? tm.T - (st.t - tm.since) : 0;
    } else {
      if (!on && tm.on) tm.since = st.t;
      const hold = !on && tm.since !== null && tm.wasOn && st.t - tm.since < tm.T;
      if (on) tm.wasOn = true;
      tm.done = on || hold; tm.left = hold ? tm.T - (st.t - tm.since) : 0;
      if (!on && !hold) tm.wasOn = false;
    }
    tm.on = on;
  }
  st.coil = coil;
  grafcet(st, dt);
}

// ---- měřicí přístroje, tepelná ochrana, proudový chránič, transformátor
const T_THERM = 508;   // tepelná spoušť třídy 10: 7,2 × Iᵣ vybaví za 10 s, 6 × Iᵣ za ~15 s
function measure(st, s, net, dt) {
  const byC = new Map(); for (const b of net.brs) { if (!byC.has(b.m.c)) byC.set(b.m.c, []); byC.get(b.m.c)[b.m.pi] = b.J; }
  const V = t => netVoltage(st, t);
  for (const c of st.comps) {
    const d = c.d, u = c.it.uid, J = byC.get(c) || [];
    if (d.kind === 'meter' && d.sub === 'V') { const a = V(c.tn[0]), b = V(c.tn[1]); st.meas[u] = { V: a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0, dc: !!((s.pot[s.find(c.tn[0])] | s.pot[s.find(c.tn[1])]) & 96) }; }
    else if (d.kind === 'meter') st.meas[u] = { I: cabs(J[0]), ok: !!J[0] || !poleLive(s, c) };
    else if (d.kind === 'mstarter' || d.kind === 'thermal') {
      const I = Math.max(0, ...J.map(cabs)), Ir = pnum(c.it.t[8], 0);
      let h = st.heat[u] || 0;
      if (Ir) { const x = I / Ir; h = x > 1.05 ? h + dt * (x * x - 1) / T_THERM : Math.max(0, h - dt * h / 120); }
      st.heat[u] = h; st.meas[u] = { I, Ir, heat: h };
      if (Ir && h >= 1) {
        st.heat[u] = 1;
        if (d.kind === 'mstarter' && st.brk[u]) { st.brk[u] = false; st.msg = 'Přetížení! Motorový spouštěč ' + (c.it.t[0] || '') + ' vybavil (' + I.toFixed(1).replace('.', ',') + ' A při nastavení ' + Ir + ' A).'; }
        if (d.kind === 'thermal' && !st.trip[c.key]) { st.trip[c.key] = true; st.msg = 'Přetížení! Tepelné relé ' + (c.it.t[0] || '') + ' vybavilo (' + I.toFixed(1).replace('.', ',') + ' A při nastavení ' + Ir + ' A).'; }
      }
    } else if (d.kind === 'rcd') {
      let re = 0, im = 0; for (const j of J) if (j) { re += j[0]; im += j[1]; }
      const res = Math.hypot(re, im); st.meas[u] = { res, I: Math.max(0, ...J.map(cabs)) };
      if (st.brk[u] && res > 0.03) { st.brk[u] = false; st.msg = 'Proudový chránič ' + (c.it.t[0] || '') + ' vybavil: unikající proud ' + Math.round(res * 1000) + ' mA (citlivost 30 mA).'; }
    } else if (d.kind === 'emeter') {
      const a = V(c.tn[0]), b = V(c.tn[1]), j = J[0], U = a && b ? [a[0] - b[0], a[1] - b[1]] : [0, 0];
      const P = j ? Math.abs(U[0] * j[0] + U[1] * j[1]) : 0;
      st.energy[u] = (st.energy[u] || 0) + P * dt;
      st.meas[u] = { U: cabs(U), I: cabs(j), P, Wh: st.energy[u] / 3600 };
    } else if (d.kind === 'emeter3') {
      const n = V(c.tn[3]) || [0, 0]; let P = 0; const I = [];
      for (let i = 0; i < 3; i++) { const a = V(c.tn[i]), j = J[i]; I.push(cabs(j)); if (a && j) P += Math.abs((a[0] - n[0]) * j[0] + (a[1] - n[1]) * j[1]); }
      st.energy[u] = (st.energy[u] || 0) + P * dt;
      st.meas[u] = { I, P, Wh: st.energy[u] / 3600, U: (() => { const a = V(c.tn[0]), b = V(c.tn[1]); return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0; })() };
    } else if (d.kind === 'socket3' || d.kind === 'load3') {
      const v = [0, 1, 2].map(i => V(c.tn[i]) || [0, 0]), P = pnum(c.it.t[9], d.kind === 'load3' ? 7000 : 3000), h = Math.sqrt(3) / 2;
      const Ull = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => Math.hypot(v[a][0] - v[b][0], v[a][1] - v[b][1]));
      // sled fází: sousledná (pravotočivá) vs. zpětná složka
      const [a, b, cc] = v;
      const ps = Math.hypot((a[0] - 0.5 * b[0] - h * b[1] - 0.5 * cc[0] + h * cc[1]), (a[1] - 0.5 * b[1] + h * b[0] - 0.5 * cc[1] - h * cc[0]));
      const ng = Math.hypot((a[0] - 0.5 * b[0] + h * b[1] - 0.5 * cc[0] - h * cc[1]), (a[1] - 0.5 * b[1] - h * b[0] - 0.5 * cc[1] + h * cc[0]));
      const live = [0, 1, 2].filter(i => cabs(v[i]) > 50).length;
      st.meas[u] = { Ull, live, rot: live === 3 ? (ps > ng * 1.5 ? 'R' : ng > ps * 1.5 ? 'L' : '?') : '', pe: !!(s.pot[s.find(c.tn[4])] & 16), n: !!(s.pot[s.find(c.tn[3])] & 8), P, I: st.plug[u] ? P / 3 / U_AC : 0 };
    } else if (d.kind === 'socket') {
      const a = V(c.tn[0]), b = V(c.tn[1]), U = a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0, P = pnum(c.it.t[9], 1000);
      st.meas[u] = { U, I: st.plug[u] ? U * P / (U_AC * U_AC) : 0, pe: !!(s.pot[s.find(c.tn[2])] & 16), Lok: !!(s.pot[s.find(c.tn[0])] & 7), P };
    } else if (d.kind === 'trafo') {
      const a = V(c.tn[0]), b = V(c.tn[1]), r = trafoUs(c.it) / trafoUp(c.it);
      const vp = a && b ? [a[0] - b[0], a[1] - b[1]] : [0, 0], vs = [vp[0] * r, vp[1] * r];
      const was = !!st.trafoV[u]; st.trafoV[u] = cabs(vs) > 1 ? vs : null;
      // příkon sekundáru = proud z vývodu 2.1 × napětí → odebírá se z primáru v dalším kroku
      let I = 0; const f1 = net.idx.get(s.findF(c.tn[2]));
      if (f1 !== undefined && was) { let re = 0, im = 0;
        for (const e of net.els) { if (e.a === f1) { re += e.I[0]; im += e.I[1]; } else if (e.b === f1) { re -= e.I[0]; im -= e.I[1]; } }
        for (const br of net.brs) if (br.J) { if (br.a === f1) { re += br.J[0]; im += br.J[1]; } else if (br.b === f1) { re -= br.J[0]; im -= br.J[1]; } }
        I = Math.hypot(re, im); }
      st.trafoP[u] = cabs(vs) * I; st.meas[u] = { Up: cabs(vp), Us: cabs(vs), Is: I };
    }
  }
}
const poleLive = (s, c) => c.tn.some(t => s.pot[s.find(t)]);

// ---- GRAFCET + pneumatické válce
function evalCond(st, text, since) {
  const raw = (text || '').trim(); if (!raw || raw === '1') return true; if (raw === '0') return false;
  const one = s => {
    s = s.trim(); let neg = false;
    while (s[0] === '/' || s[0] === '!') { neg = !neg; s = s.slice(1).trim(); }
    let v; const k = norm(s);
    if (k in st.known) v = actuated(st, k);
    else { const m = /^(\d+(?:[.,]\d+)?)\s*S$/i.exec(s); v = m ? (st.t - since >= parseFloat(m[1].replace(',', '.'))) : actuated(st, k); }
    return neg ? !v : v;
  };
  if (norm(raw) in st.known) return one(raw);
  return raw.split('+').some(or => or.split(/[*·.]/).every(one));
}

function grafcet(st, dt) {
  if (!st.known) {
    st.known = {};
    for (const c of st.comps) {
      if (c.d.kind === 'key' || c.d.kind === 'contact' || c.d.kind === 'load') st.known[c.key] = 1;
      if (c.d.kind === 'cyl') { st.known[norm(c.it.t[4])] = 1; st.known[norm(c.it.t[6])] = 1; }
    }
    st.hasG = st.comps.some(c => c.d.kind === 'stage');
  }
  const vars = {};
  // válce
  for (const c of st.comps) if (c.d.kind === 'cyl') {
    const u = c.it.uid, plus = norm((c.it.t[10] || '').split('*')[0]), minus = norm(c.it.extra);
    const vp = Math.max(0.2, parseFloat(c.it.t[2]) || 5), vm = Math.max(0.2, parseFloat(c.it.t[3]) || 5);
    let p = st.cyl[u] || 0;
    if (st.vars[plus] || st.latch[plus]) p += dt * vp / 10; else if (st.vars[minus] || st.latch[minus]) p -= dt * vm / 10;
    p = Math.max(0, Math.min(1, p)); st.cyl[u] = p;
    if (p <= 0) vars[norm(c.it.t[4])] = true;
    if (p >= 1) vars[norm(c.it.t[6])] = true;
  }
  if (st.hasG) {
    const stages = st.comps.filter(c => c.d.kind === 'stage'), fire = [];
    const f = st.find;
    for (const c of st.comps) if (c.d.kind === 'trans') {
      const up = stages.filter(s => f(s.tn[1]) === f(c.tn[0])), down = stages.filter(s => f(s.tn[0]) === f(c.tn[1]));
      if (!up.length || !up.every(s => st.stage[s.it.uid] && st.stage[s.it.uid].on)) continue;
      const since = Math.max(...up.map(s => st.stage[s.it.uid].since));
      if (st.t - since < 0.05) continue;
      if (evalCond(st, c.it.extra || c.it.t[0], since)) fire.push({ up, down });
    }
    for (const fr of fire) fr.up.forEach(s => { st.stage[s.it.uid].on = false; });
    for (const fr of fire) fr.down.forEach(s => { st.stage[s.it.uid] = { on: true, since: st.t }; });
    // akce: krok je vlevo od akce (řetěz akcí na stejné výšce)
    const acts = st.comps.filter(c => c.d.kind === 'action');
    for (const a of acts) {
      const sg = stages.filter(s => s.it.n[9] + 6 === a.it.n[9] && s.it.n[8] < a.it.n[8]).sort((p, q) => q.it.n[8] - p.it.n[8])[0];
      const on = !!(sg && st.stage[sg.it.uid] && st.stage[sg.it.uid].on);
      st.on[a.it.uid] = on;
      const k = norm(a.it.t[0]), mode = (a.it.t[6] || '0').trim();
      if (!on || !k) continue;
      if (mode === '1') st.latch[k] = true; else if (mode === '2') st.latch[k] = false; else vars[k] = true;
    }
    for (const k in st.latch) if (st.latch[k]) vars[k] = true;
  }
  st.vars = vars;
}

// ovládání myší v simulaci
function simPress(st, it, down, latch, part) {
  const c = st.comps.find(c => c.it === it); if (!c) return false;
  const d = c.d;
  if (d.kind === 'hsw') { if (down) { const m = st.sw[it.uid] | 0; st.sw[it.uid] = d.bits === 2 ? (part === 0 || part === 1 ? m ^ (1 << part) : (m + 1) & 3) : m ^ 1; } return true; }
  if (d.kind === 'socket' || d.kind === 'socket3' || d.kind === 'load3') { if (down) st.plug[it.uid] = !st.plug[it.uid]; return true; }
  if (d.click === 'clock') return true;
  if (d.click === 'pir') { if (down) st.pir[it.uid] = st.t + (secondsOf(it) || 20); return true; }
  if (d.kind === 'breaker' || d.kind === 'mswitch' || d.kind === 'mstarter') { if (down) { st.brk[it.uid] = !st.brk[it.uid]; st.msg = ''; if (st.brk[it.uid]) st.heat[it.uid] = 0; } return true; }
  if (d.kind === 'rcd') { // zapnutý chránič: klik = tlačítko TEST (vybaví, je-li pod napětím)
    if (down) {
      if (!st.brk[it.uid]) { st.brk[it.uid] = true; st.msg = ''; }
      else { st.brk[it.uid] = false; st.msg = c.tn.some(t => st.netPot[t] & 7) ? 'TEST: proudový chránič ' + (it.t[0] || '') + ' správně vybavil.' : 'Proudový chránič ' + (it.t[0] || '') + ' vypnut (bez napětí test nefunguje).'; }
    }
    return true;
  }
  if (d.kind === 'fuse') { if (down) { st.blown[it.uid] = !st.blown[it.uid]; st.msg = ''; } return true; }
  if (d.kind === 'thermal' || d.click === 'trip') { if (down) { st.trip[c.key] = !st.trip[c.key]; if (!st.trip[c.key]) for (const x of st.comps) if (x.key === c.key && x.d.kind === 'thermal') st.heat[x.it.uid] = 0; } return true; }
  if (d.click === 'toggle' || (d.click === 'momentary' && latch)) { if (down) st.man[c.key] = !st.man[c.key]; return true; }
  if (d.click === 'momentary') { st.man[c.key] = down; return true; }
  return false;
}

root.ES = { LIB, CATS, POT, POT_NAME, WIRE, NODE, getDef, norm, rot, parseCad, serializeCad, newItem, cloneItem, termsOf, bboxOf,
  buildNets, buildRealNets, emptyReal, REAL_KINDS, junctions, onSeg, PHASOR, netVoltage, potNames, shorted, TZ, simStart, simStep, simPress, isActuated, keyOf, secondsOf, DEFAULT_TRAILER };
})(typeof window !== 'undefined' ? window : globalThis);
