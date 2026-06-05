// ═══════════════════════════════════
// PhysioPro Lübeck – Shared JS v2.0
// ═══════════════════════════════════

// Q&A Modal
function openQA() {
  const overlay = document.getElementById('qa-overlay');
  if (overlay) { overlay.style.display='flex'; document.body.style.overflow='hidden'; }
}
function closeQA() {
  const overlay = document.getElementById('qa-overlay');
  if (overlay) { overlay.style.display='none'; document.body.style.overflow=''; }
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
  if (tel.replace(/[\s+\-]/g,'').length > 15 || !/^[0-9\s+\-]+$/.test(tel)) { errEl.textContent = 'Bitte eine gültige Telefonnummer eingeben (max. 15 Ziffern).'; errEl.style.display='block'; return; }
  if (!dsgvo) { errEl.textContent = 'Bitte Datenschutz zustimmen.'; errEl.style.display='block'; return; }
  errEl.style.display = 'none';
  const btn = document.getElementById('rb-btn');
  btn.textContent = 'Wird gesendet...'; btn.disabled = true;
  try {
    const body = new URLSearchParams();
    body.append('form-name', 'rueckruf');
    body.append('firstname', name);
    body.append('phone', tel);
    body.append('email', '');
    const thema = document.getElementById('rb-thema') ? document.getElementById('rb-thema').value : '';
    body.append('message', (thema ? 'Thema: ' + thema + ' | ' : '') + 'Rückruf | Priorität: ' + (prio ? prio.value : 'nicht angegeben'));
    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    if (res.ok) {
      document.getElementById('rb-form').style.display = 'none';
      document.getElementById('rb-success').style.display = 'block';
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

// Floating "Jetzt Fragen stellen" Button + QA Modal auf allen Seiten
(function() {
  // Modal HTML einfügen falls noch nicht vorhanden
  if (!document.getElementById('qa-overlay')) {
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div id="qa-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2100;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px);" onclick="if(event.target===this)closeQA()">
        <div id="qa-modal" style="background:#fff;border-radius:20px;max-width:480px;width:100%;height:580px;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.2);">
          <button onclick="closeQA()" style="position:absolute;top:.75rem;right:.75rem;background:rgba(0,0,0,.15);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:.9rem;color:#fff;z-index:10;display:flex;align-items:center;justify-content:center;">✕</button>
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
      #pp-float-btn { font-size: 13px; padding: 12px 14px; }
    }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'pp-float-btn';
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>Frag hier KI`;
  btn.onclick = openQA;
  document.body.appendChild(btn);
})();

// Fliegender Anruf-Button – nur Mobile
(function() {
  if (window.innerWidth > 640) return;
  var btn = document.createElement('a');
  btn.href = 'tel:+4945140073073';
  btn.id = 'pp-call-btn';
  btn.setAttribute('aria-label', 'Anrufen');
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>';
  var style = btn.style;
  style.cssText = 'position:fixed;bottom:5.5rem;right:1.25rem;z-index:8000;width:52px;height:52px;border-radius:50%;background:#55725e;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.2);text-decoration:none;';
  document.body.appendChild(btn);
})();
