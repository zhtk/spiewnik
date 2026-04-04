# Śpiewnik PWA

Harcerski i żeglarski śpiewnik z akordami. Działa offline na Android i iOS.

## Struktura projektu

```
songbook-pwa/
├── index.html          # App shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── css/
│   ├── app.css         # Główne style
│   └── modes.css       # Style widoków piosenek
├── js/
│   ├── app.js          # Główna logika, routing
│   ├── db.js           # IndexedDB (idb)
│   ├── sync.js         # Fetch + aktualizacja bazy
│   ├── search.js       # Wyszukiwanie fuzzy (Fuse.js)
│   ├── render.js       # Renderowanie piosenek (3 tryby)
│   └── install.js      # Instalacja PWA
├── data/
│   └── songs.json      # Baza piosenek (wersjonowana)
└── icons/
    ├── icon-192.png    # (musisz dodać!)
    └── icon-512.png    # (musisz dodać!)
```

## Uruchomienie lokalne

Aplikacja używa ES modules i Service Worker — wymaga serwera HTTP.

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code: Live Server extension
```

Otwórz: http://localhost:8080

## Wdrożenie

### GitHub Pages (darmowe)
1. Utwórz repozytorium na GitHub
2. Wgraj pliki
3. Settings → Pages → Deploy from branch `main`
4. Zaktualizuj URL w `sw.js` (SHELL_ASSETS) jeśli aplikacja jest w podkatalogu

### Netlify (darmowe)
1. Przeciągnij folder na netlify.com/drop
2. Gotowe!

## Ikony

Wygeneruj ikony (192×192 i 512×512) z dowolnego narzędzia:
- https://favicon.io
- https://realfavicongenerator.net
- Narysuj własne w Inkscape/Figma

Umieść jako `icons/icon-192.png` i `icons/icon-512.png`.

## Aktualizacja bazy piosenek

1. Edytuj `data/songs.json`
2. Zmień `"version"` na nową datę (np. `"2025-05-01"`)
3. Wdróż na serwer
4. Użytkownicy zobaczą toast "Zaktualizowano N piosenek" przy następnym uruchomieniu online

## Format piosenki

```json
{
  "id": "unikalne-id",
  "title": "Tytuł piosenki",
  "category": "sailors | scout | folk",
  "key": "Am",
  "tags": ["tag1", "tag2"],
  "verses": [
    {
      "type": "verse | chorus",
      "label": "Zwrotka 1",
      "lines": [
        {
          "text": "Słowa wiersza",
          "chords": "Am . . . E7 . . ."
        }
      ]
    }
  ]
}
```

### Zapis akordów
- Akordy oddzielone spacjami
- `.` = brak akordu (trwanie poprzedniego)
- Przykład: `"G . . D . Em . C ."` = G przez 3 uderzenia, D przez 2, Em przez 2, C przez 2

## Tryby wyświetlania

| Tryb | Dla kogo | Opis |
|------|----------|------|
| Tylko słowa | Śpiewający | Sam tekst, duża czcionka |
| Słowa + akordy (linia pod linią) | Gitarzysta z telefonem | Linia akordów → linia tekstu, naprzemiennie |
| Słowa \| Akordy obok siebie | Gitarzysta z tabletem | Dwa panele obok siebie |

Na ekranach < 768px tryb "tablet" automatycznie przełącza się na "linia pod linią".

## Dodanie nowej kategorii

1. Dodaj piosenki z nową wartością `"category"` w `songs.json`
2. Dodaj etykietę w `js/render.js` w obiekcie `CATEGORY_LABELS`
3. Dodaj styl badge'a w `css/app.css` (`.cat-badge.cat-NAZWA`)

## Zależności (CDN, bez build step)

- **idb** 8.x — wygodny wrapper IndexedDB
- **Fuse.js** 7.x — wyszukiwanie rozmyte (odporne na literówki)
- **Google Fonts** — Cinzel, Crimson Text, Space Mono

Brak bundlera, brak npm (poza opcjonalnym serwerem dev).
