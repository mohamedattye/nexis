(() => {
  'use strict';
  if (window.__NEXIS_ORGANIZATION_SETTINGS__) return;
  window.__NEXIS_ORGANIZATION_SETTINGS__ = true;

  const LOGO_BUCKET = 'organization-logos';
  let selectedLogoFile = null;
  let removeLogoRequested = false;

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
    .organization-logo-card{grid-column:1/-1;display:grid;grid-template-columns:78px 1fr;gap:14px;padding:14px;border:1px solid #e0e6ec;border-radius:14px;background:#fff}.organization-logo-preview{width:78px;height:78px;border:1px dashed #cfd8e2;border-radius:14px;display:grid;place-items:center;overflow:hidden;background:#f8fafc}.organization-logo-preview img{width:100%;height:100%;object-fit:contain;padding:7px}.organization-logo-copy strong{display:block;color:#20364d;font-size:11px}.organization-logo-copy p{margin:4px 0 10px;color:#7d8998;font-size:8.5px;line-height:1.45}.organization-logo-actions{display:flex;flex-wrap:wrap;gap:7px}.organization-logo-actions button{height:34px;padding:0 10px;border-radius:9px;font:750 8px var(--font-ui,"Inter",sans-serif);cursor:pointer}.organization-logo-upload{border:0;background:#172f49;color:#fff}.organization-logo-remove{border:1px solid #dfe5eb;background:#fff;color:#9b4248}.organization-logo-status{margin-top:8px;color:#7a8797;font-size:8px}.organization-logo-status.success{color:#087a59}.organization-logo-status.error{color:#a53d45}
    .organization-settings-preview{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e0e6ec;border-radius:12px;background:#fff}.organization-settings-preview img{width:52px;height:52px;border-radius:10px;object-fit:contain;background:#f7f9fb}.organization-settings-preview strong{display:block;color:#20364d}.organization-settings-preview small{display:block;margin-top:3px;color:#8591a0}
    .organization-settings-error{grid-column:1/-1;margin:0;padding:10px;border-radius:10px;background:#fff1f1;color:#a53d45;font-size:9px}.organization-settings-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px;padding-top:4px}
    @media(max-width:740px){.organization-settings-shell{grid-template-columns:1fr}.organization-settings-overlay{display:none}.organization-settings-form{grid-template-columns:1fr}.organization-settings-form label.full,.organization-settings-section,.organization-logo-card,.organization-settings-preview,.organization-settings-error,.organization-settings-actions{grid-column:auto}.organization-logo-card{grid-template-columns:64px 1fr}.organization-logo-preview{width:64px;height:64px}}
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

        <div class="organization-settings-section">Logo de l’entreprise</div>
        <div class="organization-logo-card">
          <div class="organization-logo-preview"><img id="org-logo-preview" alt="Logo entreprise"></div>
          <div class="organization-logo-copy">
            <strong>Votre identité visuelle</strong>
            <p>PNG, JPG ou WebP · 2 Mo maximum. Ce logo apparaîtra dans Nexis et sur vos documents commerciaux.</p>
            <div class="organization-logo-actions">
              <input id="org-logo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
              <button class="organization-logo-upload" id="org-logo-upload" type="button">Téléverser un logo</button>
              <button class="organization-logo-remove" id="org-logo-remove" type="button">Supprimer le logo</button>
            </div>
            <div class="organization-logo-status" id="org-logo-status">Aucun changement.</div>
          </div>
        </div>
        <input id="org-logo-url" type="hidden">
        <div class="organization-settings-preview"><img id="org-brand-preview-logo" alt="Aperçu"><div><strong id="org-preview-name">Entreprise</strong><small id="org-preview-meta">Identité utilisée sur les documents</small></div></div>

        <div class="organization-settings-section">Contact</div>
        <label>Téléphone<input id="org-phone" type="text"></label>
        <label>Email<input id="org-email" type="email"></label>

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
  const logoFileInput = document.getElementById('org-logo-file');
  const logoStatus = document.getElementById('org-logo-status');

  function val(id, value = '') { const el = document.getElementById(id); if (el) el.value = value ?? ''; }
  function logoSrc() { return document.getElementById('org-logo-url')?.value?.trim() || 'nexis-logo.svg'; }
  function setLogoStatus(text, type = '') { logoStatus.textContent = text; logoStatus.className = `organization-logo-status${type ? ` ${type}` : ''}`; }

  function refreshPreview() {
    const src = logoSrc();
    ['org-logo-preview','org-brand-preview-logo'].forEach(id => {
      const img = document.getElementById(id);
      if (img) { img.src = src; img.onerror = () => { img.src = 'nexis-logo.svg'; }; }
    });
    document.getElementById('org-preview-name').textContent = document.getElementById('org-name')?.value?.trim() || 'Entreprise';
    const ninea = document.getElementById('org-ninea')?.value?.trim();
    const city = document.getElementById('org-city')?.value?.trim();
    document.getElementById('org-preview-meta').textContent = [ninea ? `NINEA ${ninea}` : '', city].filter(Boolean).join(' · ') || 'Identité utilisée sur les documents';
  }

  function populate(org) {
    if (!org) return;
    selectedLogoFile = null;
    removeLogoRequested = false;
    logoFileInput.value = '';
    val('org-name', org.name); val('org-legal-name', org.legal_name); val('org-ninea', org.ninea); val('org-rccm', org.rccm);
    val('org-address', org.address); val('org-city', org.city); val('org-country', org.country || 'Sénégal'); val('org-phone', org.phone); val('org-email', org.email);
    val('org-logo-url', org.logo_url); val('org-currency', org.currency || 'XOF'); val('org-vat', Number(org.default_vat_rate ?? 18));
    val('org-invoice-prefix', org.invoice_prefix || 'FAC'); val('org-price-note-prefix', org.price_note_prefix || 'NP');
    setLogoStatus(org.logo_url ? 'Logo actuel chargé.' : 'Aucun logo personnalisé pour le moment.');
    refreshPreview();
  }

  async function open() {
    const ctx = await window.NexisOrganization?.ready;
    const state = window.NexisOrganization?.get?.() || ctx;
    if (!state?.organization || state.profile?.role !== 'admin') return;
    errorBox.hidden = true;
    populate(state.organization);
    shell.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() { shell.hidden = true; document.body.style.overflow = ''; }

  async function uploadLogo(db, organizationId, file) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Format de logo non accepté. Utilisez PNG, JPG ou WebP.');
    if (file.size > 2 * 1024 * 1024) throw new Error('Le logo ne doit pas dépasser 2 Mo.');
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${organizationId}/logo.${extension}`;

    // Nettoie d'anciens formats éventuels pour éviter plusieurs logos inutiles.
    const candidates = ['png','jpg','webp'].filter(ext => ext !== extension).map(ext => `${organizationId}/logo.${ext}`);
    if (candidates.length) await db.storage.from(LOGO_BUCKET).remove(candidates);

    const result = await db.storage.from(LOGO_BUCKET).upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type });
    if (result.error) throw result.error;
    const publicResult = db.storage.from(LOGO_BUCKET).getPublicUrl(path);
    const publicUrl = publicResult?.data?.publicUrl;
    if (!publicUrl) throw new Error('Impossible de récupérer l’URL du logo.');
    return `${publicUrl}?v=${Date.now()}`;
  }

  async function deleteStoredLogo(db, organizationId) {
    await db.storage.from(LOGO_BUCKET).remove([
      `${organizationId}/logo.png`, `${organizationId}/logo.jpg`, `${organizationId}/logo.webp`
    ]);
  }

  document.querySelectorAll('[data-close-organization-settings]').forEach(button => button.addEventListener('click', close));
  ['org-name','org-ninea','org-city'].forEach(id => document.getElementById(id)?.addEventListener('input', refreshPreview));

  document.getElementById('org-logo-upload').addEventListener('click', () => logoFileInput.click());
  logoFileInput.addEventListener('change', () => {
    const file = logoFileInput.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) {
      logoFileInput.value = '';
      setLogoStatus('Format non accepté. Utilisez PNG, JPG ou WebP.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      logoFileInput.value = '';
      setLogoStatus('Le fichier dépasse 2 Mo.', 'error');
      return;
    }
    selectedLogoFile = file;
    removeLogoRequested = false;
    const previewUrl = URL.createObjectURL(file);
    document.getElementById('org-logo-url').value = previewUrl;
    setLogoStatus(`${file.name} sélectionné. Cliquez sur Enregistrer.`, 'success');
    refreshPreview();
  });

  document.getElementById('org-logo-remove').addEventListener('click', () => {
    selectedLogoFile = null;
    removeLogoRequested = true;
    logoFileInput.value = '';
    document.getElementById('org-logo-url').value = '';
    setLogoStatus('Le logo sera supprimé après Enregistrer.');
    refreshPreview();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const state = window.NexisOrganization?.get?.();
    if (!state?.organization?.id || state.profile?.role !== 'admin') return;

    const save = document.getElementById('organization-settings-save');
    save.disabled = true;
    errorBox.hidden = true;
    try {
      const db = window.supabase.createClient();
      let finalLogoUrl = state.organization.logo_url || null;

      if (removeLogoRequested) {
        await deleteStoredLogo(db, state.organization.id);
        finalLogoUrl = null;
      } else if (selectedLogoFile) {
        setLogoStatus('Téléversement du logo…');
        finalLogoUrl = await uploadLogo(db, state.organization.id, selectedLogoFile);
      }

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
        logo_url: finalLogoUrl,
        currency: document.getElementById('org-currency').value,
        default_vat_rate: Number(document.getElementById('org-vat').value || 0),
        invoice_prefix: document.getElementById('org-invoice-prefix').value.trim().toUpperCase() || 'FAC',
        price_note_prefix: document.getElementById('org-price-note-prefix').value.trim().toUpperCase() || 'NP'
      };

      const result = await db.from('organizations').update(payload).eq('id', state.organization.id).select().single();
      if (result.error) throw result.error;
      setLogoStatus(finalLogoUrl ? 'Logo enregistré.' : 'Logo supprimé.', 'success');
      selectedLogoFile = null;
      removeLogoRequested = false;
      await window.NexisOrganization.refresh();
      close();
    } catch (error) {
      console.error('Paramètres entreprise Nexis :', error);
      errorBox.textContent = error.message || 'Impossible d’enregistrer les paramètres.';
      errorBox.hidden = false;
      setLogoStatus('Le logo n’a pas pu être enregistré.', 'error');
    } finally {
      save.disabled = false;
    }
  });

  window.addEventListener('nexis:open-organization-settings', open);
  window.NexisOrganizationSettings = { open, close };

  function loadAddon(src, id) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }
  loadAddon('invite-auth-bridge.js?v=20260807-team-1', 'nexis-invite-auth-bridge-script');
  loadAddon('team-management.js?v=20260807-team-1', 'nexis-team-management-script');
})();
