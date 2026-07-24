(() => {
  'use strict';

  const SUPABASE_URL = 'https://ifspadsghwizzjofcscf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_XN7xuh4te5IypVwI0UySvg_A9qCUlTK';
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const formatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  const shell = document.getElementById('mission-detail-shell');
  const body = document.getElementById('mission-detail-body');
  const title = document.getElementById('mission-detail-title');
  if (!client || !shell || !body || !title) return;

  let currentTrip = null;
  let currentExpenses = [];
  let editingExpenseId = null;

  const money = (value) => `${formatter.format(Number(value) || 0)} FCFA`;
  const formatDate = (value) => {
    if (!value) return '—';
    const [year, month, day] = String(value).split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  };
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const expenseTotal = (expense) => ['fuel', 'ration', 'rapido', 'manoeuvre', 'misc']
    .reduce((sum, key) => sum + (Number(expense?.[key]) || 0), 0);

  function openShell() {
    shell.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeShell() {
    shell.hidden = true;
    document.body.style.overflow = '';
    currentTrip = null;
    currentExpenses = [];
    editingExpenseId = null;
  }

  function notify(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('visible');
    window.setTimeout(() => toast.classList.remove('visible'), 3000);
  }

  async function loadMission(tripId) {
    openShell();
    title.textContent = 'Chargement…';
    body.innerHTML = '<div class="drawer-loading">Chargement de la mission…</div>';

    try {
      const [{ data: trip, error: tripError }, { data: expenses, error: expenseError }] = await Promise.all([
        client.from('trips').select('*').eq('id', tripId).single(),
        client.from('trip_expenses').select('*').eq('trip_id', tripId).order('date', { ascending: false })
      ]);
      if (tripError) throw tripError;
      if (expenseError) throw expenseError;
      currentTrip = trip;
      currentExpenses = expenses || [];
      editingExpenseId = null;
      renderMission();
    } catch (error) {
      console.error('Erreur fiche mission :', error);
      title.textContent = 'Mission indisponible';
      body.innerHTML = '<div class="drawer-loading">Impossible de charger cette mission.</div>';
    }
  }

  function renderMission() {
    if (!currentTrip) return;
    const expenses = currentExpenses.reduce((sum, item) => sum + expenseTotal(item), 0);
    const revenue = Number(currentTrip.revenue) || 0;
    const margin = revenue - expenses;
    title.textContent = `${currentTrip.truck || 'Mission'} · ${currentTrip.loadingZone || '—'} → ${currentTrip.unloadingZone || '—'}`;

    body.innerHTML = `
      <section class="detail-hero">
        <div><small>Mission du ${formatDate(currentTrip.date)}</small><h3>${escapeHtml(currentTrip.loadingZone || '—')} → ${escapeHtml(currentTrip.unloadingZone || '—')}</h3></div>
        <span class="status">Enregistrée</span>
      </section>

      <div class="detail-kpis">
        <article class="detail-kpi"><span>Montant facturé</span><strong>${money(revenue)}</strong></article>
        <article class="detail-kpi"><span>Dépenses</span><strong>${money(expenses)}</strong></article>
        <article class="detail-kpi ${margin < 0 ? 'loss' : 'profit'}"><span>Marge</span><strong>${money(margin)}</strong></article>
      </div>

      <section class="detail-card">
        <div class="detail-card-head"><div><h3>Informations</h3><p>Données principales de la mission.</p></div><button class="secondary" type="button" id="edit-mission-button">Modifier</button></div>
        <div class="detail-info-grid">
          <div class="detail-info"><span>Camion</span><strong>${escapeHtml(currentTrip.truck || '—')}</strong></div>
          <div class="detail-info"><span>Date</span><strong>${formatDate(currentTrip.date)}</strong></div>
          <div class="detail-info"><span>Chargement</span><strong>${escapeHtml(currentTrip.loadingZone || '—')}</strong></div>
          <div class="detail-info"><span>Déchargement</span><strong>${escapeHtml(currentTrip.unloadingZone || '—')}</strong></div>
        </div>
        <div class="detail-actions"><button class="detail-danger" type="button" id="delete-mission-button">Supprimer la mission</button></div>
      </section>

      <section class="detail-card" id="mission-edit-card" hidden></section>

      <section class="detail-card">
        <div class="detail-card-head"><div><h3>Dépenses de la mission</h3><p>Carburant, ration, Rapido, manœuvre et autres frais.</p></div><button class="primary" type="button" id="add-expense-button">Ajouter une dépense</button></div>
        <div id="expense-list">${renderExpenseTable()}</div>
      </section>

      <section class="detail-card" id="expense-form-card" hidden></section>
    `;

    bindMissionActions();
  }

  function renderExpenseTable() {
    if (!currentExpenses.length) return '<div class="expense-empty">Aucune dépense enregistrée pour cette mission.</div>';
    return `
      <div class="expense-table-wrap"><table class="expense-table">
        <thead><tr><th>Carburant</th><th>Ration</th><th>Rapido</th><th>Manœuvre</th><th>Autres</th><th>Total</th><th></th></tr></thead>
        <tbody>${currentExpenses.map((expense) => `
          <tr>
            <td>${money(expense.fuel)}</td><td>${money(expense.ration)}</td><td>${money(expense.rapido)}</td><td>${money(expense.manoeuvre)}</td><td>${money(expense.misc)}</td>
            <td><strong>${money(expenseTotal(expense))}</strong></td>
            <td><div class="expense-actions"><button class="mini-action" type="button" data-edit-expense="${escapeHtml(expense.id)}">Modifier</button><button class="mini-action danger" type="button" data-delete-expense="${escapeHtml(expense.id)}">Supprimer</button></div></td>
          </tr>`).join('')}</tbody>
      </table></div>`;
  }

  function bindMissionActions() {
    document.getElementById('edit-mission-button')?.addEventListener('click', showMissionEditForm);
    document.getElementById('delete-mission-button')?.addEventListener('click', deleteMission);
    document.getElementById('add-expense-button')?.addEventListener('click', () => showExpenseForm());
    document.querySelectorAll('[data-edit-expense]').forEach((button) => button.addEventListener('click', () => {
      const expense = currentExpenses.find((item) => String(item.id) === String(button.dataset.editExpense));
      showExpenseForm(expense);
    }));
    document.querySelectorAll('[data-delete-expense]').forEach((button) => button.addEventListener('click', () => deleteExpense(button.dataset.deleteExpense)));
  }

  function showMissionEditForm() {
    const card = document.getElementById('mission-edit-card');
    card.hidden = false;
    card.innerHTML = `
      <div class="detail-card-head"><div><h3>Modifier la mission</h3><p>Les dépenses liées garderont la même mission.</p></div></div>
      <form class="drawer-form" id="mission-edit-form">
        <label>Camion<input id="detail-truck" value="${escapeHtml(currentTrip.truck || '')}" required /></label>
        <label>Date<input id="detail-date" type="date" value="${escapeHtml(currentTrip.date || '')}" required /></label>
        <label>Chargement<input id="detail-loading" value="${escapeHtml(currentTrip.loadingZone || '')}" required /></label>
        <label>Déchargement<input id="detail-unloading" value="${escapeHtml(currentTrip.unloadingZone || '')}" required /></label>
        <label class="full">Montant facturé<input id="detail-revenue" type="number" min="0" value="${Number(currentTrip.revenue) || 0}" required /></label>
        <p class="drawer-form-error" id="mission-edit-error" hidden></p>
        <div class="drawer-form-actions"><button class="secondary" type="button" id="cancel-mission-edit">Annuler</button><button class="primary" type="submit">Enregistrer</button></div>
      </form>`;
    document.getElementById('cancel-mission-edit')?.addEventListener('click', () => { card.hidden = true; });
    document.getElementById('mission-edit-form')?.addEventListener('submit', saveMissionChanges);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveMissionChanges(event) {
    event.preventDefault();
    const errorBox = document.getElementById('mission-edit-error');
    const updated = {
      truck: document.getElementById('detail-truck').value.trim().toUpperCase(),
      date: document.getElementById('detail-date').value,
      loadingZone: document.getElementById('detail-loading').value.trim(),
      unloadingZone: document.getElementById('detail-unloading').value.trim(),
      revenue: Number(document.getElementById('detail-revenue').value)
    };
    if (!updated.truck || !updated.date || !updated.loadingZone || !updated.unloadingZone || !Number.isFinite(updated.revenue) || updated.revenue < 0) {
      errorBox.hidden = false;
      errorBox.textContent = 'Veuillez compléter correctement tous les champs.';
      return;
    }
    try {
      const { data, error } = await client.from('trips').update(updated).eq('id', currentTrip.id).select().single();
      if (error) throw error;
      const { error: expenseError } = await client.from('trip_expenses').update({
        truck: updated.truck, date: updated.date, loadingZone: updated.loadingZone, unloadingZone: updated.unloadingZone
      }).eq('trip_id', currentTrip.id);
      if (expenseError) console.warn('Synchronisation dépenses incomplète :', expenseError);
      currentTrip = data || { ...currentTrip, ...updated };
      notify('Mission modifiée avec succès.');
      renderMission();
    } catch (error) {
      console.error('Erreur modification mission :', error);
      errorBox.hidden = false;
      errorBox.textContent = 'Impossible de modifier la mission.';
    }
  }

  function showExpenseForm(expense = null) {
    editingExpenseId = expense?.id || null;
    const card = document.getElementById('expense-form-card');
    card.hidden = false;
    card.innerHTML = `
      <div class="detail-card-head"><div><h3>${expense ? 'Modifier la dépense' : 'Ajouter une dépense'}</h3><p>Les champs non utilisés peuvent rester à zéro.</p></div></div>
      <form class="drawer-form" id="expense-detail-form">
        <label>Kilométrage<input id="expense-km" type="number" min="0" value="${Number(expense?.km) || 0}" /></label>
        <label>Consommation / 100 km<input id="expense-consumption" type="number" min="0" step="0.1" value="${Number(expense?.consumption) || 0}" /></label>
        <label>Carburant<input id="expense-fuel" type="number" min="0" value="${Number(expense?.fuel) || 0}" /></label>
        <label>Ration<input id="expense-ration" type="number" min="0" value="${Number(expense?.ration) || 0}" /></label>
        <label>Rapido / péage<input id="expense-rapido" type="number" min="0" value="${Number(expense?.rapido) || 0}" /></label>
        <label>Manœuvre<input id="expense-manoeuvre" type="number" min="0" value="${Number(expense?.manoeuvre) || 0}" /></label>
        <label class="full">Autres frais<input id="expense-misc" type="number" min="0" value="${Number(expense?.misc) || 0}" /></label>
        <p class="drawer-form-error" id="expense-form-error" hidden></p>
        <div class="drawer-form-actions"><button class="secondary" type="button" id="cancel-expense-form">Annuler</button><button class="primary" type="submit">Enregistrer</button></div>
      </form>`;
    document.getElementById('cancel-expense-form')?.addEventListener('click', () => { card.hidden = true; editingExpenseId = null; });
    document.getElementById('expense-detail-form')?.addEventListener('submit', saveExpense);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function saveExpense(event) {
    event.preventDefault();
    const errorBox = document.getElementById('expense-form-error');
    const values = {
      trip_id: currentTrip.id,
      truck: currentTrip.truck,
      date: currentTrip.date,
      loadingZone: currentTrip.loadingZone || null,
      unloadingZone: currentTrip.unloadingZone || null,
      km: Number(document.getElementById('expense-km').value) || 0,
      consumption: Number(document.getElementById('expense-consumption').value) || 0,
      fuel: Number(document.getElementById('expense-fuel').value) || 0,
      ration: Number(document.getElementById('expense-ration').value) || 0,
      rapido: Number(document.getElementById('expense-rapido').value) || 0,
      manoeuvre: Number(document.getElementById('expense-manoeuvre').value) || 0,
      misc: Number(document.getElementById('expense-misc').value) || 0
    };
    try {
      let response;
      if (editingExpenseId) response = await client.from('trip_expenses').update(values).eq('id', editingExpenseId).select().single();
      else response = await client.from('trip_expenses').insert([{ id: crypto.randomUUID(), ...values }]).select().single();
      if (response.error) throw response.error;
      if (editingExpenseId) currentExpenses = currentExpenses.map((item) => String(item.id) === String(editingExpenseId) ? response.data : item);
      else currentExpenses.push(response.data);
      notify(editingExpenseId ? 'Dépense modifiée.' : 'Dépense ajoutée.');
      editingExpenseId = null;
      renderMission();
    } catch (error) {
      console.error('Erreur dépense :', error);
      errorBox.hidden = false;
      errorBox.textContent = "Impossible d'enregistrer cette dépense.";
    }
  }

  async function deleteExpense(expenseId) {
    if (!window.confirm('Supprimer définitivement cette dépense ?')) return;
    try {
      const { error } = await client.from('trip_expenses').delete().eq('id', expenseId);
      if (error) throw error;
      currentExpenses = currentExpenses.filter((item) => String(item.id) !== String(expenseId));
      notify('Dépense supprimée.');
      renderMission();
    } catch (error) {
      console.error('Erreur suppression dépense :', error);
      notify('Impossible de supprimer cette dépense.', 'error');
    }
  }

  async function deleteMission() {
    const first = window.confirm('Voulez-vous supprimer cette mission et toutes ses dépenses ?');
    if (!first) return;
    const second = window.confirm('Cette action est définitive. Confirmer la suppression ?');
    if (!second) return;
    try {
      const { error: expenseError } = await client.from('trip_expenses').delete().eq('trip_id', currentTrip.id);
      if (expenseError) throw expenseError;
      const { error: tripError } = await client.from('trips').delete().eq('id', currentTrip.id);
      if (tripError) throw tripError;
      notify('Mission supprimée.');
      closeShell();
      window.setTimeout(() => window.location.reload(), 400);
    } catch (error) {
      console.error('Erreur suppression mission :', error);
      notify('Impossible de supprimer cette mission.', 'error');
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-open-mission]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    loadMission(button.dataset.openMission);
  }, true);

  document.querySelectorAll('[data-close-mission-detail]').forEach((button) => button.addEventListener('click', closeShell));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !shell.hidden) closeShell(); });
})();