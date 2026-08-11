(() => {
  'use strict';
  if (window.__NEXIS_INVITE_AUTH_BRIDGE__) return;
  window.__NEXIS_INVITE_AUTH_BRIDGE__ = true;

  // Charge le nettoyage de la barre supérieure pour tous les utilisateurs,
  // même lorsqu'aucun lien d'invitation n'est présent.
  if (!document.getElementById('nexis-topbar-cleanup-script')) {
    const cleanup = document.createElement('script');
    cleanup.id = 'nexis-topbar-cleanup-script';
    cleanup.src = 'topbar-cleanup.js?v=20260811-clean-1';
    cleanup.defer = true;
    document.body.appendChild(cleanup);
  }

  if (!window.supabase?.createClient) return;

  const params = new URLSearchParams(location.search);
  const token = params.get('invite');
  const invitedEmail = params.get('email');
  if (!token) return;

  const db = window.supabase.createClient();
  const roleLabel = role => ({admin:'Administrateur',operator:'Exploitant',accountant:'Comptable'})[role] || role || 'Collaborateur';

  async function prepare() {
    const form = document.getElementById('nexis-signup-form');
    if (!form) return window.setTimeout(prepare, 80);

    const companyInput = document.getElementById('nexis-signup-company');
    const emailInput = document.getElementById('nexis-signup-email');
    const title = document.getElementById('nexis-auth-title');
    const subtitle = document.getElementById('nexis-auth-subtitle');
    const signupTab = document.querySelector('[data-auth-tab="signup"]');
    const loginTab = document.querySelector('[data-auth-tab="login"]');

    try {
      const { data, error } = await db.rpc('get_public_invitation', { invitation_token: token });
      if (error) throw error;
      const invitation = Array.isArray(data) ? data[0] : data;
      if (!invitation || !invitation.valid) throw new Error('Cette invitation est invalide ou expirée.');

      if (title) title.textContent = `Rejoindre ${invitation.organization_name}`;
      if (subtitle) subtitle.textContent = `Vous avez été invité comme ${roleLabel(invitation.role)}.`;
      if (signupTab) signupTab.textContent = 'Accepter l’invitation';
      if (companyInput) {
        companyInput.value = invitation.organization_name || '';
        companyInput.closest('label').hidden = true;
        companyInput.required = false;
      }
      if (emailInput) {
        emailInput.value = invitation.email || invitedEmail || '';
        emailInput.readOnly = true;
      }
      signupTab?.click();

      form.addEventListener('submit', async event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const submit = form.querySelector('[type="submit"]');
        const message = document.getElementById('nexis-signup-message');
        submit.disabled = true;
        if (message) message.hidden = true;
        try {
          const fullName = document.getElementById('nexis-signup-name').value.trim();
          const email = emailInput.value.trim();
          const password = document.getElementById('nexis-signup-password').value;
          if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');

          const { data: signupData, error: signupError } = await db.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, invitation_token: token },
              emailRedirectTo: window.NEXIS_ENVIRONMENT?.appUrl || `${location.origin}/`
            }
          });
          if (signupError) throw signupError;

          if (message) {
            message.className = 'nexis-auth-message success';
            message.textContent = signupData?.session ? 'Invitation acceptée. Ouverture de votre espace…' : 'Compte créé. Vérifiez votre e-mail pour confirmer votre accès.';
            message.hidden = false;
          }

          if (signupData?.session) {
            const clean = new URL(location.href);
            clean.searchParams.delete('invite');
            clean.searchParams.delete('email');
            history.replaceState(null, '', clean.pathname + clean.hash);
            location.reload();
          }
        } catch (error) {
          if (message) {
            message.className = 'nexis-auth-message error';
            message.textContent = error.message || 'Impossible d’accepter l’invitation.';
            message.hidden = false;
          }
        } finally {
          submit.disabled = false;
        }
      }, true);
    } catch (error) {
      if (title) title.textContent = 'Invitation indisponible';
      if (subtitle) subtitle.textContent = error.message || 'Cette invitation ne peut plus être utilisée.';
      signupTab?.setAttribute('disabled','disabled');
      loginTab?.click();
    }
  }

  prepare();
})();
