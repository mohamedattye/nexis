(() => {
  'use strict';

  if (!window.supabase?.createClient) return;

  const client = window.supabase.createClient();
  let currentSession = null;
  let currentProfile = null;
  let submitting = false;

  const style = document.createElement('style');
  style.textContent = `
    .auth-user-button{height:34px;display:inline-flex;align-items:center;gap:8px;border:1px solid #d8e0ea;border-radius:999px;background:#fff;padding:0 11px;font:inherit;font-size:10px;font-weight:800;color:#314156;cursor:pointer}
    .auth-user-button:hover{background:#f7f9fb}.auth-user-button:before{content:"";width:7px;height:7px;border-radius:50%;background:#98a4b4}.auth-user-button.connected:before{background:#19a779}
    .auth-overlay{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:22px;background:rgba(10,25,44,.58);backdrop-filter:blur(6px)}
    .auth-overlay[hidden]{display:none}.auth-card{width:min(430px,100%);background:#fff;border:1px solid #dbe2eb;border-radius:16px;box-shadow:0 24px 70px rgba(6,22,40,.28);overflow:hidden}
    .auth-card-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:18px 19px;border-bottom:1px solid #e8edf3;background:#fbfcfe}
    .auth-card-brand{display:flex;align-items:center;gap:11px}.auth-card-brand img{width:42px;height:42px;border-radius:11px}.auth-card-brand strong,.auth-card-brand small{display:block}.auth-card-brand strong{font-size:15px;color:#172942}.auth-card-brand small{font-size:9px;color:#7b8796;margin-top:3px}
    .auth-close{width:34px;height:34px;border:1px solid #dce3eb;border-radius:8px;background:#fff;font-size:18px;cursor:pointer;color:#556376}.auth-close:hover{background:#f5f7fa}
    .auth-card-body{padding:20px}.auth-intro h2{margin:0;font-size:20px;color:#172942}.auth-intro p{margin:7px 0 17px;font-size:11px;line-height:1.5;color:#6f7b8b}
    .auth-form{display:grid;gap:13px}.auth-form label{font-size:10px;font-weight:800;color:#3c4c61}.auth-form input{width:100%;height:43px;margin-top:6px;border:1px solid #cfd8e3;border-radius:8px;padding:0 11px;font:inherit;font-size:12px;outline:none;color:#21334a}.auth-form input:focus{border-color:#e9983e;box-shadow:0 0 0 3px rgba(255,139,20,.12)}
    .auth-submit{height:43px;border:0;border-radius:8px;background:linear-gradient(180deg,#ff9c22,#ff8500);font:inherit;font-size:12px;font-weight:850;color:#17263b;cursor:pointer;box-shadow:0 7px 17px rgba(255,133,0,.23)}.auth-submit:disabled{opacity:.6;cursor:wait}
    .auth-error{margin:0;padding:10px 11px;border:1px solid #ffd0d4;border-radius:8px;background:#fff1f2;color:#b33b43;font-size:10px;line-height:1.45}.auth-error[hidden]{display:none}
    .auth-test-note{margin:14px 0 0;padding:10px 11px;border:1px solid #ffe0b4;border-radius:8px;background:#fff8ed;color:#885000;font-size:9px;line-height:1.5}
    .auth-account{display:grid;gap:13px}.auth-account-box{padding:14px;border:1px solid #e1e7ef;border-radius:9px;background:#f8fafc}.auth-account-box span,.auth-account-box strong,.auth-account-box small{display:block}.auth-account-box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#7e8998;font-weight:800}.auth-account-box strong{margin-top:6px;font-size:13px;color:#203149;word-break:break-word}.auth-account-box small{margin-top:5px;font-size:10px;color:#687587}.auth-role{display:inline-flex!important;width:max-content;margin-top:9px!important;padding:5px 8px;border-radius:999px;background:#eaf8f2;color:#087b58!important;font-size:9px!important;font-weight:850}
    .auth-logout{height:41px;border:1px solid #efc8cc;border-radius:8px;background:#fff;color:#b33b43;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.auth-logout:hover{background:#fff5f5}
    @media(max-width:740px){.auth-user-button{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.environment-badge{display:none!important}}
  `;
  document.head.appendChild(style);

  const topbarActions = document.querySelector('.topbar-actions');
  if (!topbarActions) return;

  const userButton = document.createElement('button');
  userButton.type = 'button';
  userButton.className = 'auth-user-button';
  userButton.textContent = 'Se connecter';
  const createButton = topbarActions.querySelector('.primary[data-view="new-trip"]');
  topbarActions.insertBefore(userButton, createButton || null);

  const overlay = document.createElement('section');
  overlay.className = 'auth-overlay';
  overlay.hidden = true;
  overlay.setAttribute('aria-label', 'Connexion Nexis');
  overlay.innerHTML = `
    <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <header class="auth-card-head">
        <div class="auth-card-brand"><img src="nexis-logo.svg?v=20260724-fix-2" alt="Logo Nexis"><div><strong>NEXIS</strong><small>Accès sécurisé — environnement test</small></div></div>
        <button class="auth-close" type="button" aria-label="Fermer">×</button>
      </header>
      <div class="auth-card-body">
        <div id="auth-login-view">
          <div class="auth-intro"><h2 id="auth-title">Connexion</h2><p>Utilisez le compte créé dans Supabase pour tester l’accès administrateur.</p></div>
          <form class="auth-form" id="auth-form">
            <label>Adresse e-mail<input id="auth-email" type="email" autocomplete="username" required></label>
            <label>Mot de passe<input id="auth-password" type="password" autocomplete="current-password" required></label>
            <p class="auth-error" id="auth-error" role="alert" hidden></p>
            <button class="auth-submit" id="auth-submit" type="submit">Se connecter</button>
          </form>
          <p class="auth-test-note">Mode test : l’application reste accessible même sans connexion. Le verrouillage sera activé uniquement après validation.</p>
        </div>
        <div class="auth-account" id="auth-account-view" hidden>
          <div class="auth-intro"><h2>Compte connecté</h2><p>La session Supabase fonctionne correctement.</p></div>
          <div class="auth-account-box"><span>Utilisateur</span><strong id="auth-account-email">—</strong><small id="auth-account-name"></small><small class="auth-role" id="auth-account-role">—</small></div>
          <button class="auth-logout" id="auth-logout" type="button">Se déconnecter</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const elements = {
    close: overlay.querySelector('.auth-close'),
    loginView: document.getElementById('auth-login-view'),
    accountView: document.getElementById('auth-account-view'),
    form: document.getElementById('auth-form'),
    email: document.getElementById('auth-email'),
    password: document.getElementById('auth-password'),
    submit: document.getElementById('auth-submit'),
    error: document.getElementById('auth-error'),
    accountEmail: document.getElementById('auth-account-email'),
    accountName: document.getElementById('auth-account-name'),
    accountRole: document.getElementById('auth-account-role'),
    logout: document.getElementById('auth-logout')
  };

  function roleLabel(role) {
    return role === 'admin' ? 'Administrateur' : role === 'operator' ? 'Opérateur' : 'Profil non défini';
  }

  function showError(message = '') {
    elements.error.textContent = message;
    elements.error.hidden = !message;
  }

  function openModal() {
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => (currentSession ? elements.logout : elements.email).focus(), 0);
  }

  function closeModal() {
    overlay.hidden = true;
    document.body.style.overflow = '';
    showError('');
  }

  async function loadProfile(userId) {
    if (!userId) return null;
    const { data, error } = await client
      .from('profiles')
      .select('full_name,role,is_active')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Impossible de charger le profil utilisateur :', error);
      return null;
    }
    return data || null;
  }

  function renderAuthState() {
    const user = currentSession?.user || null;
    const connected = Boolean(user);
    userButton.classList.toggle('connected', connected);
    userButton.textContent = connected ? (currentProfile?.full_name || user.email || 'Compte connecté') : 'Se connecter';
    elements.loginView.hidden = connected;
    elements.accountView.hidden = !connected;

    if (connected) {
      elements.accountEmail.textContent = user.email || '—';
      elements.accountName.textContent = currentProfile?.full_name || '';
      elements.accountRole.textContent = roleLabel(currentProfile?.role);
    }
  }

  async function refreshSession(session) {
    currentSession = session || null;
    currentProfile = currentSession ? await loadProfile(currentSession.user.id) : null;
    renderAuthState();
    window.NEXIS_AUTH = Object.freeze({
      session: currentSession,
      profile: currentProfile,
      isAuthenticated: Boolean(currentSession),
      isAdmin: currentProfile?.role === 'admin' && currentProfile?.is_active === true
    });
    document.dispatchEvent(new CustomEvent('nexis:auth-changed', { detail: window.NEXIS_AUTH }));
  }

  async function signIn(event) {
    event.preventDefault();
    if (submitting) return;
    const email = elements.email.value.trim();
    const password = elements.password.value;
    if (!email || !password) {
      showError('Saisissez votre adresse e-mail et votre mot de passe.');
      return;
    }

    submitting = true;
    showError('');
    elements.submit.disabled = true;
    elements.submit.textContent = 'Connexion…';
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshSession(data.session);
      elements.password.value = '';
    } catch (error) {
      console.error('Erreur de connexion Nexis :', error);
      showError('Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe.');
    } finally {
      submitting = false;
      elements.submit.disabled = false;
      elements.submit.textContent = 'Se connecter';
    }
  }

  async function signOut() {
    elements.logout.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      await refreshSession(null);
      closeModal();
    } catch (error) {
      console.error('Erreur de déconnexion Nexis :', error);
      window.alert('Impossible de vous déconnecter pour le moment.');
    } finally {
      elements.logout.disabled = false;
    }
  }

  userButton.addEventListener('click', openModal);
  elements.close.addEventListener('click', closeModal);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !overlay.hidden) closeModal(); });
  elements.form.addEventListener('submit', signIn);
  elements.logout.addEventListener('click', signOut);

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => refreshSession(session), 0);
  });

  client.auth.getSession()
    .then(({ data }) => refreshSession(data.session))
    .catch((error) => console.error('Impossible de lire la session Supabase :', error));
})();