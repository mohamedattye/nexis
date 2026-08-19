(() => {
  'use strict';
  if (window.__NEXIS_MISSION_DELETE_HOTFIX__) return;
  window.__NEXIS_MISSION_DELETE_HOTFIX__ = true;

  const db = window.NexisAuth?.client || window.supabase?.createClient?.();
  if (!db) return;

  let busy = false;

  function notify(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.dataset.type = type;
      toast.classList.add('visible');
      window.setTimeout(() => toast.classList.remove('visible'), type === 'error' ? 5500 : 3000);
    }
  }

  function infoValue(label) {
    const items = [...document.querySelectorAll('#mission-detail-body .detail-info')];
    const item = items.find(node => node.querySelector('span')?.textContent?.trim().toLowerCase() === label.toLowerCase());
    return item?.querySelector('strong')?.textContent?.trim() || '';
  }

  function isoDate(frDate) {
    const parts = String(frDate || '').split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : frDate;
  }

  async function resolveOpenTrip() {
    const truck = infoValue('Camion');
    const date = isoDate(infoValue('Date'));
    const loading = infoValue('Chargement');
    const unloading = infoValue('Déchargement');

    if (!truck || !date || !loading || !unloading) {
      throw new Error('MISSION_NOT_IDENTIFIED');
    }

    const { data, error } = await db
      .from('trips')
      .select('id,truck,date,loadingZone,unloadingZone')
      .eq('truck', truck)
      .eq('date', date)
      .eq('loadingZone', loading)
      .eq('unloadingZone', unloading)
      .order('created_at', { ascending:false })
      .limit(2);

    if (error) throw error;
    if (!data?.length) throw new Error('MISSION_NOT_FOUND');
    if (data.length > 1) throw new Error('MISSION_AMBIGUOUS');
    return data[0];
  }

  async function linkedDocuments(tripId) {
    const { data: links, error: linkError } = await db
      .from('invoice_trips')
      .select('invoice_id')
      .eq('trip_id', tripId);
    if (linkError) throw linkError;

    const ids = [...new Set((links || []).map(x => x.invoice_id).filter(Boolean))];
    if (!ids.length) return [];

    const { data, error } = await db
      .from('invoices')
      .select('id,invoice_number,document_number,document_type,status')
      .in('id', ids);
    if (error) throw error;
    return data || [];
  }

  function documentLabel(doc) {
    return doc.invoice_number || doc.document_number || (doc.document_type === 'price_note' ? 'Note de prix' : 'Facture');
  }

  async function handleDelete(event) {
    const button = event.target.closest('#delete-mission-button');
    if (!button || busy) return;

    // Capture le clic avant l'ancien gestionnaire de suppression.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    busy = true;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Vérification…';

    try {
      const trip = await resolveOpenTrip();
      const docs = await linkedDocuments(trip.id);
      const activeDocs = docs.filter(doc => doc.status !== 'cancelled');

      if (activeDocs.length) {
        const labels = activeDocs.map(documentLabel).join(', ');
        notify(`Suppression impossible : mission liée à ${labels}.`, 'error');
        window.alert(`Cette mission est liée à ${labels}.\n\nAnnulez d’abord le document dans Facturation avant de supprimer la mission.`);
        return;
      }

      const cancelledLabels = docs.map(documentLabel).filter(Boolean);
      const extra = cancelledLabels.length
        ? `\n\nLe document annulé ${cancelledLabels.join(', ')} sera également nettoyé automatiquement.`
        : '';

      if (!window.confirm(`Supprimer définitivement cette mission et ses dépenses ?${extra}`)) return;

      button.textContent = 'Suppression…';

      // Le trigger Supabase nettoie automatiquement un document annulé
      // lorsqu'il ne contient que cette mission.
      const { data: deleted, error: deleteError } = await db
        .from('trips')
        .delete()
        .eq('id', trip.id)
        .select('id');

      if (deleteError) throw deleteError;
      if (!deleted?.length) throw new Error('DELETE_REFUSED');

      notify('Mission supprimée avec succès.');
      const shell = document.getElementById('mission-detail-shell');
      if (shell) shell.hidden = true;
      document.body.style.overflow = '';
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      console.error('Suppression mission Nexis :', error);
      const message = String(error?.message || '');
      let userMessage = 'Impossible de supprimer cette mission.';
      if (message.includes('document actif')) userMessage = message.replace(/^.*Suppression impossible\s*:\s*/i, 'Suppression impossible : ');
      else if (message.includes('plusieurs missions')) userMessage = 'Cette mission appartient à un document annulé qui contient aussi d’autres missions. Le document doit être traité depuis Facturation.';
      else if (message === 'MISSION_AMBIGUOUS') userMessage = 'Plusieurs missions identiques ont été trouvées. Ouvrez la mission depuis le Centre des missions puis réessayez.';
      else if (message === 'MISSION_NOT_FOUND' || message === 'MISSION_NOT_IDENTIFIED') userMessage = 'Nexis n’a pas pu identifier précisément la mission ouverte.';
      else if (message === 'DELETE_REFUSED') userMessage = 'La suppression a été refusée. Vérifiez que vous êtes administrateur de cette entreprise.';
      notify(userMessage, 'error');
      window.alert(userMessage);
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = original;
    }
  }

  // Capture au niveau du drawer : s'exécute avant le handler direct du bouton.
  const shell = document.getElementById('mission-detail-shell');
  shell?.addEventListener('click', handleDelete, true);
})();