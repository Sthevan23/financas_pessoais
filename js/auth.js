/**
 * Módulo de autenticação - Supabase Auth
 */

const Auth = {
  /** Inicializa eventos de autenticação */
  init() {
    if (!isSupabaseConfigured()) {
      this.showConfigWarning();
    }

    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
    document.getElementById('recovery-form').addEventListener('submit', (e) => this.handleRecovery(e));

    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => this.showForm(tab.dataset.authTab));
    });

    document.getElementById('show-recovery').addEventListener('click', (e) => {
      e.preventDefault();
      this.showForm('recovery');
    });

    document.getElementById('show-login-from-recovery').addEventListener('click', (e) => {
      e.preventDefault();
      this.showForm('login');
    });

    document.getElementById('btn-logout').addEventListener('click', () => this.logout());

    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        btn.querySelector('i').className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      });
    });

    this.checkSession();
  },

  /** Aviso quando Supabase não está configurado */
  showConfigWarning() {
    const container = document.querySelector('.auth-container');
    if (!container || document.getElementById('supabase-warning')) return;

    const warning = document.createElement('div');
    warning.id = 'supabase-warning';
    warning.className = 'supabase-warning';
    warning.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation"></i>
      <strong>Supabase não configurado.</strong>
      Edite o arquivo <code>js/supabase-config.js</code> com sua URL e chave do projeto.
      Veja o README para instruções.
    `;
    container.prepend(warning);
  },

  /** Alterna formulários de auth */
  showForm(form) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`${form}-form`).classList.add('active');

    const tabs = document.querySelector('.auth-tabs');
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.authTab === form);
    });

    if (tabs) {
      tabs.classList.toggle('hidden', form === 'recovery');
    }
  },

  /** Verifica sessão existente */
  async checkSession() {
    const client = getSupabase();
    if (!client) {
      this.showAuth();
      return;
    }

    const { data: { session } } = await client.auth.getSession();

    if (session) {
      await this.setUserFromSession(session);
      this.showApp();
    } else {
      this.showAuth();
    }

    client.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.setUserFromSession(session);
      } else if (event === 'SIGNED_OUT') {
        AppState.currentUser = null;
      }
    });
  },

  /** Carrega dados do usuário da sessão Supabase */
  async setUserFromSession(session) {
    const client = getSupabase();
    const { data: profile } = await client
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .maybeSingle();

    AppState.currentUser = {
      id: session.user.id,
      email: session.user.email,
      name: profile?.name || session.user.user_metadata?.name || 'Usuário'
    };
  },

  /** Login do usuário */
  async handleLogin(e) {
    e.preventDefault();
    if (!getSupabase()) {
      showToast('Configure o Supabase primeiro', 'error');
      return;
    }

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;

      await this.setUserFromSession(data.session);
      showToast(`Bem-vindo, ${AppState.currentUser.name}!`, 'success');
      this.showApp();
    } catch (err) {
      showToast(err.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos'
        : err.message, 'error');
    }
  },

  /** Cadastro de novo usuário */
  async handleRegister(e) {
    e.preventDefault();
    if (!getSupabase()) {
      showToast('Configure o Supabase primeiro', 'error');
      return;
    }

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
      showToast('As senhas não coincidem', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    try {
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;

      if (data.session) {
        await this.setUserFromSession(data.session);
        await Database.initDefaultCategories(data.user.id);
        showToast('Conta criada com sucesso!', 'success');
        this.showApp();
      } else {
        showToast('Conta criada! Verifique seu e-mail para confirmar o cadastro.', 'info');
        this.showForm('login');
      }
    } catch (err) {
      showToast(err.message.includes('already registered')
        ? 'Este e-mail já está cadastrado'
        : err.message, 'error');
    }
  },

  /** Recuperação de senha via e-mail Supabase */
  async handleRecovery(e) {
    e.preventDefault();
    if (!getSupabase()) {
      showToast('Configure o Supabase primeiro', 'error');
      return;
    }

    const email = document.getElementById('recovery-email').value.trim();

    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;

      showToast('Link de recuperação enviado para seu e-mail!', 'success');
      this.showForm('login');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  /** Logout */
  async logout() {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    AppState.currentUser = null;
    App.initialized = false;
    this.showAuth();
    showToast('Você saiu da conta', 'info');
  },

  /** Exibe tela de autenticação */
  showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  },

  /** Exibe aplicação principal */
  showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('user-name-display').textContent = AppState.currentUser.name;
    App.init();
  }
};
