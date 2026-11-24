# Jak rozwijać GeoTycoon

Projekt to czysty HTML + CSS + JavaScript (ES5/ES6) — **bez frameworków, bundlera i zależności**.
Wystarczy edytor i przeglądarka.

## Uruchomienie podczas pracy

- Najprościej: otwórz `index.html` w przeglądarce (działa z dysku, `file://`).
- Albo lokalny serwer (tak jak na GitHub Pages): `npm start` lub `python3 -m http.server 8000`
  i wejdź na http://localhost:8000

## Gdzie co zmieniać

| Chcę zmienić… | Plik |
|---|---|
| liczby balansu (podatki, limity, punktacja) | `data/balance.js` |
| regiony mapy | `data/regions.js` |
| budynki | `data/buildings.js` |
| wydarzenia i decyzje | `data/events.js` |
| scenariusze i cele lekcji | `data/scenarios.js` |
| teksty interfejsu | `js/i18n/pl.js` **i** `js/i18n/en.js` (te same klucze) |
| zasady ekonomii | `js/economy.js` |
| kolejność rozliczenia tury | `js/gameLoop.js` |
| wygląd (kolory, motywy) | `css/base.css`, `css/skins/diorama.css` |
| układ ekranu gry | `css/game.css`, `js/main.js` |

Teksty w danych (nazwy regionów, budynków, wydarzeń) mają postać `{ pl: "...", en: "..." }`.

## Dodanie nowego pliku JS/CSS

Dopisz `<script src="...">` lub `<link rel="stylesheet" href="...">` w `index.html`
(kolejność skryptów ma znaczenie: dane → i18n → logika → UI → `main.js`).
Skrypty budujące wersję jednoplikową wykryją nowy plik automatycznie.

## Zasady

- Logika gry (`js/*.js` poza `main.js` i `js/ui/`) **nie może używać DOM** — dzięki temu jest testowalna w Node.js.
- Akcje zwracają `{ ok: true, data }` albo `{ ok: false, code, params }`; komunikat błędu to klucz `err.KOD` w słownikach.
- Nie dodawaj zasobów z internetu (CDN, fonty, API) — gra musi działać offline.
- Wszystkie ścieżki w `index.html` muszą być względne (bez `/` na początku), żeby działały na GitHub Pages.

## Przed commitem

```bash
npm test                 # albo: node tests/logic.test.js
```

Test sprawdza też, czy każdy klucz tłumaczenia istnieje w PL i EN.
Te same testy uruchamia GitHub Actions (`.github/workflows/tests.yml`) przy każdym pushu.
