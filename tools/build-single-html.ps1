<#
  GeoTycoon — składa cały projekt w jeden plik dist/GeoTycoon.html (wersja PowerShell, bez instalowania czegokolwiek).
  Wstawia inline wszystkie arkusze CSS, skrypty JS (w kolejności z index.html) i favicon.
  Uruchomienie: dwuklik na build-html.bat w katalogu projektu
           lub: powershell -ExecutionPolicy Bypass -File tools\build-single-html.ps1
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-ProjectFile([string]$rel) {
  $path = Join-Path $Root ($rel -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path $path)) { throw "Brak pliku: $rel" }
  return [IO.File]::ReadAllText($path, $Utf8)
}

$html = Read-ProjectFile "index.html"

# CSS
$html = [regex]::Replace($html, '<link rel="stylesheet" href="([^"]+)">', {
  param($m)
  $href = $m.Groups[1].Value
  "<style>/* ==== $href ==== */`n" + (Read-ProjectFile $href) + "`n</style>"
})

# JS
$html = [regex]::Replace($html, '<script src="([^"]+)"></script>', {
  param($m)
  $src = $m.Groups[1].Value
  $js = (Read-ProjectFile $src).Replace("</script", "<\/script")
  "<script>/* ==== $src ==== */`n" + $js + "`n</script>"
})

# Favicon jako data URI
$html = [regex]::Replace($html, '<link rel="icon" href="([^"]+)" type="image/svg\+xml">', {
  param($m)
  $b64 = [Convert]::ToBase64String($Utf8.GetBytes((Read-ProjectFile $m.Groups[1].Value)))
  "<link rel=`"icon`" href=`"data:image/svg+xml;base64,$b64`" type=`"image/svg+xml`">"
})

$left = [regex]::Matches($html, '(?:src|href)="(?!data:|#)[^"]+"')
if ($left.Count -gt 0) { throw ("Nie wstawiono: " + (($left | ForEach-Object { $_.Value }) -join ", ")) }

$banner = "<!-- GeoTycoon — wersja jednoplikowa (wygenerowana z projektu przez tools/build-single-html). © 2026 CappySoft.pl -->`n"
$idx = $html.IndexOf("<!DOCTYPE html>")
if ($idx -ge 0) { $html = $html.Insert($idx + "<!DOCTYPE html>".Length, "`n" + $banner.TrimEnd("`n")) }

$OutDir = Join-Path $Root "dist"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Out = Join-Path $OutDir "GeoTycoon.html"
[IO.File]::WriteAllText($Out, $html, $Utf8)
$kb = [math]::Floor((Get-Item $Out).Length / 1024)
Write-Host "Zapisano dist\GeoTycoon.html ($kb KB)"
