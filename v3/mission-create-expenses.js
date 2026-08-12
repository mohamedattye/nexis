(() => {
  'use strict';

  const form = document.getElementById('mission-form');
  const legacySubmit = document.getElementById('mission-submit');
  const errorBox = document.getElementById('mission-form-error');
  const formActions = form?.querySelector('.form-actions');
  if (!form || !legacySubmit || !formActions || !window.supabase?.createClient) return;

  const client = window.NexisAuth?.client || window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let saving = false;
  let quickContext = null;
  let truckContextApplied = false;
  let clientContextApplied = false;
  let newClientMode = false;
  let hasExistingClients = false;

  const titleText = document.querySelector('.simple-form-title p');
  if (titleText) titleText.textContent = 'Mission, client et dépenses sur un seul écran. Les frais restent facultatifs.';

  const pageText = document.querySelector('.simple-mission-head p');
  if (pageText) pageText.textContent = 'Saisissez toute l’opération puis enregistrez en un seul clic.';

  const style = document.createElement('style');
  style.textContent = `
    .quick-client-field{grid-column:1/-1!important;position:relative;display:grid;gap:7px}
    .quick-client-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .quick-client-head label{font-size:10px!important;font-weight:700!important;color:#405168!important}
    .quick-client-toggle{border:0;background:transparent;color:#c76c00;font:750 10px var(--font-ui,"Inter",sans-serif);cursor:pointer;padding:3px 0}
    .quick-client-toggle:hover{text-decoration:underline}
    .quick-client-field select{width:100%}
    .quick-client-field small{display:block;margin-top:0;color:#8994a2;font-size:8.5px;font-weight:500}
    .quick-new-client{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px;border:1px solid #e1e7ee;border-radius:10px;background:#f8fafc}
    .quick-new-client[hidden]{display:none}
    .quick-new-client label{font-size:9.5px!important;font-weight:700!important;color:#405168!important}
    .quick-new-client label.full{grid-column:1/-1}
    .quick-new-client input{height:40px!important;margin-top:5px!important}
    .quick-new-client-note{grid-column:1/-1;margin:0!important;color:#7d8998!important;font-size:8.5px!important;line-height:1.45}
    .quick-expense-section{grid-column:1/-1;border-top:1px solid #e8edf3;padding-top:16px;margin-top:1px}
    .quick-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:11px}
    .quick-section-head h4{margin:0;font-size:13px;color:#26364a}
    .quick-section-head p{margin:4px 0 0;font-size:10px;color:#7a8493}
    .quick-optional{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#a35c00;background:#fff5e8;border:1px solid #ffd9a7;border-radius:999px;padding:5px 8px;white-space:nowrap}
    .quick-expense-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
    .quick-expense-grid label{font-size:10px!important}
    .quick-expense-grid input{height:40px!important;margin-top:5px!important}
    .quick-advanced{margin-top:10px;border:1px solid #e5eaf0;border-radius:8px;background:#fbfcfe}
    .quick-advanced summary{list-style:none;cursor:pointer;padding:10px 12px;font-size:10px;font-weight:800;color:#46556a;display:flex;align-items:center;justify-content:space-between}
    .quick-advanced summary::-webkit-details-marker{display:none}
    .quick-advanced summary:after{content:'+';font-size:15px;color:#d27600}
    .quick-advanced[open] summary:after{content:'−'}
    .quick-advanced-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0 12px 12px}
    .quick-summary{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;padding:11px;background:#f6f8fb;border:1px solid #e2e7ee;border-radius:9px}
    .quick-summary div{padding:8px 10px;background:#fff;border:1px solid #e5eaf0;border-radius:7px}
    .quick-summary span,.quick-summary strong{display:block}
    .quick-summary span{font-size:9px;color:#7b8594;text-transform:uppercase;letter-spacing:.06em;font-weight:800}
    .quick-summary strong{margin-top:5px;font-size:15px;color:#233349}
    .quick-summary .margin strong{color:#07845d}
    .simple-form .form-actions{align-items:center;flex-wrap:wrap}
    .save-next{border:1px solid #f0a24f;background:#fff8ef;color:#9b5200;border-radius:7px;padding:10px 14px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
    .save-next:hover{background:#fff1df}
    .mission-field-invalid{border-color:#d85a61!important;box-shadow:0 0 0 3px rgba(216,90,97,.08)!important}
    @media(max-width:1000px){.quick-expense-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:740px){.quick-expense-grid,.quick-advanced-grid,.quick-summary,.quick-new-client{grid-template-columns:1fr}.quick-new-client label.full,.quick-new-client-note{grid-column:auto}.quick-section-head{align-items:flex-start}.simple-form .form-actions{align-items:stretch}}
  `;
  document.head.appendChild(style);

  const clientField = document.createElement('div');
  clientField.className = 'quick-client-field';
  clientField.innerHTML = `
    <div class="quick-client-head">
      <label for="mission-client">Client</label>
      <button type="button" class="quick-client-toggle" id="mission-client-toggle">+ Nouveau client</button>
    </div>
    <select id="mission-client"><option value="">Chargement des clients…</option></select>
    <div class="quick-new-client" id="quick-new-client" hidden>
      <label class="full">Nom du client<input id="quick-client-company" type="text" autocomplete="organization" placeholder="Ex. Société ABC" /></label>
      <label>Contact <span style="color:#9aa5b1;font-weight:500">Facultatif</span><input id="quick-client-contact" type="text" autocomplete="name" placeholder="Nom du contact" /></label>
      <label>Téléphone <span style="color:#9aa5b1;font-weight:500">Facultatif</span><input id="quick-client-phone" type="text" autocomplete="tel" placeholder="Ex. +221 77 000 00 00" /></label>
      <label>Email <span style="color:#9aa5b1;font-weight:500">Facultatif</span><input id="quick-client-email" type="email" autocomplete="email" placeholder="contact@client.com" /></label>
      <p class="quick-new-client-note">Le client sera créé automatiquement dans votre fichier Clients et rattaché à cette mission.</p>
    </div>
    <small id="mission-client-help">Le client sera repris automatiquement lors de la facturation.</small>`;
  const routeRow = form.querySelector('.route-row');
  form.insertBefore(clientField, routeRow || errorBox || formActions);

  const expenseSection = document.createElement('section');
  expenseSection.className = 'quick-expense-section';
  expenseSection.innerHTML = `
    <div class="quick-section-head">
      <div><h4>Dépenses de la mission</h4><p>Saisissez uniquement les frais réellement engagés.</p></div>
      <span class="quick-optional">Facultatif</span>
    </div>
    <div class="quick-expense-grid">
      <label>Carburant (FCFA)<input id="create-expense-fuel" type="number" min="0" step="100" value="0" /></label>
      <label>Ration (FCFA)<input id="create-expense-ration" type="number" min="0" step="100" value="0" /></label>
      <label>Rapido / péage<input id="create-expense-rapido" type="number" min="0" step="100" value="0" /></label>
      <label>Manœuvre (FCFA)<input id="create-expense-manoeuvre" type="number" min="0" step="100" value="0" /></label>
      <label>Autres frais (FCFA)<input id="create-expense-misc" type="number" min="0" step="100" value="0" /></label>
    </div>
    <details class="quick-advanced">
      <summary>Informations avancées : kilométrage et consommation</summary>
      <div class="quick-advanced-grid">
        <label>Kilométrage<input id="create-expense-km" type="number" min="0" step="1" value="0" /></label>
        <label>Consommation / 100 km<input id="create-expense-consumption" type="number" min="0" step="0.1" value="0" /></label>
      </div>
    </details>`;

  const summary = document.createElement('div');
  summary.className = 'quick-summary';
  summary.innerHTML = `
    <div><span>Montant facturé</span><strong id="quick-revenue-preview">0 FCFA</strong></div>
    <div><span>Total dépenses</span><strong id="quick-expense-total">0 FCFA</strong></div>
    <div class="margin"><span>Marge estimée</span><strong id="quick-margin-preview">0 FCFA</strong></div>`;

  form.insertBefore(expenseSection, errorBox || formActions);
  form.insertBefore(summary, errorBox || formActions);

  formActions.innerHTML = `
    <button type="reset" class="secondary">Effacer</button>
    <button type="submit" class="save-next" data-save-mode="next">Enregistrer et créer la suivante</button>
    <button type="submit" class="primary" id="mission-submit" data-save-mode="finish">Enregistrer et terminer</button>`;

  const submitButtons = [...formActions.querySelectorAll('button[type="submit"]')];
  const revenueInput = document.getElementById('mission-revenue');
  const truckInput = document.getElementById('mission-truck');
  const clientInput = document.getElementById('mission-client');
  const clientToggle = document.getElementById('mission-client-toggle');
  const newClientPanel = document.getElementById('quick-new-client');
  const newClientCompany = document.getElementById('quick-client-company');
  const newClientContact = document.getElementById('quick-client-contact');
  const newClientPhone = document.getElementById('quick-client-phone');
  const newClientEmail = document.getElementById('quick-client-email');
  const dateInput = document.getElementById('mission-date');
  const loadingInput = document.getElementById('mission-loading-zone');
  const unloadingInput = document.getElementById('mission-unloading-zone');
  const expenseKeys = ['km', 'consumption', 'fuel', 'ration', 'rapido', 'manoeuvre', 'misc'];
  const expenseInputs = Object.fromEntries(expenseKeys.map((key) => [key, document.getElementById(`create-expense-${key}`)]));
  const revenuePreview = document.getElementById('quick-revenue-preview');
  const expensePreview = document.getElementById('quick-expense-total');
  const marginPreview = document.getElementById('quick-margin-preview');

  function numberValue(input) {
    const value = Number(input?.value || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function money(value) {
    return `${formatter.format(Number(value) || 0)} FCFA`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getExpenseValues() {
    return Object.fromEntries(expenseKeys.map((key) => [key, numberValue(expenseInputs[key])]));
  }

  function expenseTotal(values = getExpenseValues()) {
    return ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc']
      .reduce((sum, key) => sum + Number(values[key] || 0), 0);
  }

  function updateSummary() {
    const revenue = numberValue(revenueInput);
    const expenses = expenseTotal();
    const margin = revenue - expenses;
    revenuePreview.textContent = money(revenue);
    expensePreview.textContent = money(expenses);
    marginPreview.textContent = money(margin);
    marginPreview.style.color = margin < 0 ? '#bd3d44' : '#07845d';
  }

  function showError(message = '') {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  function clearInvalidState() {
    form.querySelectorAll('.mission-field-invalid').forEach((element) => {
      element.classList.remove('mission-field-invalid');
      element.removeAttribute('aria-invalid');
    });
  }

  function markInvalid(element) {
    if (!element) return;
    element.classList.add('mission-field-invalid');
    element.setAttribute('aria-invalid', 'true');
  }

  function validateMission(mission, revenueRaw) {
    clearInvalidState();
    const missing = [];
    const add = (label, element) => {
      missing.push({ label, element });
      markInvalid(element);
    };

    if (!mission.truck) add('camion', truckInput);
    if (!mission.date) add('date', dateInput);
    if (!mission.loadingZone) add('chargement', loadingInput);
    if (!mission.unloadingZone) add('déchargement', unloadingInput);
    if (revenueRaw === '') add('montant facturé', revenueInput);

    if (newClientMode) {
      if (!newClientCompany.value.trim()) add('nom du nouveau client', newClientCompany);
    } else if (!mission.client_id) {
      add('client', clientInput);
    }

    if (!missing.length) return true;

    const labels = missing.map((item) => item.label);
    const text = labels.length === 1
      ? `Il manque : ${labels[0]}.`
      : `Il manque : ${labels.slice(0, -1).join(', ')} et ${labels.at(-1)}.`;
    showError(text);
    missing[0].element?.focus?.();
    return false;
  }

  function setSavingState(active, label = '') {
    submitButtons.forEach((button) => {
      button.disabled = active;
      if (active) {
        if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent;
        button.textContent = label || 'Enregistrement…';
      } else if (button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
        delete button.dataset.originalLabel;
      }
    });
  }

  function setNewClientMode(active, { focus = true } = {}) {
    newClientMode = Boolean(active);
    newClientPanel.hidden = !newClientMode;
    clientInput.disabled = newClientMode || !hasExistingClients;
    if (newClientMode) clientInput.value = '';
    clientToggle.textContent = newClientMode && hasExistingClients ? 'Choisir un client existant' : '+ Nouveau client';
    document.getElementById('mission-client-help').textContent = newClientMode
      ? 'Le client sera ajouté automatiquement à votre fichier Clients.'
      : 'Le client sera repris automatiquement lors de la facturation.';
    clearInvalidState();
    showError('');
    if (newClientMode && focus) window.setTimeout(() => newClientCompany.focus(), 0);
  }

  function maybeClearQuickContext() {
    if (!quickContext) return;
    if (truckContextApplied && clientContextApplied) {
      sessionStorage.removeItem('nexisQuickEntryContext');
      quickContext = null;
    }
  }

  function applyTruckContext() {
    if (!quickContext?.truck || !truckInput) {
      truckContextApplied = true;
      maybeClearQuickContext();
      return true;
    }
    const exists = [...truckInput.options].some((option) => option.value === quickContext.truck);
    if (!exists) return false;
    truckInput.value = quickContext.truck;
    truckContextApplied = true;
    maybeClearQuickContext();
    return true;
  }

  function applyClientContext() {
    if (!quickContext?.client_id || !clientInput) {
      clientContextApplied = true;
      maybeClearQuickContext();
      return true;
    }
    const exists = [...clientInput.options].some((option) => option.value === quickContext.client_id);
    if (!exists) return false;
    setNewClientMode(false, { focus:false });
    clientInput.value = quickContext.client_id;
    clientContextApplied = true;
    maybeClearQuickContext();
    return true;
  }

  function restoreQuickEntryContext() {
    const saved = sessionStorage.getItem('nexisQuickEntryContext');
    if (!saved) {
      truckContextApplied = true;
      clientContextApplied = true;
      return;
    }

    try {
      quickContext = JSON.parse(saved);
    } catch {
      sessionStorage.removeItem('nexisQuickEntryContext');
      quickContext = null;
      truckContextApplied = true;
      clientContextApplied = true;
      return;
    }

    if (quickContext?.date && dateInput) dateInput.value = quickContext.date;

    if (!applyTruckContext()) {
      const observer = new MutationObserver(() => {
        if (applyTruckContext()) observer.disconnect();
      });
      observer.observe(truckInput, { childList: true });
      window.setTimeout(() => {
        observer.disconnect();
        if (!truckContextApplied) {
          truckContextApplied = true;
          maybeClearQuickContext();
        }
      }, 5000);
    }
  }

  async function loadClients() {
    clientInput.disabled = true;
    const { data, error } = await client
      .from('clients')
      .select('id,company_name,is_active')
      .eq('is_active', true)
      .order('company_name', { ascending: true });

    if (error) {
      console.error('Impossible de charger les clients pour la mission :', error);
      clientInput.innerHTML = '<option value="">Clients indisponibles</option>';
      hasExistingClients = false;
      setNewClientMode(true, { focus:false });
      showError('Impossible de charger les clients existants. Vous pouvez néanmoins créer un nouveau client ici.');
      return;
    }

    const rows = data || [];
    hasExistingClients = rows.length > 0;
    clientInput.innerHTML = rows.length
      ? '<option value="">Sélectionner un client</option>' + rows.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.company_name)}</option>`).join('')
      : '<option value="">Aucun client enregistré</option>';

    if (!rows.length) {
      setNewClientMode(true, { focus:false });
      clientToggle.textContent = 'Nouveau client';
    } else {
      setNewClientMode(false, { focus:false });
    }
    applyClientContext();
  }

  async function resolveClientId() {
    if (!newClientMode) return clientInput.value || null;

    const companyName = newClientCompany.value.trim();
    const contactName = newClientContact.value.trim() || null;
    const phone = newClientPhone.value.trim() || null;
    const email = newClientEmail.value.trim() || null;

    const { data: existing, error: existingError } = await client
      .from('clients')
      .select('id,company_name,is_active')
      .ilike('company_name', companyName)
      .limit(1);
    if (existingError) throw existingError;

    if (existing?.length) {
      const found = existing[0];
      if (!found.is_active) {
        const { error: reactivateError } = await client.from('clients').update({ is_active:true }).eq('id', found.id);
        if (reactivateError) throw reactivateError;
      }
      return found.id;
    }

    const { data: created, error: createError } = await client
      .from('clients')
      .insert({
        company_name: companyName,
        contact_name: contactName,
        phone,
        email,
        payment_terms_days: 30,
        is_active: true
      })
      .select('id')
      .single();
    if (createError) throw createError;
    return created.id;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (saving) return;

    const saveMode = event.submitter?.dataset.saveMode || 'finish';
    const revenueRaw = String(revenueInput?.value || '').trim();
    const missionId = crypto.randomUUID();
    const mission = {
      id: missionId,
      submission_token: missionId,
      client_id: newClientMode ? null : (clientInput?.value || null),
      truck: truckInput?.value.trim().toUpperCase(),
      date: dateInput?.value,
      loadingZone: loadingInput?.value.trim(),
      unloadingZone: unloadingInput?.value.trim(),
      revenue: numberValue(revenueInput)
    };

    if (!validateMission(mission, revenueRaw)) return;

    saving = true;
    showError('');
    setSavingState(true);
    let insertedTrip = false;
    let createdOrResolvedClientId = mission.client_id;

    try {
      const { data: duplicate, error: duplicateError } = await client
        .from('trips')
        .select('id')
        .eq('truck', mission.truck)
        .eq('date', mission.date)
        .eq('loadingZone', mission.loadingZone)
        .eq('unloadingZone', mission.unloadingZone)
        .eq('revenue', mission.revenue)
        .limit(1);

      if (duplicateError) throw duplicateError;
      if (duplicate?.length) {
        showError('Cette mission existe déjà avec les mêmes informations.');
        return;
      }

      createdOrResolvedClientId = await resolveClientId();
      mission.client_id = createdOrResolvedClientId;

      const { error: missionError } = await client.from('trips').insert([mission]);
      if (missionError) throw missionError;
      insertedTrip = true;

      const values = getExpenseValues();
      const shouldCreateExpense = expenseTotal(values) > 0 || values.km > 0 || values.consumption > 0;

      if (shouldCreateExpense) {
        const { error: expenseError } = await client.from('trip_expenses').insert([{
          id: crypto.randomUUID(),
          trip_id: mission.id,
          truck: mission.truck,
          date: mission.date,
          loadingZone: mission.loadingZone,
          unloadingZone: mission.unloadingZone,
          ...values
        }]);
        if (expenseError) throw expenseError;
      }

      if (saveMode === 'next') {
        sessionStorage.setItem('nexisQuickEntryContext', JSON.stringify({
          client_id: mission.client_id,
          truck: mission.truck,
          date: mission.date
        }));
      }

      setSavingState(true, 'Mission enregistrée');
      const targetView = saveMode === 'next' ? 'new-trip' : 'trips';
      window.setTimeout(() => {
        window.location.replace(`${window.location.pathname}${window.location.search}#${targetView}`);
        window.location.reload();
      }, 350);
    } catch (error) {
      console.error('Erreur création complète de mission :', error);
      if (insertedTrip) await client.from('trips').delete().eq('id', mission.id);
      const message = String(error?.message || '');
      showError(message.includes('row-level security')
        ? "Vous n'avez pas les droits nécessaires pour créer ce client ou cette mission."
        : "Impossible d'enregistrer la mission. Vérifiez les informations puis réessayez.");
    } finally {
      saving = false;
      if (!document.hidden) setSavingState(false);
    }
  }

  clientToggle.addEventListener('click', () => {
    if (!hasExistingClients && newClientMode) return;
    setNewClientMode(!newClientMode);
  });

  [truckInput, clientInput, dateInput, loadingInput, unloadingInput, revenueInput, newClientCompany].forEach((input) => {
    input?.addEventListener('input', () => {
      input.classList.remove('mission-field-invalid');
      input.removeAttribute('aria-invalid');
      if (!errorBox.hidden) showError('');
    });
    input?.addEventListener('change', () => {
      input.classList.remove('mission-field-invalid');
      input.removeAttribute('aria-invalid');
      if (!errorBox.hidden) showError('');
    });
  });

  [...Object.values(expenseInputs), revenueInput].forEach((input) => input?.addEventListener('input', updateSummary));
  form.addEventListener('submit', handleSubmit, true);
  form.addEventListener('reset', () => window.setTimeout(() => {
    showError('');
    clearInvalidState();
    if (hasExistingClients) setNewClientMode(false, { focus:false });
    else setNewClientMode(true, { focus:false });
    updateSummary();
  }, 0));

  restoreQuickEntryContext();
  loadClients();
  updateSummary();
})();