(() => {
  const form = document.getElementById('trip-form');
  if (!form) return;

  const submitButton = form.querySelector('button[type="submit"]');
  let isFastSaving = false;

  try {
    let cachedExpensesReference = null;
    let cachedExpensesLength = -1;
    let expenseTotals = new Map();

    getTripExpenseTotal = (tripId) => {
      if (
        cachedExpensesReference !== tripExpenses ||
        cachedExpensesLength !== tripExpenses.length
      ) {
        cachedExpensesReference = tripExpenses;
        cachedExpensesLength = tripExpenses.length;
        expenseTotals = new Map();

        tripExpenses.forEach((expense) => {
          const key = String(expense.trip_id || '').trim();
          if (!key) return;

          const amount =
            (Number(expense.fuel) || 0) +
            (Number(expense.ration) || 0) +
            (Number(expense.rapido) || 0) +
            (Number(expense.manoeuvre) || 0) +
            (Number(expense.misc) || 0);

          expenseTotals.set(key, (expenseTotals.get(key) || 0) + amount);
        });
      }

      return expenseTotals.get(String(tripId || '').trim()) || 0;
    };
  } catch (error) {
    console.warn('Optimisation des dépenses non appliquée :', error);
  }

  const restoreForm = (values) => {
    document.getElementById('truck').value = values.truck;
    document.getElementById('date').value = values.date;
    document.getElementById('loading-zone').value = values.loadingZone;
    document.getElementById('unloading-zone').value = values.unloadingZone;
    document.getElementById('revenue').value = values.revenue;
  };

  const addTruckSuggestion = (plate) => {
    const datalist = document.getElementById('nexis-truck-options');
    if (!datalist || !plate) return;

    const exists = [...datalist.options].some(
      (option) => option.value.toUpperCase() === plate.toUpperCase()
    );

    if (!exists) {
      const option = document.createElement('option');
      option.value = plate;
      datalist.appendChild(option);
    }
  };

  form.addEventListener('submit', async (event) => {
    const editingNotice = form.querySelector('.editing-notice');
    if (editingNotice && !editingNotice.hidden) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (isFastSaving) return;

    const values = {
      truck: document.getElementById('truck').value.trim().toUpperCase(),
      date: document.getElementById('date').value,
      loadingZone: document.getElementById('loading-zone').value.trim(),
      unloadingZone: document.getElementById('unloading-zone').value.trim(),
      revenue: Number(document.getElementById('revenue').value)
    };

    if (
      !values.truck ||
      !values.date ||
      !values.loadingZone ||
      !values.unloadingZone ||
      Number.isNaN(values.revenue)
    ) {
      return;
    }

    const duplicateExists = trips.some((existingTrip) =>
      String(existingTrip.truck || '').trim().toUpperCase() === values.truck &&
      String(existingTrip.date || '') === values.date &&
      String(existingTrip.loadingZone || '').trim().toUpperCase() ===
        values.loadingZone.toUpperCase() &&
      String(existingTrip.unloadingZone || '').trim().toUpperCase() ===
        values.unloadingZone.toUpperCase() &&
      Number(existingTrip.revenue || 0) === values.revenue
    );

    if (duplicateExists) {
      alert('Cette course existe déjà : même camion, même date, même trajet et même montant.');
      return;
    }

    const submissionToken = crypto.randomUUID();
    const trip = {
      id: submissionToken,
      submission_token: submissionToken,
      ...values
    };

    isFastSaving = true;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Enregistrement...';
    }

    form.reset();

    try {
      const { data, error } = await supabaseClient
        .from('trips')
        .insert([trip])
        .select()
        .single();

      if (error) throw error;

      trips.unshift(data || trip);
      addTruckSuggestion(values.truck);
      render();
    } catch (error) {
      console.error('Erreur Supabase :', error);
      restoreForm(values);

      if (error?.code === '23505') {
        alert('Cette course a déjà été enregistrée.');
      } else {
        alert("Erreur lors de l'enregistrement de la course.");
      }
    } finally {
      isFastSaving = false;

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Ajouter';
      }
    }
  }, true);
})();
