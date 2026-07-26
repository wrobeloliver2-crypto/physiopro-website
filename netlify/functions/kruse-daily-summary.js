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

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

exports.handler = async () => {
  try {
    const sheets = await getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:E`
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
      const [timestamp, name, geburtsdatum, telefon, hinweis] = row;
      const time = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
      const hinweisLine = hinweis ? `<br><span style="color:#666;">Nachricht: ${escapeHtml(hinweis)}</span>` : '';
      return `<li><strong>${escapeHtml(name)}</strong>, geb. ${escapeHtml(geburtsdatum)}${telefon ? ' — Tel. ' + escapeHtml(telefon) : ''} (angefragt ${time} Uhr)${hinweisLine}</li>`;
    }).join('');

    const html = `
      <p>Guten Tag Herr Kruse,</p>
      <p>heute (${today}) haben folgende Patient:innen ihre Einwilligung gegeben, dass PhysioPro Bad Schwartau ihre Behandlungsunterlagen zum laufenden Rezept bei Ihnen anfordert:</p>
      <ul>${listHtml}</ul>
      <p>Vielen Dank und beste Grüße<br>PhysioPro Bad Schwartau</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:1.5rem 0;">
      <p style="font-size:12px;color:#888;">Wortlaut der von jeder Person oben per Checkbox erteilten Einwilligung:<br>
      „Ich bin damit einverstanden, dass PhysioPro Bad Schwartau meine bei der Physio Plus GmbH bzw. der zuständigen Insolvenzverwalterin Frau Beate Thompson (Kanzlei Dr. Möller – Thompson – Kruse, Neustadt in Holstein) vorliegenden Behandlungsunterlagen zu meinem Rezept anfordert, um meine Behandlung fortzusetzen. Diese Einwilligung kann ich jederzeit formlos widerrufen.“</p>
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

// Zeitplan (taeglich 17 Uhr deutsche Sommerzeit = 15 UTC) ist in netlify.toml
// unter [functions."kruse-daily-summary"] deklariert, nicht hier im Code.
