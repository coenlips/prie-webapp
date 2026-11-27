// Adres van de back-upserver (server/api.php op je eigen website).
// Laat leeg zolang die er nog niet staat; de app werkt dan gewoon zonder online back-up.
const SYNC_CONFIG = {
  api: 'https://coenlips.nl/recepten-api/api.php',
  // Openbaar adres van de app, voor deellinks en QR-codes. Laat dat adres (nog) geen Ricetta zien,
  // dan gebruikt de app vanzelf het adres waarop hij nu draait. Draait de app op een ander adres
  // en staat Ricetta hier wel, dan krijgt iedereen een verhuismelding (move.js).
  publicUrl: 'https://ricetta-app.nl/',
};
