# Back-upserver voor de receptenapp

Deze map gaat op je eigen website (bijv. `https://coenlips.nl/recepten-api/`).

1. Maak in het beheerpaneel van je hoster een MySQL-database met een gebruiker.
2. Kopieer `config.example.php` naar `config.php` en vul de databasegegevens en een
   app-wachtwoord in (daarmee log je de eerste keer in als beheerder). Zet `config.php` nooit op GitHub.
3. Upload `api.php`, `config.php` en `index.html` naar de map op je website.
   (`index.html` is leeg en voorkomt dat iemand de inhoud van de map kan bekijken.)
4. Test: open `https://coenlips.nl/recepten-api/api.php?action=ping` → je moet `{"ok":true,"accounts":true}` zien.
5. Zet het adres van `api.php` in `config.js` van de app.

De tabellen worden bij de eerste aanroep vanzelf aangemaakt (of bijgewerkt vanaf een oudere versie).

## Accounts

Iedereen logt in met een **naam en wachtwoord** en heeft een eigen receptenverzameling, boodschappenlijst en postvak.
Wachtwoorden worden alleen als onomkeerbare hash bewaard (`password_hash`). Na 5 foute pogingen voor een naam
(of 20 vanaf hetzelfde internetadres) wordt inloggen een kwartier geblokkeerd.

- **Eerste keer / overstappen vanaf de versie zonder accounts:** log in de app in met je naam en het `APP_PASSWORD`
  uit `config.php`. Dat account wordt de **beheerder** en krijgt alle bestaande recepten en het postvak.
  Daarna kan niemand anders op die manier beheerder worden. Wijzig daarna gerust je wachtwoord in de app.
- **Nieuwe gebruikers** maakt de beheerder aan in de app (Instellingen → Account → Gebruikers beheren). De app maakt
  een tijdelijk wachtwoord; bij de eerste keer inloggen kiest de gebruiker zelf een wachtwoord.
- **Wachtwoord vergeten:** de beheerder geeft in hetzelfde scherm een nieuw tijdelijk wachtwoord.
- Een gebruiker verwijderen verwijdert ook al diens recepten en postvak.

Tabellen: `recepten` (per gebruiker), `recepten_users`, `recepten_tokens`, `recepten_inbox`, `recepten_fails`.

Geen `.htaccess` gebruiken: veel hostingpakketten staan de instelling `Options` daarin niet toe en geven dan een *Internal Server Error*.

## Recepten van websites

`api.php` kan ook receptpagina's en foto's ophalen voor de app (acties `fetch` en `image`, alleen na inloggen).
Daarvoor moet PHP de extensie **curl** hebben (standaard bij de meeste hosters). De server haalt alleen openbare
webadressen op (http/https), nooit adressen binnen het eigen netwerk, en maximaal 4 MB per pagina en 8 MB per foto.

## Postvak (delen vanuit Safari)

Iedere gebruiker heeft een eigen **deelsleutel** (in de app bij Instellingen → Delen); die gaat als `key` mee, zodat
het recept in de juiste verzameling komt. Het `APP_PASSWORD` werkt ook als sleutel en hoort bij de beheerder, zodat een
bestaande opdracht blijft werken.

De opdracht *Ricetta importeren* op de iPhone haalt de receptpagina op en stuurt die als formulier (`key`, `url`, en het
bestand `html`) naar `api.php?action=inbox_add`; de server haalt er het recept en de tekst uit. Een Safari-variant stuurt
de al uitgelezen gegevens als JSON (`key`, `data`). De app haalt ze op met `inbox_list` en verwijdert ze na bewaren met `inbox_delete`.
De tabel `recepten_inbox` wordt vanzelf aangemaakt. Het postvak houdt maximaal 50 recepten per gebruiker vast.
