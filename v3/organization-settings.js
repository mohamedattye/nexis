(() => {
  'use strict';
  if (window.__NEXIS_ORGANIZATION_SETTINGS__) return;
  window.__NEXIS_ORGANIZATION_SETTINGS__ = true;

  const style = document.createElement('style');
  style.textContent = `
    .organization-settings-shell{position:fixed;inset:0;z-index:130;display:grid;grid-template-columns:1fr min(620px,96vw)}.organization-settings-shell[hidden]{display:none}
    .organization-settings-overlay{border:0;background:rgba(15,29,45,.48);backdrop-filter:blur(3px)}
    .organization-settings-drawer{display:flex;flex-direction:column;background:#f6f8fb;box-shadow:-22px 0 55px rgba(14,31,52,.2)}
    .organization-settings-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;background:#fff;border-bottom:1px solid #e1e7ed}
    .organization-settings-head small{display:block;color:#8c97a5;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.organization-settings-head h3{margin:4px 0 0;font-size:18px;color:#1b2d43}
    .organization-settings-close{width:34px;height:34px;border:1px solid #dce3ea;border-radius:10px;background:#fff;font-size:20px;cursor:pointer}
    .organization-settings-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:19px;overflow:auto}.organization-settings-form label{display:grid;gap:6px;color:#405168;font-size:9px;font-weight:700}
    .organization-settings-form label.full{grid-column:1/-1}.organization-settings-form input,.organization-settings-form select{height:41px;width:100%;margin:0!important}.organization-settings-form textarea{width:100%;min-height:80px;padding:10px}
    .organization-settings-section{grid-column:1/-1;padding:12px 0 2px;border-top:1px solid #e3e8ee;color:#7b8796;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.organization-settings-section:first-of-type{border-top:0;padding-top:0}
    .organization-settings-preview{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e0e6ec;border-radius:12px;background:#fff}.organization-settings-preview img{width:52px;height:52px;border-radius:10px;object-fit:contain;background:#f7f9fb}.organization-settings-preview strong{display:block;color:#20364d}.organization-settings-preview small{display:block;margin-top:3px;color:#8591a0}
    .organization-settings-error{grid-column:1/-1;margin:0;padding:10px;border-radius:10px;background:#fff1f1;color:#a53d45;font-size:9px}.organization-settings-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;padding-top:4px}
    @media(max-width:740px){.organization-settings-shell{grid-template-columns:1fr}.organization-settings-overlay{display:none}.organization-settings-form{grid-template-columns:1fr}.organization-settings-form label.full,.organization-settings-section,.organization-settings-preview,.organization-settings-error,.organization-settings-actions{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const shell = document.createElement('section');
  shell.className = 'organization-settings-shell';
  shell.id = 'organization-settings-shell';
  shell.hidden = true;
  shell.innerHTML = `
    <button class="organization-settings-overlay" type="button" data-close-organization-settings></button>
    <aside class="organization-settings-drawer">
      <header class="organization-settings-head"><div><small>Configuration</small><h3>Paramètres de l’entreprise</h3></div><button class="organization-settings-close" type="button" data-close-organization-settings>×</button></header>
      <form class="organization-settings-form" id="organization-settings-form">
        <div class="organization-settings-section">Identité</div>
        <label>Nom affiché<input id="org-name" type="text" required></label>
        <label>Raison sociale<input id="org-legal-name" type="text"></label>
        <label>NINEA<input id="org-ninea" type="text"></label>
        <label>RCCM<input id="org-rccm" type="text"></label>
        <label class="full">Adresse<input id="org-address" type="text"></label>
        <label>Ville<input id="org-city" type="text"></label>
        <label>Pays<input id="org-country" type="text"></label>
        <div class="organization-settings-section">Contact</div>
        <label>Téléphone<input id="org-phone" type="text"></label>
        <label>Email<input id="org-email" type="email"></label>
        <label class="full">URL du logo<input id="org-logo-url" type="url" placeholder="https://..."></label>
        <div class="organization-settings-preview"><img id="org-logo-preview" alt="Logo entreprise"><div><strong id="org-preview-name">Entreprise</strong><small id="org-preview-meta">Identité utilisée sur les documents</small></div></div>
        <div class="organization-settings-section">Facturation</div>
        <label>Devise<select id="org-currency"><option value="XOF">XOF — FCFA</option><option value="EUR">EUR — Euro</option><option value="USD">USD — Dollar</option></select></label>
        <label>TVA par défaut (%)<input id="org-vat" type="number" min="0" max="100" step="0.01"></label>
        <label>Préfixe facture<input id="org-invoice-prefix" type="text" maxlength="8"></label>
        <label>Préfixe note de prix<input id="org-price-note-prefix" type="text" maxlength="8"></label>
        <p class="organization-settings-error" id="organization-settings-error" hidden></p>
        <div class="organization-settings-actions"><button type="button" class="secondary" data-close-organization-settings>Annuler</button><button type="submit" class="primary" id="organization-settings-save">Enregistrer</button></div>
      </form>
    </aside>`;
  document.body.appendChild(shell);

  const form = document.getElementById('organization-settings-form');
  const errorBox = document.getElementById('organization-settings-error');

  function val(id, value = '') { const el = document.getElementById(id); if (el) el.value = value ?? ''; }
  function populate(org) {
    if (!org) return;
    val('org-name', org.name); val('org-legal-name', org.legal_name); val('org-ninea', org.ninea); val('org-rccm', org.rccm);
    val('org-address', org.address); val('org-city', org.city); val('org-country', org.country || 'Sénégal'); val('org-phone', org.phone); val('org-email', org.email);
    val('org-logo-url', org.logo_url); val('org-currency', org.currency || 'XOF'); val('org-vat', Number(org.default_vat_rate ?? 18));
    val('org-invoice-prefix', org.invoice_prefix || 'FAC'); val('org-price-note-prefix', org.price_note_prefix || 'NP');
    refreshPreview();
  }

  function refreshPreview() {
    const logo = document.getElementById('org-logo-url')?.value?.trim();
    const img = document.getElementById('org-logo-preview');
    if (img) { img.src = logo || 'nexis-logo.svg'; img.onerror = () => { img.src = 'nexis-logo.svg'; }; }
    document.getElementById('org-preview-name').textContent = document.getElementById('org-name')?.value?.trim() || 'Entreprise';
    const ninea = document.getElementById('org-ninea')?.value?.trim();
    const city = document.getElementById('org-city')?.value?.trim();
    document.getElementById('org-preview-meta').textContent = [ninea ? `NINEA ${ninea}` : '', city].filter(Boolean).join(' · ') || 'Identité utilisée sur les documents';
  }

  async function open() {
    const ctx = await window.NexisOrganization?.ready;
    const state = window.NexisOrganization?.get?.() || ctx;
    if (!state?.organization) return;
    if (state.profile?.role !== 'admin') return;
    errorBox.hidden = true;
    populate(state.organization);
    shell.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() { shell.hidden = true; document.body.style.overflow = ''; }

  document.querySelectorAll('[data-close-organization-settings]').forEach(button => button.addEventListener('click', close));
  ['org-name','org-ninea','org-city','org-logo-url'].forEach(id => document.getElementById(id)?.addEventListener('input', refreshPreview));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const state = window.NexisOrganization?.get?.();
    if (!state?.organization?.id || state.profile?.role !== 'admin') return;

    const save = document.getElementById('organization-settings-save');
    save.disabled = true;
    errorBox.hidden = true;
    try {
      const db = window.supabase.createClient();
      const payload = {
        name: document.getElementById('org-name').value.trim(),
        legal_name: document.getElementById('org-legal-name').value.trim() || null,
        ninea: document.getElementById('org-ninea').value.trim() || null,
        rccm: document.getElementById('org-rccm').value.trim() || null,
        address: document.getElementById('org-address').value.trim() || null,
        city: document.getElementById('org-city').value.trim() || null,
        country: document.getElementById('org-country').value.trim() || 'Sénégal',
        phone: document.getElementById('org-phone').value.trim() || null,
        email: document.getElementById('org-email').value.trim() || null,
        logo_url: document.getElementById('org-logo-url').value.trim() || null,
        currency: document.getElementById('org-currency').value,
        default_vat_rate: Number(document.getElementById('org-vat').value || 0),
        invoice_prefix: document.getElementById('org-invoice-prefix').value.trim().toUpperCase() || 'FAC',
        price_note_prefix: document.getElementById('org-price-note-prefix').value.trim().toUpperCase() || 'NP'
      };
      const result = await db.from('organizations').update(payload).eq('id', state.organization.id).select().single();
      if (result.error) throw result.error;
      await window.NexisOrganization.refresh();
      close();
    } catch (error) {
      errorBox.textContent = error.message || 'Impossible d’enregistrer les paramètres.';
      errorBox.hidden = false;
    } finally {
      save.disabled = false;
    }
  });

  window.addEventListener('nexis:open-organization-settings', open);
  window.NexisOrganizationSettings = { open, close };
})();
