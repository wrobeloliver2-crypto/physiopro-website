const { google } = require('googleapis');

const SHEET_ID = '1W5YqJd-LN-2RuAQgJBv69TuWX3GhvdHBdUmIW7cTcBc';
const SHEET_NAME = 'Tabellenblatt1';
const KRUSE_EMAIL = 'kruse@mtk-kanzlei.de';
const CC_EMAILS = ['hanna.wrobel@pilatescompany.de', 'info@physioproluebeck.de'];

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

async function getGraphToken() {
  const tenant = process.env.AZURE_TENANT_ID;
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Graph token error: ' + JSON.stringify(data));
  return data.access_token;
}

function todayBerlinDateString() {
  // Datum in Europe/Berlin, damit Tagesgrenze zur Ortszeit passt
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(new Date()); // YYYY-MM-DD
}

exports.handler = async () => {
  try {
    const sheets = await getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:D`
    });
    const rows = result.data.values || [];
    const today = todayBerlinDateString();

    // Spalte A = ISO-Timestamp. Nur Zeilen von heute (Europe/Berlin) filtern.
    const todaysRows = rows.filter((row) => {
      if (!row[0]) return false;
      const rowDateBerlin = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(row[0]));
      return rowDateBerlin === today;
    });

    if (todaysRows.length === 0) {
      console.log('Keine neuen Einwilligungen heute, keine Mail gesendet.');
      return { statusCode: 200, body: 'no entries today' };
    }

    const listHtml = todaysRows.map((row) => {
      const [timestamp, name, geburtsdatum, telefon] = row;
      const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
      return `<li><strong>${name}</strong>, geb. ${geburtsdatum}${telefon ? ' — Tel. ' + telefon : ''} (angefragt ${time} Uhr)</li>`;
    }).join('');

    const html = `
      <p>Guten Tag Herr Kruse,</p>
      <p>heute (${today}) haben folgende Patient:innen ihre Einwilligung gegeben, dass PhysioPro Bad Schwartau ihre Behandlungsunterlagen zum laufenden Rezept bei Ihnen anfordert:</p>
      <ul>${listHtml}</ul>
      <p>Vielen Dank und beste Grüße<br>PhysioPro Bad Schwartau</p>
    `;

    const token = await getGraphToken();
    const sender = process.env.MAIL_SENDER;

    const res = await fetch(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: `Rezept-Einwilligungen Bad Schwartau – ${today}`,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: KRUSE_EMAIL } }],
          ccRecipients: CC_EMAILS.map((e) => ({ emailAddress: { address: e } }))
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error('Graph sendMail error: ' + errText);
    }

    return { statusCode: 200, body: `sent, ${todaysRows.length} entries` };
  } catch (e) {
    console.error('kruse-daily-summary error:', e);
    return { statusCode: 500, body: String(e) };
  }
};

// Taeglich 17:00 Uhr deutsche Sommerzeit = 15:00 UTC.
// ACHTUNG: bei Umstellung auf Winterzeit (MEZ) muss dies auf 16:00 UTC angepasst werden!
exports.config = {
  schedule: '0 15 * * *'
};
