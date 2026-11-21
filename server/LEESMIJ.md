# Back-upserver voor de receptenapp

Deze map gaat op je eigen website (bijv. `https://coenlips.nl/recepten-api/`).

1. Maak in het beheerpaneel van je hoster een MySQL-database met een gebruiker.
2. Kopieer `config.example.php` naar `config.php` en vul de databasegegevens en een
   app-wachtwoord in. Zet `config.php` nooit op GitHub.
3. Upload `api.php`, `config.php` en `.htaccess` naar de map op je website.
4. Test: open `https://coenlips.nl/recepten-api/api.php?action=ping` → je moet `{"ok":true}` zien.
5. Zet het adres van `api.php` in `config.js` van de app.

De tabellen `recepten` en `recepten_tokens` worden bij de eerste aanroep vanzelf aangemaakt.
