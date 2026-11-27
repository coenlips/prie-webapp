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
const ALLOWED_ORIGINS = ['https://ricetta-app.nl', 'https://www.ricetta-app.nl', 'https://ricetta.coenlips.nl', 'https://coenlips.github.io'];

// Mail versturen via SMTP (nodig bij Webreus: de gewone mailfunctie van PHP werkt daar niet).
// Gebruik de gegevens van een bestaande mailbox, bijvoorbeeld ricetta@jouwdomein.nl.
// const SMTP_HOST = 'mailserver-van-je-hoster';   // zie de helppagina van je hoster
// const SMTP_PORT = 465;                          // 465 bij 'ssl', 587 bij 'tls'
// const SMTP_SECURE = 'ssl';                      // 'ssl' (poort 465) of 'tls' (STARTTLS, poort 587)
// const SMTP_USER = 'ricetta@jouwdomein.nl';
// const SMTP_PASS = 'wachtwoord-van-die-mailbox';

// Optioneel: mail bij account aanvragen.
// Afzender van de mail met inloggegevens (standaard noreply@ je eigen domein):
// const MAIL_FROM = 'beheer@ricetta-app.nl';
// Jouw e-mailadres: je krijgt dan ook een mail bij een nieuwe aanvraag, en antwoorden op de mail komen bij jou:
// const ADMIN_EMAIL = 'jij@voorbeeld.nl';
