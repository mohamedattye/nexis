(() => {
  const form = document.getElementById('trip-form');
  const table = document.getElementById('trip-table-body');

  if (!form || !table) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const formTitle = form.closest('.card')?.querySelector('h2');
  const defaultTitle = formTitle?.textContent || 'Nouvelle course';
  const defaultSubmitLabel = submitButton?.textContent || 'Ajouter';

  let editingTripId = null;
  let isUpdatingTrip = false;

  const style = document.createElement('style');
  style.textContent = `
    .trip-actions {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      flex-wrap: nowrap;
      white-space: nowrap;
    }

    .trip-actions .edit-btn,
    .trip-actions .delete-btn {
      width: 34px;
      height: 34px;
      min-width: 34px;
      padding: 0;
      border-radius: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: none;
      transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
    }

    .trip-actions .edit-btn {
      border: 1px solid #d5e2f5;
      background: #f7faff;
      color: #2563b9;
    }

    .trip-actions .delete-btn {
      border: 1px solid #f0d5d5;
      background: #fff9f9;
      color: #c93b3b;
    }

    .trip-actions .edit-btn:hover {
      background: #edf4ff;
      border-color: #b9cff0;
      transform: translateY(-1px);
    }

    .trip-actions .delete-btn:hover {
      background: #fff0f0;
      border-color: #e8bcbc;
      transform: translateY(-1px);
    }

    .trip-actions button svg {
      width: 16px;
      height: 16px;
      pointer-events: none;
    }

    .cancel-edit-btn {
      border: 1px solid #d8dee9;
      background: #fff;
      color: #44516a;
      border-radius: 10px;
      padding: 12px 18px;
      font-weight: 700;
      cursor: pointer;
    }

    .editing-notice {
      grid-column: 1 / -1;
      background: #eef5ff;
      border: 1px solid #c8dcff;
      color: #174f9f;
      border-radius: 12px;
      padding: 11px 14px;
      font-weight: 700;
    }
  `;
  document.head.appendChild(style);

  const editIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0 0-3L17.8 5a2.1 2.1 0 0 0-3 0L4 15.8V20Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m13.7 6.1 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

  const deleteIcon = `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'cancel-edit-btn';
  cancelButton.textContent = 'Annuler';
  cancelButton.hidden = true;
  submitButton?.insertAdjacentElement('afterend', cancelButton);

  const notice = document.createElement('div');
  notice.className = 'editing-notice';
  notice.hidden = true;
  notice.textContent = 'Modification d’une course existante';
  form.prepend(notice);

  function resetEditMode() {
    editingTripId = null;
    form.reset();
    notice.hidden = true;
    cancelButton.hidden = true;
    if (formTitle) formTitle.textContent = defaultTitle;
    if (submitButton) {
      submitButton.textContent = defaultSubmitLabel;
      submitButton.disabled = false;
    }
  }

  function startEdit(tripId) {
    const trip = trips.find((item) => String(item.id) === String(tripId));
    if (!trip) {
      alert('Cette course est introuvable. Actualisez la page puis réessayez.');
      return;
    }

    editingTripId = String(trip.id);
    document.getElementById('truck').value = trip.truck || '';
    document.getElementById('date').value = trip.date || '';
    document.getElementById('loading-zone').value = trip.loadingZone || '';
    document.getElementById('unloading-zone').value = trip.unloadingZone || '';
    document.getElementById('revenue').value = Number(trip.revenue || 0);

    notice.hidden = false;
    cancelButton.hidden = false;
    if (formTitle) formTitle.textContent = 'Modifier la course';
    if (submitButton) submitButton.textContent = 'Enregistrer les modifications';

    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('truck').focus();
  }

  function addEditButtons() {
    table.querySelectorAll('button.delete-btn[data-trip-id]').forEach((deleteButton) => {
      const cell = deleteButton.closest('td');
      if (!cell) return;

      cell.classList.add('trip-actions');
      deleteButton.innerHTML = deleteIcon;
      deleteButton.title = 'Supprimer la course';
      deleteButton.setAttribute('aria-label', 'Supprimer la course');

      if (cell.querySelector('[data-edit-trip-id]')) return;

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'edit-btn';
      editButton.dataset.editTripId = deleteButton.dataset.tripId;
      editButton.innerHTML = editIcon;
      editButton.title = 'Modifier la course';
      editButton.setAttribute('aria-label', 'Modifier la course');
      cell.insertBefore(editButton, deleteButton);
    });
  }

  table.addEventListener('click', (event) => {
    const editButton = event.target.closest('button[data-edit-trip-id]');
    if (!editButton) return;
    event.preventDefault();
    event.stopPropagation();
    startEdit(editButton.dataset.editTripId);
  }, true);

  cancelButton.addEventListener('click', resetEditMode);

  form.addEventListener('submit', async (event) => {
    if (!editingTripId) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (isUpdatingTrip) return;

    const updatedTrip = {
      truck: document.getElementById('truck').value.trim(),
      date: document.getElementById('date').value,
      loadingZone: document.getElementById('loading-zone').value.trim(),
      unloadingZone: document.getElementById('unloading-zone').value.trim(),
      revenue: Number(document.getElementById('revenue').value)
    };

    if (
      !updatedTrip.truck ||
      !updatedTrip.date ||
      !updatedTrip.loadingZone ||
      !updatedTrip.unloadingZone ||
      Number.isNaN(updatedTrip.revenue)
    ) {
      alert('Veuillez remplir correctement tous les champs de la course.');
      return;
    }

    const duplicateExists = trips.some((trip) =>
      String(trip.id) !== String(editingTripId) &&
      String(trip.truck || '').trim().toUpperCase() === updatedTrip.truck.toUpperCase() &&
      String(trip.date || '') === updatedTrip.date &&
      String(trip.loadingZone || '').trim().toUpperCase() === updatedTrip.loadingZone.toUpperCase() &&
      String(trip.unloadingZone || '').trim().toUpperCase() === updatedTrip.unloadingZone.toUpperCase() &&
      Number(trip.revenue || 0) === updatedTrip.revenue
    );

    if (duplicateExists) {
      alert('Une autre course identique existe déjà.');
      return;
    }

    isUpdatingTrip = true;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Modification...';
    }

    try {
      const { data, error } = await supabaseClient
        .from('trips')
        .update(updatedTrip)
        .eq('id', editingTripId)
        .select()
        .single();

      if (error) throw error;

      const { error: expenseError } = await supabaseClient
        .from('trip_expenses')
        .update({
          truck: updatedTrip.truck,
          date: updatedTrip.date,
          loadingZone: updatedTrip.loadingZone,
          unloadingZone: updatedTrip.unloadingZone
        })
        .eq('trip_id', editingTripId);

      if (expenseError) {
        console.warn('Course modifiée, mais synchronisation des dépenses incomplète :', expenseError);
      }

      trips = trips.map((trip) =>
        String(trip.id) === String(editingTripId)
          ? { ...trip, ...(data || updatedTrip) }
          : trip
      );

      tripExpenses = tripExpenses.map((expense) =>
        String(expense.trip_id) === String(editingTripId)
          ? {
              ...expense,
              truck: updatedTrip.truck,
              date: updatedTrip.date,
              loadingZone: updatedTrip.loadingZone,
              unloadingZone: updatedTrip.unloadingZone
            }
          : expense
      );

      resetEditMode();
      render();
      alert('La course a été modifiée avec succès.');
    } catch (error) {
      console.error('Erreur modification course :', error);
      alert('Impossible de modifier cette course. Veuillez réessayer.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Enregistrer les modifications';
      }
    } finally {
      isUpdatingTrip = false;
    }
  }, true);

  const observer = new MutationObserver(addEditButtons);
  observer.observe(table, { childList: true, subtree: true });
  addEditButtons();
})();
