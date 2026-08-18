(() => {
  'use strict';

  const shell = document.getElementById('mission-detail-shell');
  const detailBody = document.getElementById('mission-detail-body');
  if (!shell || !detailBody) return;

  const db = window.supabase?.createClient ? window.supabase.createClient() : null;
  let dataChanged = false;
  let currentTripId = null;
  let currentClientId = null;
  let clientsCache = null;
  let enhancementBusy = false;
  let deletionBusy = false;

  const style = document.createElement('style');
  style.textContent = `
    #mission-detail-body.mission-edit-focus{
      display:block!important;
      padding-top:16px!important;
    }
    #mission-detail-body.mission-edit-focus > .detail-hero,
    #mission-detail-body.mission-edit-focus > .detail-kpis,
    #mission-detail-body.mission-edit-focus > .detail-card:not(#mission-edit-card){
      display:none!important;
    }
    #mission-detail-body.mission-edit-focus #mission-edit-card{
      display:block!important;
      margin:0!important;
      border-radius:16px!important;
      box-shadow:0 12px 30px rgba(31,48,73,.08)!important;
      animation:mission-edit-enter .16s ease-out;
    }
    #mission-detail-body.mission-edit-focus #mission-edit-card .detail-card-head{
      padding-bottom:13px;
      border-bottom:1px solid #e7ecf2;
    }
    #mission-detail-body.mission-edit-focus #mission-edit-card .detail-card-head:before{
      content:"Modification en cours";
      display:inline-flex;
      margin-bottom:8px;
      padding:5px 8px;
      border-radius:999px;
      background:#fff1df;
      color:#ad5b00;
      font-size:8px;
      font-weight:850;
      letter-spacing:.04em;
      text-transform:uppercase;
    }
    #mission-detail-body.mission-edit-focus .drawer-form{margin-top:14px}
    #mission-detail-body.mission-edit-focus .drawer-form-actions{
      position:sticky;
      bottom:0;
      margin:16px -1px -1px;
      padding:12px 1px 1px;
      background:linear-gradient(180deg,rgba(255,255,255,0),#fff 30%);
    }
    .mission-client-info strong{color:#294c6d!important}
    .mission-client-edit{grid-column:1/-1!important}
    .mission-client-edit select{
      width:100%;
      height:41px;
      margin-top:6px;
      border:1px solid #d8e0e9;
      border-radius:10px;
      background:#fff;
      padding:0 10px;
      font:inherit;
      color:#243449;
      outline:none;
    }
    .mission-client-edit select:focus{
      border-color:#f0a04a;
      box-shadow:0 0 0 4px rgba(255,139,20,.10);
    }
    @keyframes mission-edit-enter{
      from{opacity:.45;transform:translateY(5px)}
      to{opacity:1;transform:translateY(0)}
    }
  `;
  document.head.appendChild(style);

  const esc = (value) => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function editFormIsVisible() {
    const card = document.getElementById('mission-edit-card');
    return Boolean(card && card.hidden === false && card.querySelector('#mission-edit-form'));
  }

  function syncEditFocus() {
    const editing = editFormIsVisible();
    detailBody.classList.toggle('mission-edit-focus', editing);
    if (editing) {
      window.requestAnimationFrame(() => {
        detailBody.scrollTo?.({ top: 0, behavior: 'auto' });
        document.getElementById('detail-client')?.focus({ preventScroll: true });
      });
    }
  }

  function notify(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) {
      if (type === 'error') window.alert(message);
      return;
    }
    toast.textContent = message;
    toast.dataset.type = type;
    toast.classList.add('visible');
    window.setTimeout(() => toast.classList.remove('visible'), type === 'error' ? 5000 : 3000);
  }

  async function loadClients() {
    if (!db) return [];
    if (clientsCache) return clientsCache;
    const { data, error } = await db
      .from('clients')
      .select('id,company_name,is_active')
      .order('company_name', { ascending: true });
    if (error) {
      console.error('Clients fiche mission :', error);
      return [];
    }
    clientsCache = data || [];
    return clientsCache;
  }

  async function loadTripClient() {
    if (!db || !currentTripId) return null;
    const { data, error } = await db
      .from('trips')
      .select('client_id')
      .eq('id', currentTripId)
      .maybeSingle();
    if (error) {
      console.error('Client de la mission :', error);
      return null;
    }
    currentClientId = data?.client_id || null;
    return currentClientId;
  }

  async function enhanceClientDisplay() {
    if (enhancementBusy || !currentTripId || shell.hidden) return;
    const infoGrid = detailBody.querySelector('.detail-info-grid');
    if (!infoGrid || infoGrid.querySelector('.mission-client-info')) return;

    enhancementBusy = true;
    try {
      await loadTripClient();
      const clients = await loadClients();
      const linked = clients.find((item) => String(item.id) === String(currentClientId));
      const block = document.createElement('div');
      block.className = 'detail-info mission-client-info';
      block.innerHTML = `<span>Client</span><strong>${esc(linked?.company_name || (currentClientId ? 'Client indisponible' : 'Non renseigné'))}</strong>`;
      infoGrid.prepend(block);
    } finally {
      enhancementBusy = false;
    }
  }

  async function enhanceEditForm() {
    const form = document.getElementById('mission-edit-form');
    if (!form || form.querySelector('#detail-client')) return;

    await loadTripClient();
    const clients = await loadClients();
    const label = document.createElement('label');
    label.className = 'mission-client-edit';
    const options = clients
      .filter((item) => item.is_active !== false || String(item.id) === String(currentClientId))
      .map((item) => `<option value="${esc(item.id)}" ${String(item.id) === String(currentClientId) ? 'selected' : ''}>${esc(item.company_name)}</option>`)
      .join('');
    label.innerHTML = `Client<select id="detail-client"><option value="">Non renseigné</option>${options}</select>`;
    form.prepend(label);
  }

  async function saveClientLink() {
    if (!db || !currentTripId) return;
    const select = document.getElementById('detail-client');
    if (!select) return;
    const nextClientId = select.value || null;
    if (String(nextClientId || '') === String(currentClientId || '')) return;
    const { error } = await db
      .from('trips')
      .update({ client_id: nextClientId })
      .eq('id', currentTripId);
    if (error) {
      console.error('Modification client mission :', error);
      return;
    }
    currentClientId = nextClientId;
    dataChanged = true;
  }

  async function linkedBillingDocuments(tripId) {
    const { data: links, error: linkError } = await db
      .from('invoice_trips')
      .select('invoice_id')
      .eq('trip_id', tripId);
    if (linkError) throw linkError;
    const invoiceIds = [...new Set((links || []).map(item => item.invoice_id).filter(Boolean))];
    if (!invoiceIds.length) return [];

    const { data: invoices, error: invoiceError } = await db
      .from('invoices')
      .select('id,invoice_number,status')
      .in('id', invoiceIds);
    if (invoiceError) throw invoiceError;
    return invoices || [];
  }

  async function deleteMissionSafely(event) {
    const button = event.target.closest('#delete-mission-button');
    if (!button || !currentTripId || !db || deletionBusy) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    deletionBusy = true;
    const initialLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Vérification…';

    try {
      const documents = await linkedBillingDocuments(currentTripId);
      if (documents.length) {
        const labels = documents.map(item => item.invoice_number || 'document de facturation').join(', ');
        const statusText = documents.some(item => item.status && item.status !== 'cancelled')
          ? 'La mission ne peut pas être supprimée tant que ce document existe.'
          : 'La mission reste liée à un document de facturation.';
        notify(`Suppression bloquée : cette mission est liée à ${labels}. ${statusText}`, 'error');
        window.alert(`Cette mission est déjà liée à ${labels}.\n\nPour protéger la facturation, Nexis ne la supprime pas directement. Supprimez ou détachez d’abord le document concerné depuis Facturation, puis revenez supprimer la mission.`);
        return;
      }

      if (!window.confirm('Supprimer définitivement cette mission et ses dépenses ?')) return;

      const { error: expenseError } = await db
        .from('trip_expenses')
        .delete()
        .eq('trip_id', currentTripId);
      if (expenseError) throw expenseError;

      const { data: deletedTrips, error: tripError } = await db
        .from('trips')
        .delete()
        .eq('id', currentTripId)
        .select('id');
      if (tripError) throw tripError;

      if (!deletedTrips?.length) {
        throw new Error('DELETE_NOT_ALLOWED');
      }

      dataChanged = true;
      notify('Mission supprimée.');
      shell.hidden = true;
      document.body.style.overflow = '';
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      console.error('Suppression sécurisée mission :', error);
      if (error?.message === 'DELETE_NOT_ALLOWED') {
        notify('Suppression refusée. Seul un administrateur de cette entreprise peut supprimer une mission.', 'error');
      } else {
        notify(`Impossible de supprimer la mission${error?.message ? ` : ${error.message}` : '.'}`, 'error');
      }
    } finally {
      deletionBusy = false;
      button.disabled = false;
      button.textContent = initialLabel;
    }
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-mission]');
    if (opener) {
      currentTripId = opener.dataset.openMission || null;
      currentClientId = null;
      window.setTimeout(enhanceClientDisplay, 100);
      return;
    }

    if (event.target.closest('#edit-mission-button')) {
      window.setTimeout(() => {
        enhanceEditForm();
        syncEditFocus();
      }, 0);
    }

    if (event.target.closest('#cancel-mission-edit')) {
      window.setTimeout(syncEditFocus, 0);
    }
  }, true);

  document.addEventListener('click', deleteMissionSafely, true);

  shell.addEventListener('submit', (event) => {
    if (event.target.matches('#mission-edit-form')) {
      saveClientLink();
      dataChanged = true;
      window.setTimeout(syncEditFocus, 0);
    } else if (event.target.matches('#expense-detail-form')) {
      dataChanged = true;
      window.setTimeout(syncEditFocus, 0);
    }
  }, true);

  new MutationObserver(() => {
    syncEditFocus();
    if (!shell.hidden) {
      window.setTimeout(enhanceClientDisplay, 0);
      if (editFormIsVisible()) window.setTimeout(enhanceEditForm, 0);
    }
  }).observe(detailBody, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden']
  });

  function reloadIfNeeded() {
    if (!dataChanged) return;
    const activeView = location.hash || '#trips';
    sessionStorage.setItem('nexis-last-view', activeView);
    window.setTimeout(() => {
      if (location.hash !== activeView) history.replaceState(null, '', activeView);
      window.location.reload();
    }, 120);
  }

  document.querySelectorAll('[data-close-mission-detail]').forEach((button) => {
    button.addEventListener('click', reloadIfNeeded, true);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !shell.hidden) reloadIfNeeded();
  });
})();