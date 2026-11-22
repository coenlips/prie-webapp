# Back-upserver voor de receptenapp

Deze map gaat op je eigen website (bijv. `https://coenlips.nl/recepten-api/`).

1. Maak in het beheerpaneel van je hoster een MySQL-database met een gebruiker.
2. Kopieer `config.example.php` naar `config.php` en vul de databasegegevens en een
   app-wachtwoord in. Zet `config.php` nooit op GitHub.
3. Upload `api.php`, `config.php` en `index.html` naar de map op je website.
   (`index.html` is leeg en voorkomt dat iemand de inhoud van de map kan bekijken.)
4. Test: open `https://coenlips.nl/recepten-api/api.php?action=ping` → je moet `{"ok":true}` zien.
5. Zet het adres van `api.php` in `config.js` van de app.

De tabellen `recepten` en `recepten_tokens` worden bij de eerste aanroep vanzelf aangemaakt.

Geen `.htaccess` gebruiken: veel hostingpakketten staan de instelling `Options` daarin niet toe en geven dan een *Internal Server Error*.

## Recepten van websites

`api.php` kan ook receptpagina's en foto's ophalen voor de app (acties `fetch` en `image`, alleen na inloggen).
Daarvoor moet PHP de extensie **curl** hebben (standaard bij de meeste hosters). De server haalt alleen openbare
webadressen op (http/https), nooit adressen binnen het eigen netwerk, en maximaal 4 MB per pagina en 8 MB per foto.

## Postvak (delen vanuit Safari)

De opdracht *Ricetta importeren* op de iPhone stuurt de receptgegevens van de pagina in Safari naar `api.php?action=inbox_add`
(met het app-wachtwoord als `key`). De app haalt ze op met `inbox_list` en verwijdert ze na bewaren met `inbox_delete`.
De tabel `recepten_inbox` wordt vanzelf aangemaakt. Het postvak houdt maximaal 50 recepten vast.
