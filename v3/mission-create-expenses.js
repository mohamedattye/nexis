(() => {
  'use strict';

  const form = document.getElementById('mission-form');
  const legacySubmit = document.getElementById('mission-submit');
  const errorBox = document.getElementById('mission-form-error');
  const formActions = form?.querySelector('.form-actions');
  if (!form || !legacySubmit || !formActions || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let saving = false;

  const titleText = document.querySelector('.simple-form-title p');
  if (titleText) titleText.textContent = 'Mission et dépenses sur un seul écran. Les frais restent facultatifs.';

  const pageText = document.querySelector('.simple-mission-head p');
  if (pageText) pageText.textContent = 'Saisissez toute l’opération puis enregistrez en un seul clic.';

  const style = document.createElement('style');
  style.textContent = `
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
    @media(max-width:1000px){.quick-expense-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:740px){.quick-expense-grid,.quick-advanced-grid,.quick-summary{grid-template-columns:1fr}.quick-section-head{align-items:flex-start}.simple-form .form-actions{align-items:stretch}}
  `;
  document.head.appendChild(style);

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
  const dateInput = document.getElementById('mission-date');
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

  function setSavingState(active, label = '') {
    submitButtons.forEach((button) => {
      button.disabled = active;
      if (active) {
        button.dataset.originalLabel = button.textContent;
        button.textContent = label || 'Enregistrement…';
      } else if (button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
        delete button.dataset.originalLabel;
      }
    });
  }

  function restoreQuickEntryContext() {
    const saved = sessionStorage.getItem('nexisQuickEntryContext');
    if (!saved) return;

    let context;
    try {
      context = JSON.parse(saved);
    } catch {
      sessionStorage.removeItem('nexisQuickEntryContext');
      return;
    }

    if (context.date && dateInput) dateInput.value = context.date;

    const applyTruck = () => {
      if (!context.truck || !truckInput) return true;
      const exists = [...truckInput.options].some((option) => option.value === context.truck);
      if (!exists) return false;
      truckInput.value = context.truck;
      sessionStorage.removeItem('nexisQuickEntryContext');
      return true;
    };

    if (!applyTruck()) {
      const observer = new MutationObserver(() => {
        if (applyTruck()) observer.disconnect();
      });
      observer.observe(truckInput, { childList: true });
      window.setTimeout(() => observer.disconnect(), 5000);
    }
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
      truck: truckInput?.value.trim().toUpperCase(),
      date: dateInput?.value,
      loadingZone: document.getElementById('mission-loading-zone')?.value.trim(),
      unloadingZone: document.getElementById('mission-unloading-zone')?.value.trim(),
      revenue: numberValue(revenueInput)
    };

    if (!mission.truck || !mission.date || !mission.loadingZone || !mission.unloadingZone || revenueRaw === '') {
      showError('Veuillez compléter le camion, la date, le trajet et le montant facturé.');
      return;
    }

    saving = true;
    showError('');
    setSavingState(true);
    let insertedTrip = false;

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
      showError("Impossible d'enregistrer la mission. Aucune donnée partielle n'a été conservée.");
    } finally {
      saving = false;
      if (!document.hidden) setSavingState(false);
    }
  }

  [...Object.values(expenseInputs), revenueInput].forEach((input) => input?.addEventListener('input', updateSummary));
  form.addEventListener('submit', handleSubmit, true);
  form.addEventListener('reset', () => window.setTimeout(() => {
    showError('');
    updateSummary();
  }, 0));

  restoreQuickEntryContext();
  updateSummary();
})();