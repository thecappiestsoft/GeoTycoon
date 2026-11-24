# GeoTycoon

Geograficzna gra strategiczna offline dla uczniów i nauczycieli geografii (klasy 6–8 i szkoła ponadpodstawowa).
Gracz rozwija fikcyjne państwo przez 15 (lub 10) lat. Decyzje zależą od warunków geograficznych 12 regionów.

© 2026 CappySoft.pl

---

## Uruchomienie (offline)

1. Rozpakuj ZIP do dowolnego folderu.
2. Otwórz **`index.html`** w przeglądarce (Chrome, Edge, Firefox) — dwuklikiem.

Nie trzeba serwera, instalacji ani internetu. Gra nie wysyła żadnych żądań sieciowych,
nie używa CDN, zewnętrznych fontów ani telemetrii. Postęp zapisuje się w `localStorage` przeglądarki.

**Wersja jednoplikowa:** `dist/GeoTycoon.html` zawiera całą grę (CSS, JS, dane, tłumaczenia, ikonę) w jednym pliku —
wystarczy go skopiować (np. na pendrive lub do e-dziennika) i otworzyć.

### Budowanie wersji jednoplikowej

Po zmianach w projekcie wygeneruj `dist/GeoTycoon.html` ponownie:

| System | Jak uruchomić | Co jest potrzebne |
|---|---|---|
| Windows | dwuklik **`build-html.bat`** | nic — użyje Pythona, a gdy go brak, wbudowanego PowerShella |
| macOS / Linux | `./build-html.sh` | `python3` (zwykle jest w systemie) |
| dowolny | `python3 tools/build-single-html.py` | Python 3 |
| Windows (ręcznie) | `powershell -ExecutionPolicy Bypass -File tools\build-single-html.ps1` | nic |

Skrypt wstawia do jednego pliku wszystkie arkusze CSS, skrypty JS (w kolejności z `index.html`) i ikonę,
a na końcu sprawdza, czy nie została żadna odwołująca się na zewnątrz ścieżka. Nowy plik `.css` lub `.js` wystarczy
dodać do `index.html` — skrypty budujące wykryją go automatycznie.

> Opcjonalnie możesz uruchomić lokalny serwer (np. `python -m http.server`) — gra działa tak samo.

## Publikacja na GitHub Pages

Projekt jest gotowy do GitHub Pages bez żadnego budowania — `index.html` leży w katalogu głównym,
a wszystkie ścieżki są względne (działa też pod adresem `https://<użytkownik>.github.io/<repozytorium>/`).

1. Utwórz repozytorium na GitHubie i wgraj **zawartość** folderu `GeoTycoon/` (tak, żeby `index.html` był w katalogu głównym repozytorium):
   ```bash
   cd GeoTycoon
   git init
   git add .
   git commit -m "GeoTycoon 1.0"
   git branch -M main
   git remote add origin https://github.com/<użytkownik>/<repozytorium>.git
   git push -u origin main
   ```
   Można też przeciągnąć pliki w przeglądarce: *Add file → Upload files* (ukryte pliki `.nojekyll`, `.github/` warto dodać przez git).
2. W repozytorium: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch **`main`**, folder **`/ (root)`** → *Save*.
3. Po 1–2 minutach gra będzie dostępna pod adresem `https://<użytkownik>.github.io/<repozytorium>/`.

Plik `.nojekyll` wyłącza przetwarzanie Jekyll (pliki trafiają na stronę bez zmian).
Każdy push do `main` automatycznie aktualizuje stronę, a GitHub Actions (`.github/workflows/tests.yml`)
uruchamia testy logiki gry. Zapis gry na GitHub Pages jest przechowywany w przeglądarce ucznia (`localStorage`) —
niczego nie wysyłamy na serwer.

## Funkcje

- 3 scenariusze (Zielona Dolina, Pustynna Republika, Nadmorskie Państwo), długość 15 lub 10 tur,
  dodatkowe cele lekcji wybierane przez nauczyciela.
- Mapa SVG z 12 regionami (klik lub klawiatura: Tab + Enter), podpowiedź po najechaniu/fokusie.
- 10 budynków z wymaganiami geograficznymi, kosztem, utrzymaniem i efektami; limit 3 budynków na region
  i 3 inwestycji na turę; budynek działa od następnej tury.
