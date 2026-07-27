// ═══════════════════════════════════
// PhysioPro Lübeck – Shared JS v2.0
// ═══════════════════════════════════

// UTM-Parameter aus der Landing-URL an einen URLSearchParams-Body anhängen.
// Wird von allen Ads-relevanten Formularen genutzt (termin, osteopathie, rueckruf).
function appendUTMs(body) {
  var up = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content','gclid'].forEach(function(k){
    var v = up.get(k);
    if (v) body.append(k, v);
  });
  return body;
}

// Standort-Suffix für dataLayer-Events.
// Bad Schwartau bekommt ein eigenes Suffix, damit Conversions pro Standort
// getrennt in Google Ads zählen. Alle übrigen Seiten (Lübeck) bleiben unverändert.
function physioStandortSuffix() {
  return window.location.pathname.indexOf('bad-schwartau') !== -1 ? '_badschwartau' : '';
}

// Q&A Modal
function openQA() {
  const overlay = document.getElementById('qa-overlay');
  if (overlay) { overlay.style.display='flex'; document.body.style.overflow='hidden'; }
  const callBtn = document.getElementById('pp-call-btn');
  if (callBtn) callBtn.style.display = 'none';
}
function closeQA() {
  const overlay = document.getElementById('qa-overlay');
  if (overlay) { overlay.style.display='none'; document.body.style.overflow=''; }
  const callBtn = document.getElementById('pp-call-btn');
  if (callBtn) callBtn.style.display = 'flex';
}

// Mobile Menu
function toggleMenu() {
  document.getElementById('mobile-menu').classList.toggle('open');
}

// Netlify Forms Submit Helper
async function hsSubmit(fields, formId) {
  const formName = formId === '6a989700-c8cd-40c8-8271-042e9359154a' ? 'bewerbung' : 'kontakt';
  const body = new URLSearchParams();
  body.append('form-name', formName);
  fields.forEach(f => body.append(f.name, f.value));
  const res = await fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  return res;
}

// Rückruf Modal
function openRueckruf() {
  document.getElementById('rueckruf-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeRueckruf() {
  document.getElementById('rueckruf-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function selectRbPrio(label) {
  document.querySelectorAll('#rb-prio-group .radio-opt').forEach(l => l.classList.remove('selected'));
  label.classList.add('selected');
}
function selectRbThema(btn, thema) {
  document.querySelectorAll('#rb-thema-group button').forEach(b => {
    b.style.background='#fff'; b.style.borderColor='var(--beige-mid)'; b.style.color='var(--text-mid)';
  });
  btn.style.background='var(--rose)'; btn.style.borderColor='var(--rose)'; btn.style.color='#fff';
  document.getElementById('rb-thema').value = thema;
}
async function rueckrufSubmit() {
  const name = document.getElementById('rb-name').value.trim();
  const tel = document.getElementById('rb-tel').value.trim();
  const dsgvo = document.getElementById('rb-dsgvo').checked;
  const prio = document.querySelector('input[name="rb-prio"]:checked');
  const errEl = document.getElementById('rb-error');
  if (!name || !tel) { errEl.textContent = 'Bitte Name und Telefonnummer angeben.'; errEl.style.display='block'; return; }
  if (!dsgvo) { errEl.textContent = 'Bitte Datenschutz zustimmen.'; errEl.style.display='block'; return; }
  errEl.style.display = 'none';
  const btn = document.getElementById('rb-btn');
  btn.textContent = 'Wird gesendet...'; btn.disabled = true;
  try {
    const body = new URLSearchParams();
    body.append('form-name', physioStandortSuffix() ? 'rueckruf-badschwartau' : 'rueckruf');
    body.append('firstname', name);
    body.append('phone', tel);
    body.append('email', tel.replace(/\D/g,'') + '@rueckruf.physioproluebeck.de');
    const thema = document.getElementById('rb-thema') ? document.getElementById('rb-thema').value : '';
    body.append('message', (thema ? 'Thema: ' + thema + ' | ' : '') + 'Rückruf | Priorität: ' + (prio ? prio.value : 'nicht angegeben'));
    appendUTMs(body);
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    if (res.ok) {
      document.getElementById('rb-form').style.display = 'none';
      document.getElementById('rb-success').style.display = 'block';
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'physio_lead_rueckruf' + physioStandortSuffix() });
    } else {
      errEl.textContent = 'Fehler. Bitte anrufen: 0451 / 400 730 73';
      errEl.style.display = 'block';
      btn.textContent = 'Rückruf anfordern'; btn.disabled = false;
    }
  } catch(e) {
    errEl.textContent = 'Verbindungsfehler.';
    errEl.style.display = 'block';
    btn.textContent = 'Rückruf anfordern'; btn.disabled = false;
  }
}

// Close modal on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeRueckruf(); closeQA(); }
});

// Schließen-Signal aus dem KI-Assistent-Iframe empfangen
window.addEventListener('message', e => {
  if (e.data === 'close-qa') { closeQA(); }
});

