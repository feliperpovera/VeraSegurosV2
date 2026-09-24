# Uso: python3 tools/normalizar-logos.py <carpeta_origen> <carpeta_salida>
# (origen = logos originales; revisar la hoja de contacto antes de copiar a assets/lg)
# Quita el fondo blanco conectado al borde (no los blancos internos del logo),
# recorta el espacio sobrante y centra cada logo en un lienzo 3:1 con el mismo
# "peso visual" (misma área aparente), para que todos se vean del mismo tamaño.
import sys, os
from collections import deque
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
W, H = 600, 200                 # lienzo 3:1 a 2x
AREA = 360 * 118                # área objetivo del logo dentro del lienzo
MAX_W, MAX_H = 552, 186
AJUSTE = {'chubb.png': .78, 'hdi.png': .82, 'solidaria.png': 1.32, 'qualitas-v2.png': 1.3, 'qualitas.png': 1.3, 'zurich.png': 1.12, 'arl-sura.png': 1.06, 'coomeva.png': 1.12}

def blanco(p):
    r, g, b, a = p
    return a < 24 or min(r, g, b) >= 228

def procesar(ruta):
    im = Image.open(ruta).convert('RGBA')
    w, h = im.size
    px = im.load()
    fondo = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if blanco(px[x, y]) and not fondo[y * w + x]:
                fondo[y * w + x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if blanco(px[x, y]) and not fondo[y * w + x]:
                fondo[y * w + x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < w and 0 <= ny < h and not fondo[ny * w + nx] and blanco(px[nx, ny]):
                fondo[ny * w + nx] = 1; q.append((nx, ny))
    # borde suave: "color a alfa" contra blanco solo en los 2 px que tocan el fondo
    borde = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if fondo[y * w + x]: continue
            for dx in (-2, -1, 0, 1, 2):
                for dy in (-2, -1, 0, 1, 2):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and fondo[ny * w + nx]:
                        borde[y * w + x] = 1; break
                if borde[y * w + x]: break
    for y in range(h):
        for x in range(w):
            i = y * w + x
            r, g, b, a = px[x, y]
            if fondo[i]:
                px[x, y] = (255, 255, 255, 0)
            elif borde[i]:
                al = max(255 - r, 255 - g, 255 - b) / 255
                if al <= 0.004:
                    px[x, y] = (255, 255, 255, 0)
                else:
                    c = lambda v: max(0, min(255, round(255 - (255 - v) / al)))
                    px[x, y] = (c(r), c(g), c(b), round(a * al))
    caja = im.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    im = im.crop(caja)
    lw, lh = im.size
    r = lw / lh
    th = (AREA * AJUSTE.get(os.path.basename(ruta), 1) / r) ** 0.5
    tw = th * r
    k = min(1, MAX_W / tw, MAX_H / th)
    tw, th = round(tw * k), round(th * k)
    im = im.resize((tw, th), Image.LANCZOS)
    lienzo = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lienzo.alpha_composite(im, ((W - tw) // 2, (H - th) // 2))
    return lienzo, (lw, lh, tw, th)

os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.png'): continue
    lienzo, info = procesar(os.path.join(SRC, f))
    lienzo.save(os.path.join(OUT, f), optimize=True)
    print(f'{f:18} recorte {info[0]}x{info[1]} -> {info[2]}x{info[3]} en 600x200')
