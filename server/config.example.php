<?php
// Kopieer dit bestand naar config.php (in dezelfde map als api.php) en vul het in.
// Zet config.php NOOIT op GitHub: er staan wachtwoorden in.

// Gegevens van je MySQL-database (te vinden in het beheerpaneel van Webreus)
const DB_HOST = 'localhost';
const DB_NAME = 'naam_van_je_database';
const DB_USER = 'gebruikersnaam';
const DB_PASS = 'database-wachtwoord';

// Hiermee log je de eerste keer in de app in (met je eigen naam); dat account wordt de beheerder.
// Daarna werkt het ook nog als deelsleutel van de beheerder voor de opdracht op de iPhone.
// Kies iets lang en uniek.
const APP_PASSWORD = 'kies-hier-een-wachtwoord';

// Vanaf welke websites de app de API mag gebruiken
const ALLOWED_ORIGINS = ['https://coenlips.github.io'];