- 7 zasobów (budżet, żywność, energia, ludność, zadowolenie, środowisko, technologia) z prognozą na koniec tury.
- 13 wydarzeń z warunkami geograficznymi, cooldownem, 2–3 decyzjami i notką „Dlaczego tak się dzieje?”.
- Podsumowanie każdej tury, statystyki z wykresami, ekran końcowy z oceną 0–100 w 5 wymiarach.
- Autosave + kopia zapasowa, walidacja zapisu, eksport/import JSON, reset gry.
- Samouczek „Pierwsze kroki”, instrukcja, tryb debugowania (dla nauczyciela/developera).
- **Język PL | EN** (przełącznik w nagłówku), **motyw jasny / ciemny** (przełącznik z ikoną słońca/księżyca).
- Wyciszanie dźwięków i animacji, pełna obsługa klawiaturą, ikony + etykiety (kolor nie jest jedynym nośnikiem informacji).
- Styl graficzny „Makieta 3D”: przechylona, wypukła mapa i miękkie „gliniane” elementy interfejsu.

## Struktura projektu

```
GeoTycoon/
├── index.html                 # punkt wejścia (ładuje wszystkie pliki w odpowiedniej kolejności)
├── README.md
├── CONTRIBUTING.md            # przewodnik dla developerów: gdzie co zmieniać, zasady, testy
├── package.json               # skróty: npm test, npm start (lokalny serwer), npm run build:single
├── .nojekyll                  # GitHub Pages: publikuj pliki bez przetwarzania Jekyll
├── .github/workflows/tests.yml  # GitHub Actions: testy przy każdym pushu
├── .gitignore / .gitattributes / .editorconfig
├── assets/icons/favicon.svg
├── css/
│   ├── base.css               # zmienne motywu jasny/ciemny, reset, typografia
│   ├── layout.css             # nagłówek, stopka, ekrany, menu, ekran końcowy
│   ├── components.css         # przyciski, karty, okna modalne, toasty, paski, przełączniki, tabele
│   ├── game.css               # ekran gry: pasek zasobów, mapa, panele, wydarzenia, wykresy
│   └── skins/diorama.css      # styl graficzny „Makieta 3D” (nadpisuje zmienne i wygląd)
├── data/                      # KONFIGURACJA GRY (czysty JSON w plikach .js)
│   ├── balance.js             # liczby balansu: podatki, konsumpcja, limity, punktacja, progi ocen
│   ├── regions.js             # 12 regionów: parametry geograficzne + teksty PL/EN
│   ├── buildings.js           # budynki: koszt, utrzymanie, wymagania, produkcja, efekty
│   ├── events.js              # wydarzenia: warunki, efekty, decyzje, notki edukacyjne
│   └── scenarios.js           # scenariusze, cele lekcji, długości gry
├── js/
│   ├── state.js               # tworzenie GameState ze scenariusza, odczyt regionów/budynków
│   ├── economy.js             # produkcja, konsumpcja, dochody, niedobory, ludność, zadowolenie, środowisko
│   ├── buildings.js           # walidacja wymagań, budowa, rozbiórka, podgląd efektu
│   ├── events.js              # warunki i losowanie wydarzeń, decyzje, modyfikatory
│   ├── scoring.js             # ocena końcowa w 5 wymiarach, cele scenariusza
│   ├── gameLoop.js            # zakończenie tury w ustalonej kolejności + prognoza
│   ├── saveManager.js         # localStorage, kopia zapasowa, walidacja, eksport/import, ustawienia
│   ├── main.js                # kontroler aplikacji: ekrany, akcje, autosave, motyw, język
│   ├── i18n/
│   │   ├── i18n.js            # silnik tłumaczeń (t(), tx(), data-i18n w HTML)
│   │   ├── pl.js              # słownik polski
│   │   └── en.js              # słownik angielski
│   ├── ui/
│   │   ├── dom.js             # helpery DOM, okna modalne (focus trap, Escape), toasty, dźwięki WebAudio
│   │   ├── mapGeometry.js     # deterministyczne kształty 12 regionów, rzeka, kontur kraju
│   │   ├── mapView.js         # renderowanie mapy SVG i obsługa interakcji
│   │   ├── regionPanel.js     # panel regionu
│   │   ├── buildingPanel.js   # karty budynków + tłumaczenie błędów
│   │   ├── eventModal.js      # okno decyzji, panel i dziennik wydarzeń
│   │   ├── summaryPanel.js    # podsumowanie tury, statystyki (wykresy), ekran końcowy
│   │   └── screens.js         # menu, scenariusze, instrukcja, ustawienia, samouczek, debug
│   └── utils/
│       ├── random.js          # deterministyczny PRNG z ziarnem (mulberry32)
│       └── validation.js      # clamp, ok/fail, deepClone
├── tests/
│   └── logic.test.js          # testy logiki (Node.js, bez zależności)
├── build-html.bat             # Windows: dwuklik buduje dist/GeoTycoon.html
├── build-html.sh              # macOS/Linux: buduje dist/GeoTycoon.html
├── tools/
│   ├── build-single-html.py   # budowanie wersji jednoplikowej (Python 3)
│   └── build-single-html.ps1  # to samo w PowerShellu (Windows bez Pythona)
└── dist/
    └── GeoTycoon.html         # gotowa wersja jednoplikowa
```

