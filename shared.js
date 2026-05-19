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
  if (!dsgvo) { errEl.textContent = 'Bitte Datenschutz zustimmen.'; errEl.style.display='block'; return; }
  errEl.style.display = 'none';
  const btn = document.getElementById('rb-btn');
  btn.textContent = 'Wird gesendet...'; btn.disabled = true;
  try {
    const body = new URLSearchParams();
    body.append('form-name', 'rueckruf');
    body.append('firstname', name);
    body.append('phone', tel);
    body.append('email', tel.replace(/\D/g,'') + '@rueckruf.physioproluebeck.de');
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
  if (e.key === 'Escape') closeRueckruf();
});
