(() => {
  'use strict';
  if (window.__NEXIS_ORGANIZATION_SETTINGS__) return;
  window.__NEXIS_ORGANIZATION_SETTINGS__ = true;

  const LOGO_BUCKET = 'organization-logos';
  let selectedLogoFile = null;
  let removeLogoRequested = false;

  const style = document.createElement('style');
  style.textContent = `
    .organization-settings-shell{position:fixed;inset:0;z-index:30000;display:grid;grid-template-columns:1fr min(560px,96vw);height:100dvh;max-height:100dvh;overflow:hidden}
    .organization-settings-shell[hidden]{display:none}
    .organization-settings-overlay{border:0;background:rgba(15,29,45,.48);backdrop-filter:blur(3px)}
    .organization-settings-drawer{height:100dvh;max-height:100dvh;min-width:0;display:flex;flex-direction:column;overflow:hidden;background:#f7f9fb;box-shadow:-22px 0 55px rgba(14,31,52,.20)}

    .organization-settings-head{flex:0 0 auto;display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:20px 22px 18px;background:#fff;border-bottom:1px solid #e1e7ed}
    .organization-settings-head small{display:block;color:#8c97a5;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
    .organization-settings-head h3{margin:5px 0 0;color:#1b2d43;font-size:19px;line-height:1.2}
    .organization-settings-head p{margin:6px 0 0;color:#7a8797;font-size:11.5px;line-height:1.45}
    .organization-settings-close{width:34px;height:34px;flex:0 0 34px;border:1px solid #dce3ea;border-radius:10px;background:#fff;color:#536579;font-size:19px;cursor:pointer}
    .organization-settings-close:hover{background:#f7f9fb}

    .organization-settings-form{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden}
    .organization-settings-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:18px 20px 34px;scrollbar-gutter:stable}
    .organization-settings-body::-webkit-scrollbar{width:9px}.organization-settings-body::-webkit-scrollbar-track{background:transparent}.organization-settings-body::-webkit-scrollbar-thumb{background:#d4dce5;border-radius:999px;border:2px solid #f7f9fb}
    .organization-settings-card{padding:16px;border:1px solid #e1e7ed;border-radius:14px;background:#fff;box-shadow:0 4px 16px rgba(22,42,65,.025)}
    .organization-settings-card+.organization-settings-card,.organization-settings-card+.organization-settings-advanced{margin-top:12px}
    .organization-settings-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px}
    .organization-settings-card-head h4{margin:0;color:#20354b;font-size:13px;line-height:1.3}
    .organization-settings-card-head p{margin:4px 0 0;color:#8290a0;font-size:10.5px;line-height:1.45}
    .organization-settings-card-badge{flex:0 0 auto;padding:5px 7px;border-radius:999px;background:#f2f5f8;color:#758498;font-size:8.5px;font-weight:750}

    .organization-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .organization-fields label{display:grid;gap:6px;color:#405168;font-size:10.5px;font-weight:700}
    .organization-fields label.full{grid-column:1/-1}
    .organization-fields .field-note{font-size:8.5px;color:#9aa5b1;font-weight:500}
    .organization-fields input,.organization-fields select{width:100%;height:42px;margin:0!important;padding:0 11px;border:1px solid #d5dde6;border-radius:9px;background:#fff;color:#253a51;font:inherit;font-size:11.5px;outline:none}
    .organization-fields input:focus,.organization-fields select:focus{border-color:#e79a43;box-shadow:0 0 0 3px rgba(255,138,0,.09)}

    .organization-logo-row{display:grid;grid-template-columns:66px minmax(0,1fr);gap:13px;align-items:center}
    .organization-logo-preview{width:66px;height:66px;border:1px solid #dfe5eb;border-radius:13px;display:grid;place-items:center;overflow:hidden;background:#f8fafc}
    .organization-logo-preview img{width:100%;height:100%;object-fit:contain;padding:7px}
    .organization-logo-copy strong{display:block;color:#20364d;font-size:11.5px}
    .organization-logo-copy p{margin:4px 0 9px;color:#7d8998;font-size:9.5px;line-height:1.45}
    .organization-logo-actions{display:flex;flex-wrap:wrap;gap:7px}
    .organization-logo-actions button{height:32px;padding:0 9px;border-radius:8px;font:750 9px var(--font-ui,"Inter",sans-serif);cursor:pointer}
    .organization-logo-upload{border:0;background:#172f49;color:#fff}
    .organization-logo-remove{border:1px solid #dfe5eb;background:#fff;color:#9b4248}
    .organization-logo-status{margin-top:7px;color:#7a8797;font-size:9px;line-height:1.35}
    .organization-logo-status.success{color:#087a59}.organization-logo-status.error{color:#a53d45}

    .organization-settings-advanced{border:1px solid #e1e7ed;border-radius:14px;background:#fff;overflow:hidden}
    .organization-settings-advanced+.organization-settings-advanced{margin-top:10px}
    .organization-settings-advanced summary{list-style:none;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:11px;padding:13px 14px;cursor:pointer;user-select:none}
    .organization-settings-advanced summary::-webkit-details-marker{display:none}
    .organization-settings-advanced summary:hover{background:#fbfcfd}
    .organization-advanced-icon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:#f2f5f8;color:#5f7287;font-size:14px}
    .organization-advanced-copy strong{display:block;color:#293e54;font-size:11.5px}
    .organization-advanced-copy small{display:block;margin-top:3px;color:#8996a5;font-size:9.5px;line-height:1.35}
    .organization-advanced-chevron{color:#8a97a6;font-size:16px;transition:transform .16s ease}
    .organization-settings-advanced[open] .organization-advanced-chevron{transform:rotate(90deg)}
    .organization-advanced-content{padding:3px 14px 15px;border-top:1px solid #edf1f4}
    .organization-advanced-content .organization-fields{padding-top:13px}

    .organization-settings-error{margin:12px 0 0;padding:10px 11px;border-radius:9px;background:#fff1f1;color:#a53d45;font-size:10px;line-height:1.45}
    .organization-settings-footer{position:relative;z-index:3;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 20px;background:#fff;border-top:1px solid #e1e7ed;box-shadow:0 -7px 22px rgba(22,42,65,.04)}
    .organization-settings-footer small{max-width:230px;color:#8794a4;font-size:9.5px;line-height:1.4}
    .organization-settings-actions{display:flex;justify-content:flex-end;gap:8px}

    @media(max-width:740px){
      .organization-settings-shell{grid-template-columns:1fr}.organization-settings-overlay{display:none}
      .organization-settings-head{padding:17px 16px}.organization-settings-body{padding:14px 14px 28px}
      .organization-fields{grid-template-columns:1fr}.organization-fields label.full{grid-column:auto}
      .organization-settings-footer{padding:12px 14px;align-items:stretch;flex-direction:column}.organization-settings-footer small{max-width:none}.organization-settings-actions button{flex:1}
    }
  `;
  document.head.appendChild(style);

  const shell = document.createElement('section');
  shell.className = 'organization-settings-shell';
  shell.id = 'organization-settings-shell';
  shell.hidden = true;
  shell.innerHTML = `
    <button class="organization-settings-overlay" type="button" data-close-organization-settings aria-label="Fermer"></button>
    <aside class="organization-settings-drawer" role="dialog" aria-modal="true" aria-labelledby="organization-settings-title">
      <header class="organization-settings-head">
        <div>
          <small>Entreprise</small>
          <h3 id="organization-settings-title">Paramètres de l’entreprise</h3>
          <p>Votre identité principale d’abord. Les informations administratives et de facturation restent dans les réglages avancés.</p>
        </div>
        <button class="organization-settings-close" type="button" data-close-organization-settings aria-label="Fermer">×</button>
      </header>

      <form class="organization-settings-form" id="organization-settings-form">
        <div class="organization-settings-body">
          <section class="organization-settings-card">
            <div class="organization-settings-card-head">
              <div><h4>Identité de l’entreprise</h4><p>Le nom et le logo visibles dans Nexis et sur vos documents.</p></div>
              <span class="organization-settings-card-badge">Essentiel</span>
            </div>

            <div class="organization-logo-row">
              <div class="organization-logo-preview"><img id="org-logo-preview" alt="Logo entreprise"></div>
              <div class="organization-logo-copy">
                <strong>Logo</strong>
                <p>PNG, JPG ou WebP · 2 Mo maximum.</p>
                <div class="organization-logo-actions">
                  <input id="org-logo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
                  <button class="organization-logo-upload" id="org-logo-upload" type="button">Choisir un logo</button>
                  <button class="organization-logo-remove" id="org-logo-remove" type="button">Supprimer</button>
                </div>
                <div class="organization-logo-status" id="org-logo-status">Aucun changement.</div>
              </div>
            </div>
            <input id="org-logo-url" type="hidden">

            <div class="organization-fields" style="margin-top:15px">
              <label class="full">Nom de l’entreprise<input id="org-name" type="text" required placeholder="Ex. Transport BEM"></label>
            </div>
          </section>

          <section class="organization-settings-card">
            <div class="organization-settings-card-head">
              <div><h4>Coordonnées</h4><p>Les informations utilisées pour vous identifier et vous contacter.</p></div>
            </div>
            <div class="organization-fields">
              <label>Téléphone<input id="org-phone" type="text" placeholder="Ex. +221 77 000 00 00"></label>
              <label>Email<input id="org-email" type="email" placeholder="contact@entreprise.com"></label>
              <label>Ville<input id="org-city" type="text" placeholder="Ex. Dakar"></label>
              <label>Pays<input id="org-country" type="text" placeholder="Sénégal"></label>
              <label class="full">Adresse <span class="field-note">Facultatif</span><input id="org-address" type="text" placeholder="Adresse complète de l’entreprise"></label>
            </div>
          </section>

          <details class="organization-settings-advanced" id="organization-legal-details">
            <summary>
              <span class="organization-advanced-icon">§</span>
              <span class="organization-advanced-copy"><strong>Informations légales</strong><small>Raison sociale, NINEA et RCCM.</small></span>
              <span class="organization-advanced-chevron">›</span>
            </summary>
            <div class="organization-advanced-content">
              <div class="organization-fields">
                <label class="full">Raison sociale <span class="field-note">Facultatif</span><input id="org-legal-name" type="text" placeholder="Ex. Transport BEM SARL"></label>
                <label>NINEA <span class="field-note">Facultatif</span><input id="org-ninea" type="text"></label>
                <label>RCCM <span class="field-note">Facultatif</span><input id="org-rccm" type="text"></label>
              </div>
            </div>
          </details>

          <details class="organization-settings-advanced" id="organization-billing-details">
            <summary>
              <span class="organization-advanced-icon">₣</span>
              <span class="organization-advanced-copy"><strong>Facturation & documents</strong><small>Devise, TVA et numérotation de vos documents.</small></span>
              <span class="organization-advanced-chevron">›</span>
            </summary>
            <div class="organization-advanced-content">
              <div class="organization-fields">
                <label>Devise<select id="org-currency"><option value="XOF">XOF — FCFA</option><option value="EUR">EUR — Euro</option><option value="USD">USD — Dollar</option></select></label>
                <label>TVA par défaut (%)<input id="org-vat" type="number" min="0" max="100" step="0.01"></label>
                <label>Préfixe facture <span class="field-note">Ex. FAC</span><input id="org-invoice-prefix" type="text" maxlength="8"></label>
                <label>Préfixe note de prix <span class="field-note">Ex. NP</span><input id="org-price-note-prefix" type="text" maxlength="8"></label>
              </div>
            </div>
          </details>

          <p class="organization-settings-error" id="organization-settings-error" hidden></p>
        </div>

        <footer class="organization-settings-footer">
          <small>Vous pourrez modifier ces informations à tout moment.</small>
          <div class="organization-settings-actions">
            <button type="button" class="secondary" data-close-organization-settings>Annuler</button>
            <button type="submit" class="primary" id="organization-settings-save">Enregistrer</button>
          </div>
        </footer>
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
    const img = document.getElementById('org-logo-preview');
    if (img) {
      img.src = logoSrc();
      img.onerror = () => { img.src = 'nexis-logo.svg'; };
    }
  }

  function populate(org) {
    if (!org) return;
    selectedLogoFile = null;
    removeLogoRequested = false;
    logoFileInput.value = '';
    val('org-name', org.name);
    val('org-legal-name', org.legal_name);
    val('org-ninea', org.ninea);
    val('org-rccm', org.rccm);
    val('org-address', org.address);
    val('org-city', org.city);
    val('org-country', org.country || 'Sénégal');
    val('org-phone', org.phone);
    val('org-email', org.email);
    val('org-logo-url', org.logo_url);
    val('org-currency', org.currency || 'XOF');
    val('org-vat', Number(org.default_vat_rate ?? 18));
    val('org-invoice-prefix', org.invoice_prefix || 'FAC');
    val('org-price-note-prefix', org.price_note_prefix || 'NP');
    document.getElementById('organization-legal-details').open = false;
    document.getElementById('organization-billing-details').open = false;
    setLogoStatus(org.logo_url ? 'Logo actuel chargé.' : 'Aucun logo personnalisé pour le moment.');
    refreshPreview();
    document.querySelector('.organization-settings-body')?.scrollTo({ top:0, behavior:'instant' });
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

    const removeResult = await db.storage.from(LOGO_BUCKET).remove([
      `${organizationId}/logo.png`, `${organizationId}/logo.jpg`, `${organizationId}/logo.webp`
    ]);
    if (removeResult.error) throw removeResult.error;

    const result = await db.storage.from(LOGO_BUCKET).upload(path, file, { upsert:false, cacheControl:'3600', contentType:file.type });
    if (result.error) throw result.error;
    const publicResult = db.storage.from(LOGO_BUCKET).getPublicUrl(path);
    const publicUrl = publicResult?.data?.publicUrl;
    if (!publicUrl) throw new Error('Impossible de récupérer l’URL du logo.');
    return `${publicUrl}?v=${Date.now()}`;
  }

  async function deleteStoredLogo(db, organizationId) {
    const result = await db.storage.from(LOGO_BUCKET).remove([
      `${organizationId}/logo.png`, `${organizationId}/logo.jpg`, `${organizationId}/logo.webp`
    ]);
    if (result.error) throw result.error;
  }

  document.querySelectorAll('[data-close-organization-settings]').forEach(button => button.addEventListener('click', close));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !shell.hidden) close(); });

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
    document.getElementById('org-logo-url').value = URL.createObjectURL(file);
    setLogoStatus(`${file.name} sélectionné. Enregistrez pour confirmer.`, 'success');
    refreshPreview();
  });

  document.getElementById('org-logo-remove').addEventListener('click', () => {
    selectedLogoFile = null;
    removeLogoRequested = true;
    logoFileInput.value = '';
    document.getElementById('org-logo-url').value = '';
    setLogoStatus('Le logo sera supprimé après enregistrement.');
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
      const db = window.NexisAuth?.client || window.supabase.createClient();
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

      selectedLogoFile = null;
      removeLogoRequested = false;
      setLogoStatus(finalLogoUrl ? 'Logo enregistré.' : 'Logo supprimé.', 'success');
      await window.NexisOrganization.refresh();
      close();
    } catch (error) {
      console.error('Paramètres entreprise Nexis :', error);
      const message = String(error?.message || '');
      errorBox.textContent = message.includes('row-level security')
        ? 'Le logo n’a pas pu être enregistré à cause des droits de stockage. Rechargez la page puis réessayez.'
        : (message || 'Impossible d’enregistrer les paramètres.');
      errorBox.hidden = false;
      setLogoStatus(selectedLogoFile ? 'Le logo n’a pas pu être enregistré.' : '', selectedLogoFile ? 'error' : '');
      document.querySelector('.organization-settings-body')?.scrollTo({ top:document.querySelector('.organization-settings-body').scrollHeight, behavior:'smooth' });
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