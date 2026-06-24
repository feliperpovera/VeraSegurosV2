#!/bin/bash
# Vera Seguros — servidor local
# Doble clic en este archivo (o ejecútalo en Terminal) para abrir el sitio en http://localhost:4173/
cd "$(dirname "$0")" || exit 1
PORT=4173
echo "──────────────────────────────────────────────"
echo "  Vera Seguros — servidor local"
echo "  Abre:  http://localhost:${PORT}/"
echo "  Deja esta ventana abierta mientras trabajas."
echo "  Para detenerlo: Ctrl + C"
echo "──────────────────────────────────────────────"
# Intenta abrir el navegador automáticamente (macOS)
( sleep 1; open "http://localhost:${PORT}/" >/dev/null 2>&1 ) &
python3 -m http.server "${PORT}"
