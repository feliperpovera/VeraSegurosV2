#!/usr/bin/env python3
"""Arma tools/blog-fuentes.json desde los JSON de investigación y deja SOLO las frases
cuya cita literal aparece en la página oficial citada (descargada aquí mismo).
Uso: python3 tools/verificar-fuentes.py <carpeta-con-A.json...> [--extra extra.json]
Las páginas que bloquean la descarga (p. ej. Allianz con Cloudflare) se pueden pasar
ya descargadas como texto en <carpeta>/paginas/<hash>.txt."""
import json, sys, re, html, hashlib, os, subprocess, unicodedata

carpeta = sys.argv[1]
cache = os.path.join(carpeta, 'paginas'); os.makedirs(cache, exist_ok=True)

def norm(t):
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    t = unicodedata.normalize('NFKC', t).lower()
    t = re.sub(r'[‘’“”"\'«»]', '', t)
    return re.sub(r'\s+', ' ', t).strip()

def pagina(url):
    f = os.path.join(cache, hashlib.md5(url.encode()).hexdigest() + '.txt')
    if not os.path.exists(f):
        r = subprocess.run(['curl', '-sL', '--max-time', '40', '-A', 'Mozilla/5.0 (Macintosh) Chrome/130', url], capture_output=True)
        txt = r.stdout.decode('utf-8', 'ignore')
        if 'pdf' in url.lower() or r.stdout[:4] == b'%PDF':
            open(f + '.pdf', 'wb').write(r.stdout)
            txt = ' '.join(subprocess.run(['pdftotext', *m, f + '.pdf', '-'], capture_output=True).stdout.decode('utf-8', 'ignore') for m in ([], ['-layout'])) if os.system('which pdftotext >/dev/null') == 0 else ''
        open(f, 'w').write(norm(txt))
    return open(f).read()

# Pares (url, cita) comprobados en un navegador real (sitios que bloquean curl, p. ej. Allianz).
nav_f = os.path.join(cache, 'navegador.json')
NAV = {(u, c) for u, c in json.load(open(nav_f))} if os.path.exists(nav_f) else set()
datos, malos = {}, []
for nombre in sorted(os.listdir(carpeta)):
    if not re.fullmatch(r'[A-G]\.json', nombre): continue
    for slug, d in json.load(open(os.path.join(carpeta, nombre))).items():
        out = {}
        for k, arr in d.items():
            if not isinstance(arr, list) or k == 'no_verificado':
                continue
            ok = []
            for x in arr:
                if not isinstance(x, dict) or not x.get('url') or not x.get('cita'):
                    continue
                x['url'] = x['url'].split(' ')[0]
                cita = norm(x['cita']).rstrip('.…')
                if (x['url'], x['cita']) in NAV or cita and all(t.strip(' .…') in pagina(x['url']) for t in re.split(r'\(\.\.\.\)|\[\.\.\.\]|…', cita) if t.strip(' .…')):
                    ok.append(x)
                else:
                    malos.append((slug, x.get('fuente') or x.get('aseguradora'), x['url'], x['cita'][:80]))
            out[k] = ok
        out['no_verificado'] = d.get('no_verificado', [])
        datos[slug] = out

# Frases ciertas en su fuente pero engañosas para el lector: se excluyen a mano.
EXCLUIR = [
    ('arrendamiento', 'Bolívar: protege el inmueble'),  # la misma página lista "pérdida de arrendamiento" como no cubierta
    ('vida-individual', 'Bolívar: el seguro Viva la Vida'),  # producto que ya no se vende
    ('soat', 'MAPFRE no vende SOAT'),  # dato negativo: no aporta en "qué ofrece cada aseguradora"
    ('soat', 'La multa de la categoría D'),  # repite la frase anterior
]
for slug, pref in EXCLUIR:
    for k, arr in datos.get(slug, {}).items():
        if k != 'no_verificado':
            datos[slug][k] = [x for x in arr if not x['texto'].startswith(pref)]
json.dump(datos, open('tools/blog-fuentes.json', 'w'), ensure_ascii=False, indent=1)
total = sum(len(v) for d in datos.values() for k, v in d.items() if k != 'no_verificado')
print(f'{total} frases verificadas; {len(malos)} descartadas')
for m in malos: print('  X', *m, sep=' | ')
