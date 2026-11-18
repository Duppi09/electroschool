#!/bin/bash
# Sestaví webovou verzi do složky docs/ (GitHub Pages: větev main, složka /docs).
# Použití: ./build_web.sh
set -euo pipefail
cd "$(dirname "$0")"
python3 tools/gen_examples.py
rm -rf docs && mkdir -p docs
cp app/index.html app/style.css app/core.js app/symbols.js app/elec.js app/real.js app/calc.js app/ui.js app/examples.js docs/
# ikony (vykreslí mac/icon.swift; bez Swiftu se použijí uložené)
if command -v swift >/dev/null 2>&1; then
  swift mac/icon.swift web/icon-1024.png >/dev/null 2>&1 || true
  [ -f web/icon-1024.png ] && sips -z 512 512 web/icon-1024.png --out web/icon-512.png >/dev/null && sips -z 192 192 web/icon-1024.png --out web/icon-192.png >/dev/null && rm web/icon-1024.png
fi
cp web/icon-192.png web/icon-512.png web/manifest.webmanifest docs/
VER=$(date +%Y%m%d%H%M%S)
sed "s/__VERSION__/$VER/" web/sw.js > docs/sw.js
touch docs/.nojekyll
echo "Hotovo: docs/ (verze $VER)"
