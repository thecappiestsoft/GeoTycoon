#!/usr/bin/env python3
"""
Składa cały projekt GeoTycoon w jeden samodzielny plik HTML (dist/GeoTycoon.html).
Wstawia inline wszystkie arkusze CSS, skrypty JS (w kolejności z index.html) i favicon.
Uruchomienie (z katalogu projektu):  python3 tools/build-single-html.py
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "index.html")
OUT_DIR = os.path.join(ROOT, "dist")
OUT = os.path.join(OUT_DIR, "GeoTycoon.html")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def main():
    html = read("index.html")

    def css_repl(m):
        href = m.group(1)
        css = read(href)
        return "<style>/* ==== %s ==== */\n%s\n</style>" % (href, css)

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_repl, html)

    def js_repl(m):
        src = m.group(1)
        js = read(src).replace("</script", "<\\/script")
        return "<script>/* ==== %s ==== */\n%s\n</script>" % (src, js)

    html = re.sub(r'<script src="([^"]+)"></script>', js_repl, html)

    def icon_repl(m):
        data = base64.b64encode(read(m.group(1)).encode("utf-8")).decode("ascii")
        return '<link rel="icon" href="data:image/svg+xml;base64,%s" type="image/svg+xml">' % data

    html = re.sub(r'<link rel="icon" href="([^"]+)" type="image/svg\+xml">', icon_repl, html)

    leftovers = re.findall(r'(?:src|href)="(?!data:|#)[^"]+"', html)
    if leftovers:
        sys.exit("Nie wstawiono: %s" % leftovers)

    banner = "<!-- GeoTycoon — wersja jednoplikowa (wygenerowana z projektu przez tools/build-single-html.py). © 2026 CappySoft.pl -->\n"
    html = html.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n" + banner, 1)
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("Zapisano %s (%d KB)" % (os.path.relpath(OUT, ROOT), os.path.getsize(OUT) // 1024))


if __name__ == "__main__":
    main()
