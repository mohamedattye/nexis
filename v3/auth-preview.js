(() => {
  'use strict';

  if (!window.supabase?.createClient) return;

  document.documentElement.classList.add('auth-checking');

  const client = window.supabase.createClient();
  const allowedRoles = new Set(['admin', 'operator']);
  let currentSession = null;
  let currentProfile = null;
  let submitting = false;
  let modalOpenedByUser = false;
  let refreshSequence = 0;

  const style = document.createElement('style');
  style.textContent = `
    html.auth-checking body{background:#f2f5f9}
    html.auth-checking body>.sidebar,
    html.auth-checking body>.workspace,
    html.auth-checking body>.mission-drawer-shell,
    html.auth-checking body>.toast{visibility:hidden!important}
    body.auth-locked{overflow:hidden!important;background:#f2f5f9}
    body.auth-locked>.sidebar,
    body.auth-locked>.workspace,
    body.auth-locked>.mission-drawer-shell,
    body.auth-locked>.toast{display:none!important}
    #auth-login-view[hidden],#auth-account-view[hidden],#auth-loading-view[hidden],.auth-overlay[hidden]{display:none!important}
    .auth-user-button{height:34px;display:inline-flex;align-items:center;gap:8px;border:1px solid #d8e0ea;border-radius:999px;background:#fff;padding:0 11px;font:inherit;font-size:10px;font-weight:800;color:#314156;cursor:pointer;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .auth-user-button:hover{background:#f7f9fb}.auth-user-button:before{content:"";width:7px;height:7px;border-radius:50%;background:#19a779;flex:0 0 auto}
    .auth-overlay{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:22px;background:rgba(10,25,44,.58);backdrop-filter:blur(6px)}
    body.auth-locked .auth-overlay{background:radial-gradient(circle at top,#f7f9fc 0,#edf2f7 52%,#e7edf4 100%);backdrop-filter:none}
    .auth-card{width:min(430px,100%);background:#fff;border:1px solid #dbe2eb;border-radius:16px;box-shadow:0 24px 70px rgba(6,22,40,.28);overflow:hidden}
    body.auth-locked .auth-card{box-shadow:0 24px 65px rgba(22,41,65,.18)}
    .auth-card-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:18px 19px;border-bottom:1px solid #e8edf3;background:#fbfcfe}
    .auth-card-brand{display:flex;align-items:center;gap:11px}.auth-card-brand img{width:42px;height:42px;border-radius:11px}.auth-card-brand strong,.auth-card-brand small{display:block}.auth-card-brand strong{font-size:15px;color:#172942}.auth-card-brand small{font-size:9px;color:#7b8796;margin-top:3px}
    .auth-close{width:34px;height:34px;border:1px solid #dce3eb;border-radius:8px;background:#fff;font-size:18px;cursor:pointer;color:#556376}.auth-close:hover{background:#f5f7fa}.auth-close[hidden]{display:none!important}
    .auth-card-body{padding:20px}.auth-intro h2{margin:0;font-size:20px;color:#172942}.auth-intro p{margin:7px 0 17px;font-size:11px;line-height:1.5;color:#6f7b8b}
    .auth-form{display:grid;gap:13px}.auth-form label{font-size:10px;font-weight:800;color:#3c4c61}.auth-form input{width:100%;height:43px;margin-top:6px;border:1px solid #cfd8e3;border-radius:8px;padding:0 11px;font:inherit;font-size:12px;outline:none;color:#21334a}.auth-form input:focus{border-color:#e9983e;box-shadow:0 0 0 3px rgba(255,139,20,.12)}
    .auth-submit{height:43px;border:0;border-radius:8px;background:linear-gradient(180deg,#ff9c22,#ff8500);font:inherit;font-size:12px;font-weight:850;color:#17263b;cursor:pointer;box-shadow:0 7px 17px rgba(255,133,0,.23)}.auth-submit:disabled{opacity:.6;cursor:wait}
    .auth-error{margin:0;padding:10px 11px;border:1px solid #ffd0d4;border-radius:8px;background:#fff1f2;color:#b33b43;font-size:10px;line-height:1.45}.auth-error[hidden]{display:none!important}
    .auth-security-note{margin:14px 0 0;padding:10px 11px;border:1px solid #dce5ef;border-radius:8px;background:#f7f9fc;color:#647185;font-size:9px;line-height:1.5}
    .auth-account{display:grid;gap:13px}.auth-account-box{padding:14px;border:1px solid #e1e7ef;border-radius:9px;background:#f8fafc}.auth-account-box span,.auth-account-box strong,.auth-account-box small{display:block}.auth-account-box span{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#7e8998;font-weight:800}.auth-account-box strong{margin-top:6px;font-size:13px;color:#203149;word-break:break-word}.auth-account-box small{margin-top:5px;font-size:10px;color:#687587}.auth-role{display:inline-flex!important;width:max-content;margin-top:9px!important;padding:5px 8px;border-radius:999px;background:#eaf8f2;color:#087b58!important;font-size:9px!important;font-weight:850}
    .auth-logout{height:41px;border:1px solid #efc8cc;border-radius:8px;background:#fff;color:#b33b43;font:inherit;font-size:11px;font-weight:800;cursor:pointer}.auth-logout:hover{background:#fff5f5}.auth-logout:disabled{opacity:.6;cursor:wait}
    .auth-loading{display:grid;place-items:center;gap:12px;padding:16px 0 10px;text-align:center}.auth-spinner{width:32px;height:32px;border:3px solid #e4eaf1;border-top-color:#ff8a00;border-radius:50%;animation:auth-spin .8s linear infinite}.auth-loading strong{font-size:13px;color:#26384f}.auth-loading small{font-size:10px;color:#768293}
    @keyframes auth-spin{to{transform:rotate(360deg)}}
    @media(max-width:740px){.auth-user-button{max-width:135px}.environment-badge{display:none!important}.auth-overlay{padding:13px}.auth-card{border-radius:13px}}
  `;
  document.head.appendChild(style);

  const topbarActions = document.querySelector('.topbar-actions');
  if (!topbarActions) {
    document.documentElement.classList.remove('auth-checking');
    return;
  }

  const userButton = document.createElement('button');
  userButton.type = 'button';
  userButton.className = 'auth-user-button';
  userButton.textContent = 'Compte';
  userButton.hidden = true;
  const createButton = topbarActions.querySelector('.primary[data-view="new-trip"]');
  topbarActions.insertBefore(userButton, createButton || null);

  const overlay = document.createElement('section');
  overlay.className = 'auth-overlay';
  overlay.setAttribute('aria-label', 'Connexion Nexis');
  overlay.innerHTML = `
    <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <header class="auth-card-head">
        <div class="auth-card-brand"><img src="nexis-logo.svg?v=20260724-fix-2" alt="Logo Nexis"><div><strong>NEXIS</strong><small>Accès sécurisé — environnement test</small></div></div>
        <button class="auth-close" type="button" aria-label="Fermer" hidden>×</button>
      </header>
      <div class="auth-card-body">
        <div class="auth-loading" id="auth-loading-view">
          <span class="auth-spinner" aria-hidden="true"></span>
          <strong>Vérification de la session</strong>
          <small>Connexion sécurisée à Nexis…</small>
        </div>
        <div id="auth-login-view" hidden>
          <div class="auth-intro"><h2 id="auth-title">Connexion</h2><p>Identifiez-vous pour accéder à la plateforme Nexis.</p></div>
          <form class="auth-form" id="auth-form">
            <label>Adresse e-mail<input id="auth-email" type="email" autocomplete="username" required></label>
            <label>Mot de passe<input id="auth-password" type="password" autocomplete="current-password" required></label>
            <p class="auth-error" id="auth-error" role="alert" hidden></p>
            <button class="auth-submit" id="auth-submit" type="submit">Se connecter</button>
          </form>
          <p class="auth-security-note">Accès réservé aux comptes actifs autorisés par Nexis.</p>
        </div>
        <div class="auth-account" id="auth-account-view" hidden>
          <div class="auth-intro"><h2>Compte connecté</h2><p>Votre session Supabase est active.</p></div>
          <div class="auth-account-box"><span>Utilisateur</span><strong id="auth-account-email">—</strong><small id="auth-account-name"></small><small class="auth-role" id="auth-account-role">—</small></div>
          <button class="auth-logout" id="auth-logout" type="button">Se déconnecter</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const elements = {
    close: overlay.querySelector('.auth-close'),
    loadingView: document.getElementById('auth-loading-view'),
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
    return role === 'admin' ? 'Administrateur' : role === 'operator' ? 'Opérateur' : 'Profil non autorisé';
  }

  function isAuthorized() {
    return Boolean(
      currentSession?.user &&
      currentProfile?.is_active === true &&
      allowedRoles.has(currentProfile?.role)
    );
  }

  function showError(message = '') {
    elements.error.textContent = message;
    elements.error.hidden = !message;
  }

  function publishAuthState() {
    window.NEXIS_AUTH = Object.freeze({
      session: currentSession,
      profile: currentProfile,
      isAuthenticated: Boolean(currentSession),
      isAuthorized: isAuthorized(),
      isAdmin: currentProfile?.role === 'admin' && currentProfile?.is_active === true
    });
    document.dispatchEvent(new CustomEvent('nexis:auth-changed', { detail: window.NEXIS_AUTH }));
  }

  function renderGate() {
    const authorized = isAuthorized();

    document.documentElement.classList.remove('auth-checking');
    document.body.classList.toggle('auth-locked', !authorized);
    userButton.hidden = !authorized;
    elements.loadingView.hidden = true;
    elements.close.hidden = !authorized;

    if (authorized) {
      userButton.textContent = currentProfile?.full_name || currentSession.user.email || 'Compte connecté';
      elements.accountEmail.textContent = currentSession.user.email || '—';
      elements.accountName.textContent = currentProfile?.full_name || '';
      elements.accountRole.textContent = roleLabel(currentProfile?.role);
      elements.loginView.hidden = true;
      elements.accountView.hidden = !modalOpenedByUser;
      overlay.hidden = !modalOpenedByUser;
      document.body.style.overflow = modalOpenedByUser ? 'hidden' : '';
    } else {
      userButton.textContent = 'Compte';
      elements.accountView.hidden = true;
      elements.loginView.hidden = false;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => elements.email.focus(), 0);
    }

    publishAuthState();
  }

  async function loadProfile(userId) {
    if (!userId) return null;
    const { data, error } = await client
      .from('profiles')
      .select('full_name,role,is_active')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function refreshSession(session) {
    const sequence = ++refreshSequence;
    currentSession = session || null;
    currentProfile = null;

    if (currentSession?.user) {
      try {
        currentProfile = await loadProfile(currentSession.user.id);
      } catch (error) {
        console.error('Impossible de charger le profil utilisateur :', error);
        showError('Votre profil Nexis ne peut pas être vérifié. Réessayez dans quelques instants.');
      }
    }

    if (sequence !== refreshSequence) return;

    if (currentSession && !isAuthorized() && !elements.error.textContent) {
      showError('Ce compte est inactif ou ne dispose pas des autorisations nécessaires.');
    }

    renderGate();
  }

  function openAccountModal() {
    if (!isAuthorized()) return;
    modalOpenedByUser = true;
    showError('');
    renderGate();
    window.setTimeout(() => elements.logout.focus(), 0);
  }

  function closeAccountModal() {
    if (!isAuthorized()) return;
    modalOpenedByUser = false;
    renderGate();
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

      if (!isAuthorized()) {
        await client.auth.signOut();
        currentSession = null;
        currentProfile = null;
        showError('Ce compte ne dispose pas d’un accès actif à Nexis.');
        renderGate();
        return;
      }

      elements.password.value = '';
      modalOpenedByUser = false;
      renderGate();
    } catch (error) {
      console.error('Erreur de connexion Nexis :', error);
      showError('Connexion impossible. Vérifiez votre adresse e-mail et votre mot de passe.');
      currentSession = null;
      currentProfile = null;
      renderGate();
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
      modalOpenedByUser = false;
      currentSession = null;
      currentProfile = null;
      elements.email.value = '';
      elements.password.value = '';
      showError('');
      renderGate();
    } catch (error) {
      console.error('Erreur de déconnexion Nexis :', error);
      window.alert('Impossible de vous déconnecter pour le moment.');
    } finally {
      elements.logout.disabled = false;
    }
  }

  userButton.addEventListener('click', openAccountModal);
  elements.close.addEventListener('click', closeAccountModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay && isAuthorized()) closeAccountModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden && isAuthorized()) closeAccountModal();
  });
  elements.form.addEventListener('submit', signIn);
  elements.logout.addEventListener('click', signOut);

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => refreshSession(session), 0);
  });

  client.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      return refreshSession(data.session);
    })
    .catch((error) => {
      console.error('Impossible de lire la session Supabase :', error);
      currentSession = null;
      currentProfile = null;
      showError('La session n’a pas pu être vérifiée. Vous pouvez vous reconnecter.');
      renderGate();
    });
})();