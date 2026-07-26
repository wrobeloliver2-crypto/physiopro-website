const { google } = require('googleapis');

const SHEET_ID = '1W5YqJd-LN-2RuAQgJBv69TuWX3GhvdHBdUmIW7cTcBc';
const SHEET_NAME = 'Tabellenblatt1';

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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, geburtsdatum, telefon, hinweis } = body;

    if (!name || !geburtsdatum) {
      return { statusCode: 400, body: JSON.stringify({ error: 'name und geburtsdatum erforderlich' }) };
    }

    const sheets = await getSheetsClient();
    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:E`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[timestamp, name, geburtsdatum, telefon || '', hinweis || '']]
      }
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true })
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