### Zasady architektury

- **Logika gry nie zależy od DOM** (`state`, `economy`, `buildings`, `events`, `scoring`, `gameLoop`, `saveManager`).
  Można ją testować w Node.js. UI tylko wyświetla stan i wywołuje akcje.
- Każda akcja zwraca `{ ok: true, data }` lub `{ ok: false, code, params }`; UI tłumaczy kod błędu (`err.KOD`).
- Scenariusz to szablon — `GameState` zawiera głęboką kopię danych.
- Losowość używa ziarna zapisanego w stanie (`seed`, `rngState`) — wczytana gra losuje tak samo.
- Raport tury zawiera klucze komunikatów + parametry, dlatego po zmianie języka dziennik i podsumowania są tłumaczone.
- Moduły to zwykłe skrypty z przestrzenią nazw `window.GT` (bez bundlera i modułów ES), żeby gra działała z `file://`.

### Kolejność rozliczenia tury (`js/gameLoop.js`)

1. Produkcja budynków z modyfikatorami geograficznymi, technologią i skutkami wydarzeń.
2. Konsumpcja żywności (ludność) i energii (gospodarstwa + budynki).
3. Podatki, utrzymanie, administracja → budżet.
4. Niedobory (magazyn nie spada poniżej 0, brak zapisywany jako deficyt; przy braku energii przemysł działa proporcjonalnie).
5. Ludność, zadowolenie, środowisko i zanieczyszczenie regionów, technologia (wartości 0–100 są clampowane).
6. Zwiększenie numeru tury, odliczanie modyfikatorów, losowanie najwyżej jednego wydarzenia.
7. Historia, raport, autosave; po ostatniej turze — ocena końcowa.

## Jak edytować grę

- **Balans** — `data/balance.js` (np. `maxInvestmentsPerTurn`, `taxPerCitizen`, wagi i progi oceny).
- **Nowy budynek** — dodaj obiekt w `data/buildings.js` (typy wymagań opisane w nagłówku pliku).
- **Nowe wydarzenie** — dodaj obiekt w `data/events.js`; każde wydarzenie musi mieć co najmniej jedną darmową decyzję.
- **Nowy scenariusz** — `data/scenarios.js` (`start`, `regionModifiers`, `startBuildings`, `eventWeights`, `goals`).
- **Teksty interfejsu** — `js/i18n/pl.js` i `js/i18n/en.js` (te same klucze w obu plikach — sprawdza to test).
  Teksty danych (regiony, budynki, wydarzenia) są w obiektach `{ pl, en }` w plikach `data/`.
- **Wygląd** — kolory motywów jasny/ciemny: zmienne CSS w `css/base.css` i `css/skins/diorama.css`.

## Testy

```bash
npm test        # albo: node tests/logic.test.js
```

19 testów obejmuje m.in. scenariusze T-02–T-12 ze specyfikacji (start, budowa, brak budżetu, ograniczenia regionu,
tura, niedobór, wymuszony event, autosave, uszkodzony zapis, koniec gry), determinizm, pełne partie wszystkich
scenariuszy oraz kompletność tłumaczeń PL/EN.

Tryb debugowania (Ustawienia → Tryb debugowania) dodaje przycisk „Debug” w grze: podgląd stanu JSON,
wymuszanie wydarzeń (T-09), skok do ostatniej tury (T-12), celowe uszkodzenie zapisu (T-11).

## Odstępstwa od specyfikacji (decyzje developerskie)

- Dane są w plikach `data/*.js` zamiast `*.json` — przeglądarki blokują `fetch()` lokalnych plików JSON
  przy otwieraniu `index.html` z dysku (`file://`). Zawartość to czysta struktura JSON przypisana do `GT.DATA`.
- Dochody budynków są przeskalowane względem przykładowego balansu (np. fabryka +180 Geo$ zamiast +40),
  bo przy budżecie startowym 5000 i kosztach 500–1500 przykładowe wartości nie pozwalały na zwrot inwestycji.
  Wszystkie liczby są w `data/balance.js` i `data/buildings.js`.
- Dodatkowe budynki: farma wiatrowa (wykorzystuje `windPotential`) i kurort (reakcja na boom turystyczny).
- Dodatkowe wydarzenia: emigracja, osuwisko, rekordowe zbiory (razem 13).
- Tryb sandbox pominięty (opcjonalny w MVP).
