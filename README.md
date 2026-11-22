# Ricetta

Een eenvoudige receptenapp voor op je iPhone. Het is een web-app (PWA): je opent hem in Safari, zet hem op je beginscherm en daarna werkt hij als een gewone app, ook zonder internet.

## Functies

- Recepten toevoegen met foto, categorie, tags, porties, bereidings- en kooktijd
- Zoeken op naam, ingrediënt, categorie of tag, en filteren op categorie of favorieten
- **Porties omrekenen**: hoeveelheden schalen automatisch mee (ook `1/2`, `½`, `1,5`, `2-3`)
- Ingrediënten en stappen afvinken tijdens het koken
- **Boodschappenlijst**: ingrediënten (alle of de afgevinkte, omgerekend naar het aantal porties) met één tik op de lijst; gelijke ingrediënten worden opgeteld. Zelf boodschappen toevoegen, afvinken, delen. Gaat mee met de online back-up.
- **Kookmodus**: grotere tekst, en het scherm blijft aan
- **Kookwekker**: tik op een tijd in de bereiding (bijv. "10 minuten") of zet zelf een wekker; meerdere tegelijk, met pauze en +1 minuut. Geluid klinkt alleen als de app open is; het scherm blijft aan zolang er een wekker loopt. In de instellingen kun je kiezen om de wekker in de Klok-app te zetten, via een opdracht `Receptenwekker` in de app Opdrachten (uitleg staat in de app).
- Recept delen via berichten of mail
- Back-up exporteren en importeren (JSON), bijvoorbeeld naar iCloud Drive
- Recepten importeren uit PDF's van de app Receptenmaker (meerdere tegelijk, inclusief foto)
- **Recepten van websites importeren** via de plusknop (bijv. Jumbo, Foodies en andere sites met schema.org-receptgegevens). De eigen server haalt de pagina op. Sites die automatisch ophalen blokkeren (zoals AH en delicious.) kunnen via *recepttekst plakken*.

Recepten worden op je toestel opgeslagen (IndexedDB), zodat de app ook offline werkt. Met de **online back-up** worden ze daarnaast automatisch bewaard in een MySQL-database op je eigen website, en komen ze terug op een nieuwe iPhone.

## Online back-up instellen (eigen MySQL-database)

Zie [`server/LEESMIJ.md`](server/LEESMIJ.md). Kort: upload `server/api.php` met een ingevulde `config.php` naar je website, zet het adres in `config.js` en log in de app in met het wachtwoord uit `config.php`.

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
| `timer.js` | Kookwekker |
| `sync.js`, `config.js` | Online back-up (app-kant) |
| `server/` | Back-upserver in PHP voor je eigen website (MySQL) |
| `receptenmaker.js` | Inlezen van Receptenmaker-PDF's |
| `shopping.js` | Boodschappenlijst |
| `importer.js` | Recepten toevoegen via de plusknop: van een website, door tekst te plakken of handmatig |
| `vendor/pdfjs/` | PDF-lezer [pdf.js](https://mozilla.github.io/pdf.js/) 4.10.38 (Apache-2.0) |
| `styles.css` | Opmaak (licht en donker) |
| `sw.js` | Service worker voor offline gebruik |
| `manifest.webmanifest`, `icons/` | App-naam en iconen |
| `fonts/` | Lettertypes Bebas Neue en Oswald (SIL Open Font License, zie de licentiebestanden) |
