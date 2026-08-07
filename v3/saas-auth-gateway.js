(() => {
  'use strict';
  if (window.__NEXIS_SAAS_AUTH_GATEWAY__) return;
  window.__NEXIS_SAAS_AUTH_GATEWAY__ = true;

  if (!window.supabase?.createClient) return;
  const db = window.supabase.createClient();

  let resolveReady;
  let currentUser = null;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  const style = document.createElement('style');
  style.textContent = `
    .nexis-auth-gate{position:fixed;inset:0;z-index:30000;display:grid;grid-template-columns:minmax(420px,1.05fr) minmax(420px,.95fr);background:#f5f7fa;color:#182a40}
    .nexis-auth-gate[hidden]{display:none}.nexis-auth-brand{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:52px;overflow:hidden;background:#10243b;color:#fff}
    .nexis-auth-brand:after{content:"";position:absolute;width:520px;height:520px;right:-210px;bottom:-220px;border-radius:50%;background:radial-gradient(circle,rgba(255,143,24,.23),rgba(255,143,24,0) 68%)}
    .nexis-auth-logo{display:flex;align-items:center;gap:13px;position:relative;z-index:1}.nexis-auth-logo img{width:52px;height:52px;object-fit:contain}.nexis-auth-logo strong{display:block;font-size:22px;letter-spacing:.08em}.nexis-auth-logo small{display:block;margin-top:2px;color:#aebbc9;font-size:10px}
    .nexis-auth-pitch{position:relative;z-index:1;max-width:570px}.nexis-auth-pitch span{display:inline-flex;padding:6px 9px;border:1px solid rgba(255,255,255,.15);border-radius:999px;color:#ffc278;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.nexis-auth-pitch h1{margin:18px 0 12px;font-size:38px;line-height:1.06;letter-spacing:-.045em}.nexis-auth-pitch p{margin:0;max-width:520px;color:#b9c5d1;font-size:13px;line-height:1.7}
    .nexis-auth-benefits{position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:28px}.nexis-auth-benefit{padding:13px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.04)}.nexis-auth-benefit strong{display:block;font-size:10px}.nexis-auth-benefit small{display:block;margin-top:4px;color:#94a5b6;font-size:8.5px;line-height:1.4}
    .nexis-auth-foot{position:relative;z-index:1;color:#7f92a5;font-size:8.5px}
    .nexis-auth-side{display:grid;place-items:center;padding:34px}.nexis-auth-card{width:min(430px,100%);padding:30px;border:1px solid #dfe5ec;border-radius:20px;background:#fff;box-shadow:0 22px 65px rgba(28,48,72,.1)}
    .nexis-auth-card h2{margin:0;color:#172a40;font-size:23px;letter-spacing:-.035em}.nexis-auth-card>p{margin:7px 0 20px;color:#7a8797;font-size:10px;line-height:1.55}.nexis-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:19px;padding:4px;border-radius:11px;background:#f1f4f7}.nexis-auth-tab{height:34px;border:0;border-radius:8px;background:transparent;color:#6b7888;font:750 9px var(--font-ui,"Inter",sans-serif);cursor:pointer}.nexis-auth-tab.active{background:#fff;color:#1d334a;box-shadow:0 2px 8px rgba(28,48,72,.08)}
    .nexis-auth-form{display:grid;gap:12px}.nexis-auth-form[hidden]{display:none}.nexis-auth-form label{display:grid;gap:6px;color:#405168;font-size:9px;font-weight:750}.nexis-auth-form input{height:42px;width:100%;padding:0 11px;border:1px solid #d8e0e8;border-radius:9px;background:#fff;color:#22364d;font:inherit;font-size:11px;outline:none}.nexis-auth-form input:focus{border-color:#efa44f;box-shadow:0 0 0 3px rgba(255,139,20,.1)}
    .nexis-auth-submit{height:42px;margin-top:3px;border:0;border-radius:10px;background:linear-gradient(180deg,#ff9c22,#ff8500);color:#14233a;font:800 10px var(--font-ui,"Inter",sans-serif);cursor:pointer;box-shadow:0 7px 17px rgba(255,133,0,.22)}.nexis-auth-submit:disabled{opacity:.55;cursor:wait}.nexis-auth-link{padding:0;border:0;background:transparent;color:#c86b00;font:750 8.5px var(--font-ui,"Inter",sans-serif);cursor:pointer;text-align:left}.nexis-auth-message{padding:10px 11px;border-radius:9px;background:#f5f8fa;color:#516376;font-size:9px;line-height:1.45}.nexis-auth-message.error{background:#fff1f1;color:#a74149}.nexis-auth-message.success{background:#edf9f4;color:#087a59}.nexis-auth-legal{margin:15px 0 0;color:#9aa4af;font-size:7.8px;line-height:1.5;text-align:center}
    .nexis-user-menu-button{height:32px;padding:0 9px;border:1px solid #dce3ea;border-radius:10px;background:#fff;color:#405268;font:750 8px var(--font-ui,"Inter",sans-serif);cursor:pointer}
    @media(max-width:900px){.nexis-auth-gate{grid-template-columns:1fr}.nexis-auth-brand{display:none}.nexis-auth-side{padding:20px}.nexis-auth-card{padding:24px}}
  `;
  document.head.appendChild(style);

  const gate = document.createElement('section');
  gate.className = 'nexis-auth-gate';
  gate.id = 'nexis-auth-gate';
  gate.innerHTML = `
    <div class="nexis-auth-brand">
      <div class="nexis-auth-logo"><img src="nexis-logo.svg" alt="Nexis"><div><strong>NEXIS</strong><small>Pilotage transport & logistique</small></div></div>
      <div class="nexis-auth-pitch"><span>ERP Transport</span><h1>Pilotez votre société de transport depuis un seul endroit.</h1><p>Missions, flotte, dépenses, rentabilité, clients et facturation. Chaque entreprise dispose de son environnement privé et sécurisé.</p><div class="nexis-auth-benefits"><div class="nexis-auth-benefit"><strong>Flotte</strong><small>Suivi des camions et de leur rentabilité.</small></div><div class="nexis-auth-benefit"><strong>Exploitation</strong><small>Missions et dépenses centralisées.</small></div><div class="nexis-auth-benefit"><strong>Facturation</strong><small>Documents à l’identité de votre entreprise.</small></div></div></div>
      <div class="nexis-auth-foot">Nexis · Environnement de test SaaS</div>
    </div>
    <div class="nexis-auth-side"><div class="nexis-auth-card">
      <h2 id="nexis-auth-title">Bienvenue sur Nexis</h2><p id="nexis-auth-subtitle">Connectez-vous à votre espace entreprise ou créez votre compte.</p>
      <div class="nexis-auth-tabs"><button class="nexis-auth-tab active" type="button" data-auth-tab="login">Connexion</button><button class="nexis-auth-tab" type="button" data-auth-tab="signup">Créer mon entreprise</button></div>
      <form class="nexis-auth-form" id="nexis-login-form">
        <label>Adresse e-mail<input id="nexis-login-email" type="email" autocomplete="email" required placeholder="vous@entreprise.com"></label>
        <label>Mot de passe<input id="nexis-login-password" type="password" autocomplete="current-password" required minlength="6" placeholder="••••••••"></label>
        <button class="nexis-auth-link" id="nexis-forgot-password" type="button">Mot de passe oublié ?</button>
        <div class="nexis-auth-message" id="nexis-login-message" hidden></div>
        <button class="nexis-auth-submit" type="submit">Se connecter</button>
      </form>
      <form class="nexis-auth-form" id="nexis-signup-form" hidden>
        <label>Nom de l’entreprise<input id="nexis-signup-company" type="text" autocomplete="organization" required placeholder="Ex. Transports Diallo SARL"></label>
        <label>Votre nom<input id="nexis-signup-name" type="text" autocomplete="name" required placeholder="Prénom et nom"></label>
        <label>Adresse e-mail<input id="nexis-signup-email" type="email" autocomplete="email" required placeholder="vous@entreprise.com"></label>
        <label>Mot de passe<input id="nexis-signup-password" type="password" autocomplete="new-password" required minlength="8" placeholder="8 caractères minimum"></label>
        <div class="nexis-auth-message" id="nexis-signup-message" hidden></div>
        <button class="nexis-auth-submit" type="submit">Créer mon espace Nexis</button>
      </form>
      <p class="nexis-auth-legal">En créant un compte, vous créez un espace entreprise privé. Les données de votre société sont isolées de celles des autres transporteurs.</p>
    </div></div>`;
  document.body.appendChild(gate);

  const loginForm = document.getElementById('nexis-login-form');
  const signupForm = document.getElementById('nexis-signup-form');

  function showMessage(id, text = '', type = '') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `nexis-auth-message${type ? ` ${type}` : ''}`;
    el.hidden = !text;
  }

  function setTab(tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(button => button.classList.toggle('active', button.dataset.authTab === tab));
    loginForm.hidden = tab !== 'login';
    signupForm.hidden = tab !== 'signup';
    showMessage('nexis-login-message');
    showMessage('nexis-signup-message');
  }

  document.querySelectorAll('[data-auth-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.authTab)));

  function addLogoutControl(user) {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || document.getElementById('nexis-logout')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'nexis-logout';
    button.className = 'nexis-user-menu-button';
    button.textContent = 'Déconnexion';
    button.title = user?.email || 'Se déconnecter';
    button.addEventListener('click', async () => {
      button.disabled = true;
      await db.auth.signOut();
      location.reload();
    });
    actions.appendChild(button);
  }

  async function completeAuth(user) {
    currentUser = user;
    gate.hidden = true;
    document.body.classList.add('nexis-authenticated');
    addLogoutControl(user);
    resolveReady(user);
    window.dispatchEvent(new CustomEvent('nexis:authenticated', { detail: { user } }));
  }

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    showMessage('nexis-login-message');
    try {
      const email = document.getElementById('nexis-login-email').value.trim();
      const password = document.getElementById('nexis-login-password').value;
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.user) throw new Error('Connexion impossible.');
      showMessage('nexis-login-message', 'Connexion réussie…', 'success');
      await completeAuth(data.user);
      location.reload();
    } catch (error) {
      console.error('Connexion Nexis :', error);
      showMessage('nexis-login-message', 'E-mail ou mot de passe incorrect.', 'error');
    } finally {
      submit.disabled = false;
    }
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = signupForm.querySelector('[type="submit"]');
    submit.disabled = true;
    showMessage('nexis-signup-message');
    try {
      const companyName = document.getElementById('nexis-signup-company').value.trim();
      const fullName = document.getElementById('nexis-signup-name').value.trim();
      const email = document.getElementById('nexis-signup-email').value.trim();
      const password = document.getElementById('nexis-signup-password').value;
      if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { company_name: companyName, full_name: fullName },
          emailRedirectTo: `${location.origin}${location.pathname}`
        }
      });
      if (error) throw error;

      if (data?.session && data?.user) {
        showMessage('nexis-signup-message', 'Votre espace entreprise est prêt…', 'success');
        await completeAuth(data.user);
        location.reload();
      } else {
        showMessage('nexis-signup-message', 'Compte créé. Vérifiez votre e-mail pour confirmer votre inscription, puis connectez-vous.', 'success');
      }
    } catch (error) {
      console.error('Inscription Nexis :', error);
      showMessage('nexis-signup-message', error.message || 'Création du compte impossible.', 'error');
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById('nexis-forgot-password').addEventListener('click', async () => {
    const email = document.getElementById('nexis-login-email').value.trim();
    if (!email) return showMessage('nexis-login-message', 'Indiquez d’abord votre adresse e-mail.', 'error');
    try {
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
      if (error) throw error;
      showMessage('nexis-login-message', 'Un lien de réinitialisation a été envoyé par e-mail.', 'success');
    } catch (error) {
      showMessage('nexis-login-message', error.message || 'Envoi impossible.', 'error');
    }
  });

  async function initialize() {
    const { data, error } = await db.auth.getSession();
    if (error) console.error('Session Nexis :', error);
    const user = data?.session?.user || null;
    if (user) {
      await completeAuth(user);
    } else {
      gate.hidden = false;
      document.body.classList.remove('nexis-authenticated');
    }
  }

  window.NexisAuth = {
    ready,
    user: () => currentUser,
    client: db
  };

  initialize();
})();
