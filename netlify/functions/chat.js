exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const FALLBACK_SYSTEM = `Du bist der KI-Assistent von PhysioPro Lübeck. Beantworte Fragen zu Physiotherapie, Osteopathie, Behandlungen, Team, Preisen und Jobs. Antworte auf Deutsch, freundlich und konkret. Erkläre immer warum PhysioPro für das jeweilige Anliegen geeignet ist. Bei Notfällen verweise auf 112.`;

  try {
    const body = JSON.parse(event.body || '{}');
    const messages = body.messages || [];
    // System-Prompt vom Frontend übernehmen, sonst Fallback
    const system = body.system || FALLBACK_SYSTEM;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ reply: 'Konfigurationsfehler: API-Key fehlt. Bitte rufen Sie uns an: 0451 / 400 730 73' })
      };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: system,
        messages: messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ reply: 'Die KI ist gerade nicht erreichbar. Bitte rufen Sie uns an: 0451 / 400 730 73' })
      };
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Entschuldigung, ich konnte keine Antwort generieren.';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ reply })
    };
  } catch (e) {
    console.error('Function error:', e);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ reply: 'Ein technischer Fehler ist aufgetreten. Bitte rufen Sie uns an: 0451 / 400 730 73' })
    };
  }
};
