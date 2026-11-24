#!/usr/bin/env sh
# GeoTycoon — buduje wersję jednoplikową dist/GeoTycoon.html (macOS / Linux).
# Używa python3, a gdy go brak — PowerShella (pwsh), jeśli jest zainstalowany.
set -e
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 tools/build-single-html.py
elif command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -File tools/build-single-html.ps1
else
  echo "Potrzebny jest python3 (macOS/Linux zwykle go mają) albo PowerShell (pwsh)." >&2
  exit 1
fi
echo "Gotowe: dist/GeoTycoon.html"
