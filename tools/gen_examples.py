#!/usr/bin/env python3
"""Vygeneruje app/examples.js ze souborů ve složce Priklady."""
import base64, json, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TITLES = {
 'ElectroSchool - domovni instalace 3f': 'Domovní instalace 3f (sporák, motorová zásuvka, bojler)',
 'ElectroSchool - domovni instalace': 'Domovní instalace (schodiště, zásuvka, impulsní relé)',
 'ElectroSchool - mereni a ochrany': 'Měření a ochrany (spouštěč, trafo 24 V, chránič)',
 '1 ARRANQUE DIRECTO MOTOR 3 FASES': 'Přímý rozběh motoru',
 'Arranque directo de un motor trifasico': 'Přímý rozběh motoru (varianta 2)',
 '2 ARRAN DIRECT INVERSION DE GIRO': 'Reverzace motoru',
 'Inversion de Giro': 'Reverzace motoru (varianta 2)',
 '3  INVERSION DE GIRO TEMPORIZADO': 'Reverzace s časovačem',
 'INVERSION DE GIRO TEMPORIZADO': 'Reverzace s časovačem (varianta 2)',
 '4 ARRAN ESTRE-TRIANGULO': 'Rozběh hvězda–trojúhelník',
 '4 ARRAN ESTRE-TRIANGULO TEMP APAGADO TOTAL': 'Hvězda–trojúhelník s časovačem',
 'Arranque estrella - triangulo - temporizado': 'Hvězda–trojúhelník s časovačem (varianta 2)',
 'ARRAQUEN TRIANGULO ESTRELLA': 'Hvězda–trojúhelník (varianta 3)',
 'TRIANGULO ESTRELLA -PRA': 'Hvězda–trojúhelník (varianta 4)',
 '2 a las vez': 'Dva motory současně',
 'ARRANQUE DE TRES MOTORES': 'Rozběh tří motorů',
 'Arranque en cascada1,23,31': 'Kaskádový rozběh',
 'FIFO': 'FIFO – první zapnut, první vypnut',
 'PROYECTOMOC': 'Projekt MOC',
 'Puerta lev_sen_fincar': 'Vrata s čidlem a koncovými spínači',
 'PERFORACION_TIA': 'GRAFCET – vrtačka s pneumatickými válci',
 'mezcladora_de_4_productos': 'GRAFCET – míchačka 4 produktů',
}
d = os.path.join(root, 'Priklady'); out = []
for k, title in TITLES.items():
    p = os.path.join(d, k + '.cad')
    if os.path.exists(p):
        out.append({'title': title, 'file': k + '.cad', 'data': base64.b64encode(open(p, 'rb').read()).decode()})
rest = sorted(set(f[:-4] for f in os.listdir(d) if f.endswith('.cad')) - set(TITLES))
for k in rest:
    out.append({'title': k, 'file': k + '.cad', 'data': base64.b64encode(open(os.path.join(d, k + '.cad'), 'rb').read()).decode()})
open(os.path.join(root, 'app', 'examples.js'), 'w').write('window.ES_EXAMPLES = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print(len(out), 'příkladů')
