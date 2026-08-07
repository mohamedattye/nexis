(() => {
  'use strict';
  if (window.__NEXIS_SUBSCRIPTION_STATUS__) return;
  window.__NEXIS_SUBSCRIPTION_STATUS__ = true;

  const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const money = value => `${fmt.format(Number(value) || 0)} FCFA`;
  const dateFR = value => {
    if (!value) return '—';
    const [y,m,d] = String(value).split('-');
    return y && m && d ? `${d}/${m}/${y}` : String(value);
  };

  const style = document.createElement('style');
  style.textContent = `
    .subscription-status-button{height:32px;padding:0 10px;border:1px solid #dce3ea;border-radius:10px;background:#fff;color:#3b4f65;font:750 8px var(--font-ui,"Inter",sans-serif);cursor:pointer;white-space:nowrap}
    .subscription-status-button.active{border-color:#bfe2d6;background:#f2fbf7;color:#157354}.subscription-status-button.pending{border-color:#f2d1a5;background:#fff8ef;color:#9a5d12}.subscription-status-button.expired,.subscription-status-button.suspended{border-color:#edc3c6;background:#fff3f3;color:#9d3b43}
    .subscription-status-shell{position:fixed;inset:0;z-index:135;display:grid;grid-template-columns:1fr min(520px,96vw)}.subscription-status-shell[hidden]{display:none}.subscription-status-overlay{border:0;background:rgba(15,29,45,.48);backdrop-filter:blur(3px)}
    .subscription-status-drawer{background:#f6f8fb;box-shadow:-22px 0 55px rgba(14,31,52,.2);display:flex;flex-direction:column}.subscription-status-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#fff;border-bottom:1px solid #e1e7ed}.subscription-status-head small{display:block;color:#8c97a5;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.subscription-status-head h3{margin:4px 0 0;font-size:18px;color:#1b2d43}.subscription-status-close{width:34px;height:34px;border:1px solid #dce3ea;border-radius:10px;background:#fff;font-size:20px;cursor:pointer}
    .subscription-status-body{padding:18px;overflow:auto}.subscription-status-hero{padding:18px;border-radius:16px;background:#10243b;color:#fff}.subscription-status-hero small{display:block;color:#aebccc;font-size:8px;font-weight:800;text-transform:uppercase}.subscription-status-hero strong{display:block;margin-top:7px;font-size:26px;letter-spacing:-.04em}.subscription-status-hero p{margin:7px 0 0;color:#c0cad4;font-size:9.5px;line-height:1.5}.subscription-status-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.subscription-status-card{padding:13px;border:1px solid #e0e6ec;border-radius:12px;background:#fff}.subscription-status-card span{display:block;color:#8a96a3;font-size:7.5px;font-weight:800;text-transform:uppercase}.subscription-status-card strong{display:block;margin-top:6px;color:#253a50;font-size:12px}.subscription-status-note{margin-top:12px;padding:12px;border-left:3px solid #ff8a00;background:#fff8ef;color:#5f6f80;font-size:9px;line-height:1.55}
    @media(max-width:740px){.subscription-status-button{display:none}.subscription-status-shell{grid-template-columns:1fr}.subscription-status-overlay{display:none}.subscription-status-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const shell = document.createElement('section');
  shell.className = 'subscription-status-shell';
  shell.id = 'subscription-status-shell';
  shell.hidden = true;
  shell.innerHTML = `
    <button class="subscription-status-overlay" type="button" data-close-subscription-status></button>
    <aside class="subscription-status-drawer">
      <header class="subscription-status-head"><div><small>Abonnement Nexis</small><h3>Mon abonnement</h3></div><button class="subscription-status-close" type="button" data-close-subscription-status>×</button></header>
      <div class="subscription-status-body" id="subscription-status-body"><p>Chargement…</p></div>
    </aside>`;
  document.body.appendChild(shell);

  let current = null;

  function label(status) {
    return ({pending:'En attente',active:'Actif',expired:'Expiré',suspended:'Suspendu',cancelled:'Annulé'})[status] || status || '—';
  }

  function paymentLabel(status) {
    return ({unpaid:'Non payé',paid:'Payé',partial:'Paiement partiel',waived:'Offert'})[status] || status || '—';
  }

  function renderButton() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('subscription-status-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'subscription-status-button';
    button.className = 'subscription-status-button';
    button.addEventListener('click', open);
    actions.insertBefore(button, actions.firstChild);
  }

  function updateButton() {
    renderButton();
    const button = document.getElementById('subscription-status-button');
    if (!button) return;
    const status = current?.status || 'pending';
    button.className = `subscription-status-button ${status}`;
    button.textContent = `Abonnement · ${label(status)}`;
  }

  function renderBody() {
    const body = document.getElementById('subscription-status-body');
    if (!body) return;
    if (!current) {
      body.innerHTML = '<div class="subscription-status-note">Aucune information d’abonnement disponible pour le moment.</div>';
      return;
    }

    const surchargeApplied = Number(current.active_trucks || 0) > Number(current.included_active_trucks || 10);
    body.innerHTML = `
      <div class="subscription-status-hero">
        <small>${current.plan_name || 'Nexis Annuel'}</small>
        <strong>${money(current.current_annual_price)}</strong>
        <p>${surchargeApplied ? 'Tarif annuel avec supplément flotte au-delà de 10 camions actifs.' : 'Tarif annuel jusqu’à 10 camions actifs.'}</p>
      </div>
      <div class="subscription-status-grid">
        <div class="subscription-status-card"><span>Statut</span><strong>${label(current.status)}</strong></div>
        <div class="subscription-status-card"><span>Paiement</span><strong>${paymentLabel(current.payment_status)}</strong></div>
        <div class="subscription-status-card"><span>Camions actifs</span><strong>${Number(current.active_trucks || 0)}</strong></div>
        <div class="subscription-status-card"><span>Inclus dans le tarif</span><strong>${Number(current.included_active_trucks || 10)}</strong></div>
        <div class="subscription-status-card"><span>Début</span><strong>${dateFR(current.starts_on)}</strong></div>
        <div class="subscription-status-card"><span>Fin</span><strong>${dateFR(current.ends_on)}</strong></div>
        <div class="subscription-status-card"><span>Montant dû</span><strong>${money(current.amount_due)}</strong></div>
        <div class="subscription-status-card"><span>Montant payé</span><strong>${money(current.amount_paid)}</strong></div>
      </div>
      <div class="subscription-status-note">
        Tarif de lancement Nexis : <strong>630 000 FCFA/an</strong> jusqu’à 10 camions actifs. Au-delà de 10 camions actifs, un supplément annuel unique de <strong>120 000 FCFA</strong> s’applique, soit <strong>750 000 FCFA/an</strong>.
      </div>`;
  }

  async function load() {
    try {
      await window.NexisAuth?.ready;
      const db = window.supabase.createClient();
      const { data, error } = await db.from('current_organization_subscription').select('*').maybeSingle();
      if (error) throw error;
      current = data || null;
    } catch (error) {
      console.warn('Abonnement Nexis :', error);
      current = null;
    }
    updateButton();
    renderBody();
    return current;
  }

  async function open() {
    await load();
    shell.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    shell.hidden = true;
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-close-subscription-status]').forEach(button => button.addEventListener('click', close));
  window.addEventListener('nexis:organization-ready', load);
  window.addEventListener('nexis:organization-updated', load);
  window.NexisSubscription = { load, open, close, get: () => current };
  load();
})();
