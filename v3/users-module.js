(() => {
  'use strict';

  const root = document.getElementById('users');
  if (!root || !window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  let profiles = [];
  let currentUserId = window.NEXIS_AUTH?.session?.user?.id || null;
  let currentIsAdmin = window.NEXIS_AUTH?.isAdmin === true;
  let loading = false;

  const style = document.createElement('style');
  style.textContent = `
    .users-page{display:grid;gap:14px}.users-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.users-head h2{margin:0;font-size:23px;color:#13263f}.users-head p{margin:5px 0 0;font-size:10px;color:#6f7c8d}.users-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.users-kpi{padding:14px 15px;border:1px solid #dce3ec;border-radius:9px;background:#fff}.users-kpi span,.users-kpi strong,.users-kpi small{display:block}.users-kpi span{font-size:9px;color:#697789;font-weight:800}.users-kpi strong{margin-top:6px;font-size:20px;color:#13263f}.users-kpi small{margin-top:5px;font-size:9px;color:#8490a0}.users-panel{padding:15px;border:1px solid #dce3ec;border-radius:10px;background:#fff}.users-toolbar{display:flex;align-items:center;gap:9px;margin-bottom:12px}.users-toolbar input{flex:1;height:39px;border:1px solid #cfd8e3;border-radius:7px;padding:0 11px;font:inherit;font-size:11px;outline:none}.users-toolbar input:focus{border-color:#f09a3b;box-shadow:0 0 0 3px rgba(255,139,20,.1)}.users-help{margin:0 0 12px;padding:10px 12px;border:1px solid #dce5ef;border-radius:8px;background:#f7f9fc;color:#617084;font-size:9px;line-height:1.5}.users-table-wrap{overflow:auto;border:1px solid #e0e6ee;border-radius:8px}.users-table{width:100%;border-collapse:collapse;min-width:760px}.users-table th{padding:10px;text-align:left;background:#f6f8fb;border-bottom:1px solid #dde4ec;color:#617085;font-size:8px;text-transform:uppercase;letter-spacing:.04em}.users-table td{padding:11px 10px;border-bottom:1px solid #e8edf3;color:#24364e;font-size:10px;vertical-align:middle}.users-table tr:last-child td{border-bottom:0}.users-identity strong,.users-identity small{display:block}.users-identity strong{font-size:11px}.users-identity small{margin-top:4px;color:#7b8796}.users-badge{display:inline-flex;align-items:center;min-height:23px;padding:0 8px;border-radius:999px;font-size:8px;font-weight:850}.users-badge.admin{background:#fff0dd;color:#9a5700}.users-badge.operator{background:#eaf2ff;color:#215da7}.users-status{display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:800}.users-status:before{content:"";width:6px;height:6px;border-radius:50%;background:#a5afbb}.users-status.active{color:#087b58}.users-status.active:before{background:#17aa78}.users-actions{display:flex;justify-content:flex-end;gap:7px}.users-action{min-height:30px;border:1px solid #d7dfe8;border-radius:7px;background:#fff;padding:0 9px;font:inherit;font-size:9px;font-weight:800;color:#33445a;cursor:pointer}.users-action:hover{background:#f5f7fa}.users-action.warn{border-color:#f2c889;color:#9a5900}.users-action:disabled{opacity:.55;cursor:wait}.users-current{display:inline-flex;align-items:center;min-height:25px;padding:0 8px;border-radius:999px;background:#eef2f7;color:#5f6d7e;font-size:8px;font-weight:800}.users-empty,.users-loading,.users-error{padding:30px 15px;text-align:center;color:#748194;font-size:10px}.users-error{color:#b33b43}.users-modal{position:fixed;inset:0;z-index:11000;display:grid;place-items:center;padding:18px;background:rgba(9,24,43,.55);backdrop-filter:blur(5px)}.users-modal[hidden]{display:none!important}.users-dialog{width:min(430px,100%);border:1px solid #dbe2eb;border-radius:13px;background:#fff;box-shadow:0 24px 70px rgba(6,22,40,.28);overflow:hidden}.users-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:16px 17px;border-bottom:1px solid #e6ebf1}.users-dialog-head h3{margin:0;font-size:16px;color:#172942}.users-dialog-close{width:32px;height:32px;border:1px solid #d9e1ea;border-radius:7px;background:#fff;font-size:17px;cursor:pointer}.users-dialog-body{display:grid;gap:13px;padding:17px}.users-dialog-body label{font-size:9px;font-weight:800;color:#3d4d61}.users-dialog-body input,.users-dialog-body select{width:100%;height:40px;margin-top:6px;border:1px solid #cfd8e3;border-radius:7px;padding:0 10px;font:inherit;font-size:11px;background:#fff}.users-dialog-note{margin:0;padding:10px;border:1px solid #ffe0b4;border-radius:7px;background:#fff8ed;color:#885000;font-size:9px;line-height:1.5}.users-dialog-error{margin:0;color:#b33b43;font-size:9px}.users-dialog-error[hidden]{display:none!important}.users-dialog-actions{display:flex;justify-content:flex-end;gap:8px}.users-dialog-actions button{height:37px;border-radius:7px;padding:0 12px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}.users-cancel{border:1px solid #d8e0e9;background:#fff;color:#33445a}.users-save{border:0;background:#ff8a00;color:#17263b}.users-save:disabled{opacity:.6;cursor:wait}@media(max-width:900px){.users-kpis{grid-template-columns:1fr}.users-head{align-items:flex-start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="users-page">
      <div class="users-head"><div><h2>Utilisateurs</h2><p>Gérez les rôles et les accès à la plateforme Nexis.</p></div></div>
      <div class="users-kpis">
        <article class="users-kpi"><span>Utilisateurs</span><strong id="users-total">—</strong><small>Comptes enregistrés</small></article>
        <article class="users-kpi"><span>Comptes actifs</span><strong id="users-active">—</strong><small>Accès actuellement autorisés</small></article>
        <article class="users-kpi"><span>Administrateurs</span><strong id="users-admins">—</strong><small>Gestion complète de Nexis</small></article>
      </div>
      <section class="users-panel">
        <div class="users-toolbar"><input id="users-search" type="search" placeholder="Rechercher un nom ou une adresse e-mail"></div>
        <p class="users-help">Pour créer un nouveau compte, ajoutez d’abord l’utilisateur dans Supabase Authentication. Il apparaîtra ensuite automatiquement ici avec le rôle Opérateur.</p>
        <div class="users-table-wrap"><table class="users-table"><thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Créé le</th><th></th></tr></thead><tbody id="users-body"><tr><td colspan="5" class="users-loading">Chargement des utilisateurs…</td></tr></tbody></table></div>
      </section>
    </div>
    <section class="users-modal" id="users-modal" hidden>
      <div class="users-dialog" role="dialog" aria-modal="true" aria-labelledby="users-dialog-title">
        <header class="users-dialog-head"><h3 id="users-dialog-title">Modifier l’utilisateur</h3><button class="users-dialog-close" id="users-dialog-close" type="button" aria-label="Fermer">×</button></header>
        <form class="users-dialog-body" id="users-form">
          <input id="users-edit-id" type="hidden">
          <label>Nom complet<input id="users-edit-name" type="text" maxlength="120"></label>
          <label>Rôle<select id="users-edit-role"><option value="operator">Opérateur</option><option value="admin">Administrateur</option></select></label>
          <label>Statut<select id="users-edit-active"><option value="true">Actif</option><option value="false">Inactif</option></select></label>
          <p class="users-dialog-note">Un administrateur peut gérer toute la plateforme. Un opérateur peut créer et modifier les missions, mais pas effectuer les actions sensibles.</p>
          <p class="users-dialog-error" id="users-form-error" hidden></p>
          <div class="users-dialog-actions"><button class="users-cancel" id="users-dialog-cancel" type="button">Annuler</button><button class="users-save" type="submit">Enregistrer</button></div>
        </form>
      </div>
    </section>`;

  const els = {
    total: document.getElementById('users-total'),
    active: document.getElementById('users-active'),
    admins: document.getElementById('users-admins'),
    search: document.getElementById('users-search'),
    body: document.getElementById('users-body'),
    modal: document.getElementById('users-modal'),
    close: document.getElementById('users-dialog-close'),
    cancel: document.getElementById('users-dialog-cancel'),
    form: document.getElementById('users-form'),
    id: document.getElementById('users-edit-id'),
    name: document.getElementById('users-edit-name'),
    role: document.getElementById('users-edit-role'),
    activeEdit: document.getElementById('users-edit-active'),
    error: document.getElementById('users-form-error')
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function formatDate(value) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
    } catch {
      return '—';
    }
  }

  function showFormError(message = '') {
    els.error.textContent = message;
    els.error.hidden = !message;
  }

  function render() {
    const query = String(els.search.value || '').trim().toLowerCase();
    const filtered = profiles.filter((profile) => {
      const content = `${profile.full_name || ''} ${profile.email || ''}`.toLowerCase();
      return !query || content.includes(query);
    });

    els.total.textContent = String(profiles.length);
    els.active.textContent = String(profiles.filter((profile) => profile.is_active === true).length);
    els.admins.textContent = String(profiles.filter((profile) => profile.role === 'admin' && profile.is_active === true).length);

    if (!filtered.length) {
      els.body.innerHTML = '<tr><td colspan="5" class="users-empty">Aucun utilisateur ne correspond à la recherche.</td></tr>';
      return;
    }

    els.body.innerHTML = filtered.map((profile) => {
      const isCurrent = profile.id === currentUserId;
      return `
        <tr>
          <td><div class="users-identity"><strong>${escapeHtml(profile.full_name || profile.email || 'Utilisateur')}</strong><small>${escapeHtml(profile.email || 'Adresse non renseignée')}</small></div></td>
          <td><span class="users-badge ${profile.role === 'admin' ? 'admin' : 'operator'}">${profile.role === 'admin' ? 'Administrateur' : 'Opérateur'}</span></td>
          <td><span class="users-status ${profile.is_active ? 'active' : ''}">${profile.is_active ? 'Actif' : 'Inactif'}</span></td>
          <td>${formatDate(profile.created_at)}</td>
          <td><div class="users-actions">${isCurrent ? '<span class="users-current">Compte actuel</span>' : `<button class="users-action" type="button" data-edit-user="${escapeHtml(profile.id)}">Modifier</button><button class="users-action ${profile.is_active ? 'warn' : ''}" type="button" data-toggle-user="${escapeHtml(profile.id)}">${profile.is_active ? 'Désactiver' : 'Activer'}</button>`}</div></td>
        </tr>`;
    }).join('');
  }

  async function load() {
    if (loading || !currentIsAdmin) return;
    loading = true;
    els.body.innerHTML = '<tr><td colspan="5" class="users-loading">Chargement des utilisateurs…</td></tr>';
    try {
      const { data, error } = await client
        .from('profiles')
        .select('id,email,full_name,role,is_active,created_at,updated_at')
        .order('created_at', { ascending: true });
      if (error) throw error;
      profiles = data || [];
      render();
    } catch (error) {
      console.error('Erreur chargement utilisateurs :', error);
      els.body.innerHTML = '<tr><td colspan="5" class="users-error">Impossible de charger les utilisateurs.</td></tr>';
    } finally {
      loading = false;
    }
  }

  function openEdit(profile) {
    if (!profile || profile.id === currentUserId) return;
    els.id.value = profile.id;
    els.name.value = profile.full_name || '';
    els.role.value = profile.role || 'operator';
    els.activeEdit.value = profile.is_active ? 'true' : 'false';
    showFormError('');
    els.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => els.name.focus(), 0);
  }

  function closeEdit() {
    els.modal.hidden = true;
    document.body.style.overflow = '';
    els.form.reset();
    showFormError('');
  }

  async function saveUser(event) {
    event.preventDefault();
    const id = els.id.value;
    if (!id || id === currentUserId) return;
    const submit = els.form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Enregistrement…';
    showFormError('');
    try {
      const changes = {
        full_name: els.name.value.trim() || null,
        role: els.role.value,
        is_active: els.activeEdit.value === 'true'
      };
      const { data, error } = await client
        .from('profiles')
        .update(changes)
        .eq('id', id)
        .select('id,email,full_name,role,is_active,created_at,updated_at')
        .single();
      if (error) throw error;
      profiles = profiles.map((profile) => profile.id === id ? data : profile);
      closeEdit();
      render();
    } catch (error) {
      console.error('Erreur modification utilisateur :', error);
      const message = String(error?.message || '').includes('au moins un administrateur')
        ? 'Nexis doit conserver au moins un administrateur actif.'
        : "Impossible de modifier cet utilisateur.";
      showFormError(message);
    } finally {
      submit.disabled = false;
      submit.textContent = 'Enregistrer';
    }
  }

  async function toggleUser(id, button) {
    const profile = profiles.find((item) => item.id === id);
    if (!profile || profile.id === currentUserId) return;
    button.disabled = true;
    try {
      const { data, error } = await client
        .from('profiles')
        .update({ is_active: !profile.is_active })
        .eq('id', id)
        .select('id,email,full_name,role,is_active,created_at,updated_at')
        .single();
      if (error) throw error;
      profiles = profiles.map((item) => item.id === id ? data : item);
      render();
    } catch (error) {
      console.error('Erreur activation utilisateur :', error);
      window.alert(String(error?.message || '').includes('au moins un administrateur')
        ? 'Nexis doit conserver au moins un administrateur actif.'
        : "Impossible de modifier l'accès de cet utilisateur.");
      button.disabled = false;
    }
  }

  els.search.addEventListener('input', render);
  els.close.addEventListener('click', closeEdit);
  els.cancel.addEventListener('click', closeEdit);
  els.modal.addEventListener('click', (event) => { if (event.target === els.modal) closeEdit(); });
  els.form.addEventListener('submit', saveUser);
  els.body.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-edit-user]');
    if (editButton) return openEdit(profiles.find((profile) => profile.id === editButton.dataset.editUser));
    const toggleButton = event.target.closest('[data-toggle-user]');
    if (toggleButton) toggleUser(toggleButton.dataset.toggleUser, toggleButton);
  });

  document.addEventListener('nexis:auth-changed', (event) => {
    currentUserId = event.detail?.session?.user?.id || null;
    currentIsAdmin = event.detail?.isAdmin === true;
    if (currentIsAdmin) load();
  });

  document.querySelector('[data-view="users"]')?.addEventListener('click', () => window.setTimeout(load, 0));
  if (currentIsAdmin) load();
})();