(() => {
  'use strict';
  if (window.__NEXIS_TEAM_MANAGEMENT__) return;
  window.__NEXIS_TEAM_MANAGEMENT__ = true;
  if (!window.supabase?.createClient) return;

  const db = window.supabase.createClient();
  const roleLabel = role => ({admin:'Administrateur',operator:'Exploitant',accountant:'Comptable'})[role] || role || '—';
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const dateFR = value => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
  };

  const style = document.createElement('style');
  style.textContent = `
    .team-manage-btn{height:32px;padding:0 10px;border:1px solid #dce3ea;border-radius:10px;background:#fff;color:#405268;font:750 8px var(--font-ui,"Inter",sans-serif);cursor:pointer}
    .team-shell{position:fixed;inset:0;z-index:21000;display:grid;grid-template-columns:1fr min(760px,96vw)}.team-shell[hidden]{display:none}
    .team-overlay{border:0;background:rgba(15,29,45,.48);backdrop-filter:blur(3px)}.team-drawer{display:flex;flex-direction:column;background:#f5f7fa;box-shadow:-22px 0 55px rgba(14,31,52,.2)}
    .team-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e1e6ec;background:#fff}.team-head small{display:block;color:#8b96a5;font-size:8px;font-weight:800;text-transform:uppercase}.team-head h3{margin:4px 0 0;font-size:18px}.team-close{width:34px;height:34px;border:1px solid #dce3eb;border-radius:10px;background:#fff;font-size:20px;cursor:pointer}
    .team-body{padding:18px 20px 26px;overflow:auto}.team-card{padding:16px;border:1px solid #dfe5eb;border-radius:15px;background:#fff;box-shadow:0 10px 28px rgba(31,48,73,.06)}.team-card+.team-card{margin-top:12px}
    .team-card h4{margin:0 0 4px;font-size:13px}.team-card>p{margin:0 0 12px;color:#7d8998;font-size:8.5px}.team-invite-form{display:grid;grid-template-columns:1.4fr .8fr auto;gap:8px}.team-invite-form input,.team-invite-form select{height:39px;margin:0!important}.team-invite-form button{min-width:105px}.team-message{margin-top:9px;padding:9px 10px;border-radius:9px;background:#eef7f3;color:#087a59;font-size:8.5px}.team-message.error{background:#fff1f1;color:#a74149}
    .team-table{width:100%;border-collapse:collapse}.team-table th{padding:9px 8px;text-align:left;color:#8591a0;font-size:7.5px;text-transform:uppercase}.team-table td{padding:10px 8px;border-top:1px solid #edf0f3;font-size:8.5px;color:#3c4f63}.team-role{display:inline-flex;padding:4px 7px;border-radius:999px;background:#eef2f5;font-size:7.5px;font-weight:800}.team-status{font-weight:800}.team-status.active{color:#087b58}.team-status.inactive{color:#a43b43}.team-actions{display:flex;justify-content:flex-end;gap:5px}.team-action{height:29px;padding:0 8px;border:1px solid #dce3ea;border-radius:8px;background:#fff;font:700 7.5px var(--font-ui,"Inter",sans-serif);cursor:pointer}.team-action.danger{color:#a43b43;border-color:#efc9cc;background:#fff8f8}
    .team-invite-link{display:grid;grid-template-columns:1fr auto;gap:7px;margin-top:9px}.team-invite-link input{height:36px;margin:0!important;font-size:8px}.team-empty{padding:22px;text-align:center;color:#8a95a3;font-size:9px}.team-note{margin-top:10px;color:#8b96a5;font-size:7.8px;line-height:1.45}
    @media(max-width:740px){.team-shell{grid-template-columns:1fr}.team-overlay{display:none}.team-invite-form{grid-template-columns:1fr}.team-table{min-width:620px}.team-card{overflow:auto}}
  `;
  document.head.appendChild(style);

  const shell = document.createElement('section');
  shell.className = 'team-shell';
  shell.id = 'team-shell';
  shell.hidden = true;
  shell.innerHTML = `
    <button class="team-overlay" type="button" data-close-team></button>
    <aside class="team-drawer">
      <header class="team-head"><div><small>Administration</small><h3>Collaborateurs</h3></div><button class="team-close" type="button" data-close-team>×</button></header>
      <div class="team-body">
        <section class="team-card"><h4>Inviter un collaborateur</h4><p>Créez un accès sécurisé à votre entreprise Nexis.</p>
          <form class="team-invite-form" id="team-invite-form"><input id="team-invite-email" type="email" required placeholder="collaborateur@entreprise.com"><select id="team-invite-role"><option value="operator">Exploitant</option><option value="accountant">Comptable</option><option value="admin">Administrateur</option></select><button class="primary" type="submit">Créer l’invitation</button></form>
          <div id="team-message" class="team-message" hidden></div><div id="team-invite-link" class="team-invite-link" hidden><input id="team-invite-url" readonly><button class="secondary" id="team-copy-link" type="button">Copier</button></div>
          <div class="team-note">Pour l’instant Nexis génère un lien d’invitation sécurisé que vous pouvez envoyer par e-mail ou WhatsApp. L’envoi automatique par e-mail pourra être ajouté ensuite.</div>
        </section>
        <section class="team-card"><h4>Équipe</h4><p>Utilisateurs ayant accès à votre espace.</p><div id="team-members"></div></section>
        <section class="team-card"><h4>Invitations en attente</h4><p>Les invitations expirent automatiquement après 7 jours.</p><div id="team-invitations"></div></section>
      </div>
    </aside>`;
  document.body.appendChild(shell);

  let profile = null;
  let organization = null;

  function showMessage(text = '', error = false) {
    const box = document.getElementById('team-message');
    box.textContent = text;
    box.className = `team-message${error ? ' error' : ''}`;
    box.hidden = !text;
  }

  async function context() {
    if (window.NexisOrganization?.ready) await window.NexisOrganization.ready;
    profile = window.NexisOrganization?.profile?.() || null;
    organization = window.NexisOrganization?.organization?.() || null;
    return Boolean(profile && organization);
  }

  function inviteUrl(token, email) {
    const url = new URL(location.origin + location.pathname);
    url.searchParams.set('invite', token);
    url.searchParams.set('email', email);
    return url.toString();
  }

  function renderMembers(rows) {
    const root = document.getElementById('team-members');
    if (!rows.length) return root.innerHTML = '<div class="team-empty">Aucun collaborateur.</div>';
    root.innerHTML = `<div style="overflow:auto"><table class="team-table"><thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Statut</th><th></th></tr></thead><tbody>${rows.map(row => `
      <tr data-member-id="${esc(row.id)}"><td>${esc(row.full_name || '—')}</td><td>${esc(row.email || '—')}</td><td><span class="team-role">${esc(roleLabel(row.role))}</span></td><td><span class="team-status ${row.is_active ? 'active':'inactive'}">${row.is_active ? 'Actif':'Désactivé'}</span></td><td><div class="team-actions">${String(row.id)!==String(profile.id) ? `<button class="team-action" data-toggle-member="${esc(row.id)}" data-active="${row.is_active}">${row.is_active?'Désactiver':'Réactiver'}</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`;
  }

  function renderInvitations(rows) {
    const root = document.getElementById('team-invitations');
    const pending = rows.filter(r => r.status === 'pending');
    if (!pending.length) return root.innerHTML = '<div class="team-empty">Aucune invitation en attente.</div>';
    root.innerHTML = `<div style="overflow:auto"><table class="team-table"><thead><tr><th>E-mail</th><th>Rôle</th><th>Expiration</th><th></th></tr></thead><tbody>${pending.map(row => `
      <tr><td>${esc(row.email)}</td><td><span class="team-role">${esc(roleLabel(row.role))}</span></td><td>${dateFR(row.expires_at)}</td><td><div class="team-actions"><button class="team-action" data-copy-invite="${esc(row.token)}" data-email="${esc(row.email)}">Copier le lien</button><button class="team-action danger" data-revoke-invite="${esc(row.id)}">Révoquer</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }

  async function load() {
    if (!(await context()) || profile.role !== 'admin') return;
    const [membersResult, invitesResult] = await Promise.all([
      db.from('profiles').select('id,email,full_name,role,is_active,organization_id').eq('organization_id', organization.id).order('full_name'),
      db.from('organization_invitations').select('*').eq('organization_id', organization.id).order('created_at', {ascending:false})
    ]);
    if (membersResult.error || invitesResult.error) {
      console.error(membersResult.error || invitesResult.error);
      showMessage('Impossible de charger les collaborateurs.', true);
      return;
    }
    renderMembers(membersResult.data || []);
    renderInvitations(invitesResult.data || []);
  }

  async function open() {
    if (!(await context()) || profile.role !== 'admin') return;
    shell.hidden = false;
    document.body.style.overflow = 'hidden';
    showMessage('');
    document.getElementById('team-invite-link').hidden = true;
    await load();
  }
  function close(){shell.hidden=true;document.body.style.overflow='';}

  async function installButton() {
    if (!(await context()) || profile.role !== 'admin') return;
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('team-manage-button')) return;
    const button = document.createElement('button');
    button.type='button';button.id='team-manage-button';button.className='team-manage-btn';button.textContent='Équipe';button.addEventListener('click',open);
    actions.insertBefore(button, document.getElementById('nexis-logout') || null);
  }

  document.getElementById('team-invite-form').addEventListener('submit', async event => {
    event.preventDefault();
    showMessage('');
    if (!(await context()) || profile.role !== 'admin') return;
    const email = document.getElementById('team-invite-email').value.trim().toLowerCase();
    const role = document.getElementById('team-invite-role').value;
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const { data, error } = await db.from('organization_invitations').insert({organization_id:organization.id,email,role,invited_by:profile.id}).select().single();
      if (error) throw error;
      const url = inviteUrl(data.token, email);
      document.getElementById('team-invite-url').value = url;
      document.getElementById('team-invite-link').hidden = false;
      showMessage('Invitation créée. Copiez le lien et envoyez-le au collaborateur.');
      event.currentTarget.reset();
      await load();
    } catch (error) {
      console.error(error);
      showMessage(error.code === '23505' ? 'Une invitation est déjà en attente pour cette adresse.' : (error.message || 'Création impossible.'), true);
    } finally { submit.disabled=false; }
  });

  document.getElementById('team-copy-link').addEventListener('click', async () => {
    const value = document.getElementById('team-invite-url').value;
    if (value) await navigator.clipboard.writeText(value);
  });

  shell.addEventListener('click', async event => {
    if (event.target.closest('[data-close-team]')) return close();
    const toggle = event.target.closest('[data-toggle-member]');
    if (toggle) {
      toggle.disabled=true;
      const next = toggle.dataset.active !== 'true';
      const { error } = await db.from('profiles').update({is_active:next}).eq('id',toggle.dataset.toggleMember);
      if (error) showMessage(error.message || 'Modification impossible.',true); else await load();
      toggle.disabled=false;return;
    }
    const revoke = event.target.closest('[data-revoke-invite]');
    if (revoke) {
      revoke.disabled=true;
      const { error } = await db.from('organization_invitations').update({status:'revoked'}).eq('id',revoke.dataset.revokeInvite);
      if (error) showMessage(error.message || 'Révocation impossible.',true); else await load();
      return;
    }
    const copy = event.target.closest('[data-copy-invite]');
    if (copy) await navigator.clipboard.writeText(inviteUrl(copy.dataset.copyInvite,copy.dataset.email));
  });

  window.addEventListener('nexis:organization-ready', installButton);
  window.addEventListener('nexis:organization-updated', installButton);
  if (window.NexisOrganization) installButton();
})();
