(() => {
  'use strict';

  const form = document.getElementById('mission-form');
  const submitButton = document.getElementById('mission-submit');
  const errorBox = document.getElementById('mission-form-error');
  if (!form || !submitButton || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  let saving = false;

  const style = document.createElement('style');
  style.textContent = `
    .creation-expenses{grid-column:1/-1;border:1px solid #e1e7ef;border-radius:9px;background:#fbfcfe;overflow:hidden}
    .creation-expenses summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 14px;cursor:pointer;font-size:11px;font-weight:800;color:#2e3d52}
    .creation-expenses summary::-webkit-details-marker{display:none}
    .creation-expenses summary:after{content:'+';width:25px;height:25px;display:grid;place-items:center;border-radius:7px;background:#fff3e4;color:#c56b00;font-size:16px}
    .creation-expenses[open] summary:after{content:'−'}
    .creation-expenses summary span{display:block;font-size:10px;font-weight:500;color:#7b8594;margin-top:3px}
    .creation-expense-body{padding:0 14px 14px;border-top:1px solid #edf0f4}
    .creation-expense-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;padding-top:13px}
    .creation-expense-grid label{font-size:10px!important}
    .creation-expense-grid input{height:39px!important;margin-top:5px!important}
    .creation-expense-summary{display:flex;justify-content:flex-end;gap:22px;margin-top:12px;padding-top:11px;border-top:1px solid #edf0f4}
    .creation-expense-summary span,.creation-expense-summary strong{display:block;text-align:right}
    .creation-expense-summary span{font-size:9px;color:#7b8594;text-transform:uppercase;letter-spacing:.06em;font-weight:750}
    .creation-expense-summary strong{margin-top:4px;font-size:13px;color:#243449}
    .creation-expense-summary .margin strong{color:#07845d}
    @media(max-width:740px){.creation-expense-grid{grid-template-columns:1fr}.creation-expense-summary{justify-content:space-between}.creation-expense-summary span,.creation-expense-summary strong{text-align:left}}
  `;
  document.head.appendChild(style);

  const details = document.createElement('details');
  details.className = 'creation-expenses';
  details.innerHTML = `
    <summary>
      <div>Dépenses de départ <span>Facultatif — carburant, ration, péage et autres frais.</span></div>
    </summary>
    <div class="creation-expense-body">
      <div class="creation-expense-grid">
        <label>Kilométrage<input id="create-expense-km" type="number" min="0" step="1" value="0" /></label>
        <label>Consommation / 100 km<input id="create-expense-consumption" type="number" min="0" step="0.1" value="0" /></label>
        <label>Carburant (FCFA)<input id="create-expense-fuel" type="number" min="0" step="100" value="0" /></label>
        <label>Ration (FCFA)<input id="create-expense-ration" type="number" min="0" step="100" value="0" /></label>
        <label>Rapido / péage (FCFA)<input id="create-expense-rapido" type="number" min="0" step="100" value="0" /></label>
        <label>Manœuvre (FCFA)<input id="create-expense-manoeuvre" type="number" min="0" step="100" value="0" /></label>
        <label>Autres frais (FCFA)<input id="create-expense-misc" type="number" min="0" step="100" value="0" /></label>
      </div>
      <div class="creation-expense-summary">
        <div><span>Total dépenses</span><strong id="create-expense-total">0 FCFA</strong></div>
        <div class="margin"><span>Marge estimée</span><strong id="create-margin-preview">0 FCFA</strong></div>
      </div>
    </div>`;

  const formActions = form.querySelector('.form-actions');
  form.insertBefore(details, errorBox || formActions);

  const ids = ['km', 'consumption', 'fuel', 'ration', 'rapido', 'manoeuvre', 'misc'];
  const expenseInputs = Object.fromEntries(ids.map((key) => [key, document.getElementById(`create-expense-${key}`)]));
  const totalLabel = document.getElementById('create-expense-total');
  const marginLabel = document.getElementById('create-margin-preview');
  const revenueInput = document.getElementById('mission-revenue');

  function numberValue(input) {
    const value = Number(input?.value || 0);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function expenseValues() {
    return Object.fromEntries(ids.map((key) => [key, numberValue(expenseInputs[key])]));
  }

  function expenseTotal(values = expenseValues()) {
    return ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc']
      .reduce((sum, key) => sum + Number(values[key] || 0), 0);
  }

  function money(value) {
    return `${formatter.format(Number(value) || 0)} FCFA`;
  }

  function updatePreview() {
    const total = expenseTotal();
    const revenue = numberValue(revenueInput);
    totalLabel.textContent = money(total);
    marginLabel.textContent = money(revenue - total);
    marginLabel.style.color = revenue - total < 0 ? '#bd3d44' : '#07845d';
  }

  [...Object.values(expenseInputs), revenueInput].forEach((input) => input?.addEventListener('input', updatePreview));
  updatePreview();

  function showError(message = '') {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (saving) return;

    const mission = {
      id: crypto.randomUUID(),
      submission_token: crypto.randomUUID(),
      truck: document.getElementById('mission-truck')?.value.trim().toUpperCase(),
      date: document.getElementById('mission-date')?.value,
      loadingZone: document.getElementById('mission-loading-zone')?.value.trim(),
      unloadingZone: document.getElementById('mission-unloading-zone')?.value.trim(),
      revenue: numberValue(revenueInput)
    };

    if (!mission.truck || !mission.date || !mission.loadingZone || !mission.unloadingZone || mission.revenue < 0) {
      showError('Veuillez compléter correctement le camion, la date, le trajet et le montant.');
      return;
    }

    saving = true;
    showError('');
    submitButton.disabled = true;
    submitButton.textContent = 'Enregistrement…';

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

      const values = expenseValues();
      const shouldCreateExpense = expenseTotal(values) > 0 || values.km > 0 || values.consumption > 0;

      if (shouldCreateExpense) {
        const expense = {
          id: crypto.randomUUID(),
          trip_id: mission.id,
          truck: mission.truck,
          date: mission.date,
          loadingZone: mission.loadingZone,
          unloadingZone: mission.unloadingZone,
          ...values
        };
        const { error: expenseError } = await client.from('trip_expenses').insert([expense]);
        if (expenseError) throw expenseError;
      }

      submitButton.textContent = 'Mission enregistrée';
      window.setTimeout(() => {
        window.location.replace(`${window.location.pathname}${window.location.search}#trips`);
        window.location.reload();
      }, 450);
    } catch (error) {
      console.error('Erreur création mission et dépenses :', error);
      if (insertedTrip) await client.from('trips').delete().eq('id', mission.id);
      showError("Impossible d'enregistrer la mission. Aucune donnée partielle n'a été conservée.");
    } finally {
      saving = false;
      if (submitButton.textContent !== 'Mission enregistrée') {
        submitButton.disabled = false;
        submitButton.textContent = 'Enregistrer la mission';
      }
    }
  }

  form.addEventListener('submit', handleSubmit, true);
  form.addEventListener('reset', () => window.setTimeout(updatePreview, 0));
})();