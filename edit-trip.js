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
    .trip-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .edit-btn {
      border: 1px solid #b9d1ff;
      background: #eef5ff;
      color: #1761c9;
      border-radius: 10px;
      padding: 9px 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .edit-btn:hover { background: #deebff; }
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
      if (!cell || cell.querySelector('[data-edit-trip-id]')) return;

      cell.classList.add('trip-actions');
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'edit-btn';
      editButton.dataset.editTripId = deleteButton.dataset.tripId;
      editButton.textContent = 'Modifier';
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
