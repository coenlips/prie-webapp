# Recepten

Een eenvoudige receptenapp voor op je iPhone. Het is een web-app (PWA): je opent hem in Safari, zet hem op je beginscherm en daarna werkt hij als een gewone app, ook zonder internet.

## Functies

- Recepten toevoegen met foto, categorie, tags, porties, bereidings- en kooktijd
- Zoeken op naam, ingrediënt, categorie of tag, en filteren op categorie of favorieten
- **Porties omrekenen**: hoeveelheden schalen automatisch mee (ook `1/2`, `½`, `1,5`, `2-3`)
- Ingrediënten en stappen afvinken tijdens het koken
- **Kookmodus**: grotere tekst, en het scherm blijft aan
- Recept delen via berichten of mail
- Back-up exporteren en importeren (JSON), bijvoorbeeld naar iCloud Drive

Recepten worden alleen op je eigen toestel opgeslagen (IndexedDB). Er is geen server of account nodig.

### Tips voor het invoeren

- Zet bij ingrediënten één ingrediënt per regel, met de hoeveelheid vooraan: `250 g bloem`.
- Begin een regel met `#` voor een tussenkopje, bijvoorbeeld `# Voor de saus`.
- Zet bij de bereiding één stap per regel.

## Online zetten (GitHub Pages)

1. Ga op GitHub naar **Settings → Pages** en kies bij *Source*: **GitHub Actions**.
2. Push naar `main`. De workflow in `.github/workflows/pages.yml` publiceert de app op
   `https://<gebruikersnaam>.github.io/prie-webapp/`.

## Op je iPhone installeren

1. Open die link in **Safari**.
2. Tik op de deelknop en kies **Zet op beginscherm**.

## Lokaal draaien

```sh
python3 -m http.server 8000
```

Open daarna http://localhost:8000.

## Bestanden

| Bestand | Inhoud |
| --- | --- |
| `index.html` | Basispagina |
| `app.js` | Schermen, omrekenen van porties, back-up |
| `db.js` | Opslag in IndexedDB |
| `styles.css` | Opmaak (licht en donker) |
| `sw.js` | Service worker voor offline gebruik |
| `manifest.webmanifest`, `icons/` | App-naam en iconen |
