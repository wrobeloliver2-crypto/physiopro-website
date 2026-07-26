const { google } = require('googleapis');

// SHEET_ID kommt jetzt aus der Umgebung (Netlify-Kontext), statt hartkodiert
// zu sein. production zeigt auf das echte Einwilligungs-Sheet, alle anderen
// Kontexte (dev, branch-deploy, deploy-preview) auf ein separates TEST-Sheet
// ("PhysioPro Kruse-Consent – TEST") – Testläufe können so nie echte
// Patienten-/Einwilligungsdaten berühren.
const SHEET_ID = process.env.KRUSE_SHEET_ID;
const SHEET_NAME = 'Tabellenblatt1';

// Spalten A–K. A–E bestehen seit Einführung des Consent-Logs unverändert
// (Zeitstempel, Name, Geburtsdatum, Telefon, Hinweis). F–K sind neu und
// bilden den Kruse-Datenanforderungsprozess im Dashboard ab: von der
// Einwilligung bis die angeforderten Unterlagen von der Kanzlei da sind
// bzw. der Fall manuell auf "Erledigt" gesetzt wird.
const HEADER = [
  'Zeitstempel', 'Name', 'Geburtsdatum', 'Telefon', 'Hinweis',
  'id', 'status', 'bearbeiter', 'angefordertAm', 'notizen', 'history',
];

async function getSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await auth.authorize();
  return google.sheets({ version: 'v4', auth });
}

// Schreibt die Kopfzeile nur, wenn A1 noch leer ist (frisches Sheet).
// Bestehende Daten/Header werden dadurch nie überschrieben.
async function ensureHeader(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1`,
  });
  const hatHeader = res.data.values && res.data.values.length > 0 && res.data.values[0][0];
  if (!hatHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:K1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER] },
    });
  }
}

const neueId = () => 'kruse-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!SHEET_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server nicht konfiguriert (KRUSE_SHEET_ID fehlt)' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, geburtsdatum, telefon, hinweis } = body;

    if (!name || !geburtsdatum) {
      return { statusCode: 400, body: JSON.stringify({ error: 'name und geburtsdatum erforderlich' }) };
    }

    const sheets = await getSheetsClient();
    await ensureHeader(sheets);

    const timestamp = new Date().toISOString();
    const id = neueId();
    // Neuer Fall startet immer "Offen" – die Anforderung bei der Kanzlei ist
    // noch nicht rausgegangen. bearbeiter/angefordertAm/notizen bleiben leer,
    // bis jemand den Fall im neuen Kruse-Tracker im Dashboard bearbeitet.
    const history = JSON.stringify([{
      zeitstempel: timestamp, aktion: 'Erstellt', von: 'System', details: 'Einwilligung online erteilt',
    }]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[timestamp, name, geburtsdatum, telefon || '', hinweis || '', id, 'Offen', '', '', '', history]]
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, id })
    };
  } catch (e) {
    console.error('kruse-consent-log error:', e);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Konnte Einwilligung nicht speichern.' })
    };
  }
};
