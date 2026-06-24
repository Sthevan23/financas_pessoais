/**
 * Módulo de autenticação - Login, Cadastro e Recuperação de Senha
 */

const Auth = {
  /** Inicializa eventos de autenticação */
  init() {
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
    document.getElementById('recovery-form').addEventListener('submit', (e) => this.handleRecovery(e));
    document.getElementById('btn-reset-password').addEventListener('click', () => this.handleResetPassword());

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
  checkSession() {
    const session = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'session');
    if (session) {
      try {
        const { userId, sessionKey } = JSON.parse(session);
        const user = Database.getUsers().find(u => u.id === userId);
        if (user) {
          AppState.currentUser = user;
          AppState.sessionKey = sessionKey;
          this.showApp();
          return;
        }
      } catch { /* sessão inválida */ }
    }
    this.showAuth();
  },

  /** Login do usuário */
  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const user = Database.findUserByEmail(email);
    if (!user) {
      showToast('E-mail ou senha incorretos', 'error');
      return;
    }

    const hash = await CryptoModule.hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      showToast('E-mail ou senha incorretos', 'error');
      return;
    }

    AppState.currentUser = user;
    AppState.sessionKey = password;
    localStorage.setItem(CONFIG.STORAGE_PREFIX + 'session', JSON.stringify({
      userId: user.id,
      sessionKey: password
    }));

    showToast(`Bem-vindo, ${user.name}!`, 'success');
    this.showApp();
  },

  /** Cadastro de novo usuário */
  async handleRegister(e) {
    e.preventDefault();
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
    if (Database.findUserByEmail(email)) {
      showToast('Este e-mail já está cadastrado', 'error');
      return;
    }

    const salt = CryptoModule.generateSalt();
    const passwordHash = await CryptoModule.hashPassword(password, salt);

    const user = {
      id: generateId(),
      name,
      email,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      recoveryToken: null
    };

    const users = Database.getUsers();
    users.push(user);
    Database.saveUsers(users);

    AppState.currentUser = user;
    AppState.sessionKey = password;
    localStorage.setItem(CONFIG.STORAGE_PREFIX + 'session', JSON.stringify({
      userId: user.id,
      sessionKey: password
    }));

    await Database.initDefaultCategories(user.id);

    showToast('Conta criada com sucesso!', 'success');
    this.showApp();
  },

  /** Solicita token de recuperação */
  async handleRecovery(e) {
    e.preventDefault();
    const email = document.getElementById('recovery-email').value.trim();
    const user = Database.findUserByEmail(email);

    if (!user) {
      showToast('E-mail não encontrado', 'error');
      return;
    }

    const token = CryptoModule.generateRecoveryToken();
    user.recoveryToken = token;
    user.recoveryTokenExpiry = Date.now() + 3600000;

    const users = Database.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    users[index] = user;
    Database.saveUsers(users);

    document.getElementById('recovery-token-section').classList.remove('hidden');
    showToast(`Token gerado: ${token}`, 'info');
  },

  /** Redefine senha com token */
  async handleResetPassword() {
    const email = document.getElementById('recovery-email').value.trim();
    const token = document.getElementById('recovery-token').value.trim();
    const newPassword = document.getElementById('recovery-new-password').value;

    const user = Database.findUserByEmail(email);
    if (!user || user.recoveryToken !== token) {
      showToast('Token inválido', 'error');
      return;
    }
    if (user.recoveryTokenExpiry && Date.now() > user.recoveryTokenExpiry) {
      showToast('Token expirado. Solicite um novo.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    const salt = CryptoModule.generateSalt();
    user.passwordHash = await CryptoModule.hashPassword(newPassword, salt);
    user.salt = salt;
    user.recoveryToken = null;
    user.recoveryTokenExpiry = null;

    const users = Database.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    users[index] = user;
    Database.saveUsers(users);

    showToast('Senha redefinida com sucesso!', 'success');
    this.showForm('login');
  },

  /** Logout */
  logout() {
    AppState.currentUser = null;
    AppState.sessionKey = null;
    localStorage.removeItem(CONFIG.STORAGE_PREFIX + 'session');
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
