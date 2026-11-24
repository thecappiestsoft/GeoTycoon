@echo off
rem GeoTycoon - buduje wersje jednoplikowa dist\GeoTycoon.html (dwuklik).
rem Uzywa Pythona, a gdy go brak - PowerShella (wbudowanego w Windows).
chcp 65001 >nul
cd /d "%~dp0"
rem 'python --version' zamiast 'where', bo atrapa Pythona z Microsoft Store nie dziala
python --version >nul 2>nul
if %errorlevel%==0 (
  python tools\build-single-html.py
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "tools\build-single-html.ps1"
)
if %errorlevel% neq 0 (
  echo.
  echo Blad budowania. Sprawdz komunikat powyzej.
) else (
  echo.
  echo Gotowe: dist\GeoTycoon.html
)
pause