// Floating "Jetzt Fragen stellen" Button + QA Modal auf allen Seiten
(function() {
  // Modal HTML einfügen falls noch nicht vorhanden
  if (!document.getElementById('qa-overlay')) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div id="qa-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2100;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);" onclick="if(event.target===this)closeQA()">
        <div id="qa-modal" style="background:#fff;border-radius:20px;max-width:480px;width:100%;height:580px;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.2);">
          <iframe src="/qa-assistant.html" style="width:100%;height:100%;border:none;" frameborder="0"></iframe>
        </div>
      </div>
      <style>
        @media(max-width:640px){
          #qa-modal { height:85vh !important; max-height:85vh !important; border-radius:20px 20px 0 0 !important; }
          #qa-overlay { align-items:flex-end !important; padding:0 !important; }
        }
      </style>`;
    document.body.appendChild(modal);
  }

  // Floating Button styles
  const style = document.createElement('style');
  style.textContent = `
    #pp-float-btn {
      position: fixed; top: 50%; right: 0; transform: translateY(-50%);
      z-index: 1500;
      background: #2d4a3e; color: #fff; border: none;
      border-radius: 10px 0 0 10px;
      padding: 14px 18px; font-size: 14px; font-weight: 600; font-family: inherit;
      cursor: pointer; display: flex; align-items: center; gap: 9px;
      box-shadow: -4px 4px 20px rgba(45,74,62,0.35);
      transition: padding 0.2s, box-shadow 0.2s; white-space: nowrap;
    }
    #pp-float-btn:hover { padding-right: 24px; box-shadow: -6px 6px 28px rgba(45,74,62,0.45); }
    #pp-float-btn svg { flex-shrink: 0; }
    @media(max-width:640px) {
      #pp-float-btn { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'pp-float-btn';
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>Frag hier KI`;
  btn.onclick = openQA;
  document.body.appendChild(btn);
})();

// Sticky Bottom-CTA – nur Mobile, ersetzt den frueher schwebenden Anruf-Button.
// Nicht auf Bad-Schwartau-Seiten, nicht auf der Termin-Seite selbst (ein Klick
// wuerde dort per Seiten-Reload das laufende Buchungsformular zuruecksetzen)
// und nicht auf der Startseite (index.html hat seit dem Mobile-Redesign
// 07/2026 eine eigene, baugleiche 3-Button-Sticky-Leiste - #pp-mh-sticky -
// direkt im Dokument, inkl. Ruckruf-Button, siehe index.html).
(function() {
  var path = window.location.pathname;
  if (path.indexOf('bad-schwartau') !== -1) return;
  if (/^\/termin\/?$/.test(path) || /\/termin\.html$/.test(path)) return;
  if (path === '/' || path === '' || /^\/index\.html$/.test(path)) return;

  var bar = document.createElement('div');
  bar.id = 'pp-sticky-cta';
  bar.className = 'pp-sticky-cta';
  bar.innerHTML =
    '<a href="/termin" class="btn btn-primary">Termin anfragen</a>' +
    '<a href="tel:+4945140073073" class="pp-sticky-call" aria-label="Anrufen: 0451 400 730 73">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f6f1e7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>' +
    '</a>';
  document.body.appendChild(bar);

  var style = document.createElement('style');
  style.textContent = `
    .pp-sticky-cta { display: none; }
    @media(max-width:768px) {
      .pp-sticky-cta {
        display: flex; align-items: center; gap: .6rem;
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 900;
        padding: .6rem .75rem calc(.6rem + env(safe-area-inset-bottom));
        background: rgba(250,248,244,.92); backdrop-filter: blur(10px);
        border-top: 1px solid var(--beige-mid);
      }
      .pp-sticky-cta a.btn { flex: 1; text-align: center; margin: 0; }
      .pp-sticky-cta .pp-sticky-call {
        width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
        background: var(--rose); display: flex; align-items: center; justify-content: center;
      }
      body { padding-bottom: 68px; }
    }
  `;
  document.head.appendChild(style);
})();

// Sitewide Hinweisbanner – Physio Plus Bad Schwartau Betriebseinstellung (Juli/Aug 2026)
// Entfernen bzw. Zeitraum pruefen: Ende August 2026
(function() {
  var banner = document.createElement('div');
  banner.id = 'pp-alert-banner';
  banner.innerHTML = '<span><strong>Wichtige Information für Patient:innen aus Bad Schwartau</strong> — Physio Plus hat den Betrieb eingestellt. So geht es mit Ihrem Rezept weiter</span>' +
    '<a href="/bad-schwartau/termin#rezept-hinweis" class="pp-alert-btn">Jetzt informieren</a>';
  document.body.insertBefore(banner, document.body.firstChild);

  var style = document.createElement('style');
  style.textContent = `
    #pp-alert-banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 1100;
      background: #a08a5e; color: #fff;
      display: flex; align-items: center; justify-content: center; gap: 1rem;
      flex-wrap: wrap; text-align: center;
      padding: .6rem 1.25rem; font-size: .85rem; font-family: inherit; line-height: 1.4;
    }
    #pp-alert-banner strong { font-weight: 600; }
    .pp-alert-btn {
      background: #fff; color: #8a6d2f !important; font-weight: 600;
      padding: .35rem .95rem; border-radius: 100px; text-decoration: none;
      white-space: nowrap; font-size: .8rem; flex-shrink: 0;
    }
    @media(max-width:640px) {
      #pp-alert-banner { font-size: .78rem; padding: .55rem .75rem; }
    }
  `;
  document.head.appendChild(style);

  function adjustLayout() {
    var h = banner.offsetHeight;
    var nav = document.querySelector('nav');
    if (nav) nav.style.top = h + 'px';
    document.body.style.paddingTop = 'calc(var(--nav-h) + ' + h + 'px)';
    var mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) mobileMenu.style.top = 'calc(var(--nav-h) + ' + h + 'px)';
  }
  adjustLayout();
  window.addEventListener('resize', adjustLayout);
})();
