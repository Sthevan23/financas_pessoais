/**
 * Camada de persistência - LocalStorage com criptografia
 */

const Database = {
  /** Obtém chave de storage */
  _key(collection) {
    return CONFIG.STORAGE_PREFIX + collection;
  },

  /** Salva dados brutos (sem criptografia - usuários) */
  _saveRaw(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  /** Carrega dados brutos */
  _loadRaw(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  /** Salva coleção criptografada para o usuário logado */
  async saveEncrypted(collection, data) {
    if (!AppState.currentUser || !AppState.sessionKey) return false;
    const user = AppState.currentUser;
    const encrypted = await CryptoModule.encrypt(data, AppState.sessionKey, user.salt);
    localStorage.setItem(this._key(`${collection}_${user.id}`), encrypted);
    return true;
  },

  /** Carrega coleção criptografada */
  async loadEncrypted(collection) {
    if (!AppState.currentUser || !AppState.sessionKey) return [];
    const user = AppState.currentUser;
    const encrypted = localStorage.getItem(this._key(`${collection}_${user.id}`));
    if (!encrypted) return [];
    const data = await CryptoModule.decrypt(encrypted, AppState.sessionKey, user.salt);
    return data || [];
  },

  // ========== USUÁRIOS ==========
  getUsers() {
    return this._loadRaw(this._key('users')) || [];
  },

  saveUsers(users) {
    this._saveRaw(this._key('users'), users);
  },

  findUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  // ========== TRANSAÇÕES ==========
  async getTransactions() {
    return await this.loadEncrypted('transactions');
  },

  async saveTransactions(transactions) {
    return await this.saveEncrypted('transactions', transactions);
  },

  async addTransaction(transaction) {
    const transactions = await this.getTransactions();
    transactions.push(transaction);
    await this.saveTransactions(transactions);
    return transaction;
  },

  async updateTransaction(id, updates) {
    const transactions = await this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;
    transactions[index] = { ...transactions[index], ...updates };
    await this.saveTransactions(transactions);
    return transactions[index];
  },

  async deleteTransaction(id) {
    let transactions = await this.getTransactions();
    transactions = transactions.filter(t => t.id !== id && t.parentId !== id);
    await this.saveTransactions(transactions);
  },

  // ========== CATEGORIAS ==========
  async getCategories() {
    return await this.loadEncrypted('categories');
  },

  async saveCategories(categories) {
    return await this.saveEncrypted('categories', categories);
  },

  async initDefaultCategories(userId) {
    const categories = CONFIG.DEFAULT_CATEGORIES.map(cat => ({
      id: generateId(),
      userId,
      ...cat
    }));
    await this.saveCategories(categories);
    return categories;
  },

  // ========== METAS ==========
  async getGoals() {
    return await this.loadEncrypted('goals');
  },

  async saveGoals(goals) {
    return await this.saveEncrypted('goals', goals);
  },

  // ========== CARTÕES ==========
  async getCreditCards() {
    return await this.loadEncrypted('creditCards');
  },

  async saveCreditCards(cards) {
    return await this.saveEncrypted('creditCards', cards);
  },

  // ========== CONFIGURAÇÕES ==========
  async getSettings() {
    const settings = await this.loadEncrypted('settings');
    return settings || { theme: 'light', sidebarCollapsed: false };
  },

  async saveSettings(settings) {
    return await this.saveEncrypted('settings', settings);
  },

  // ========== BACKUP / RESTORE ==========
  async exportAllData() {
    return {
      version: CONFIG.VERSION,
      exportedAt: new Date().toISOString(),
      user: { name: AppState.currentUser.name, email: AppState.currentUser.email },
      transactions: await this.getTransactions(),
      categories: await this.getCategories(),
      goals: await this.getGoals(),
      creditCards: await this.getCreditCards(),
      settings: await this.getSettings()
    };
  },

  async importAllData(data) {
    if (!data.transactions || !data.categories) {
      throw new Error('Arquivo de backup inválido');
    }
    await this.saveTransactions(data.transactions);
    await this.saveCategories(data.categories);
    await this.saveGoals(data.goals || []);
    await this.saveCreditCards(data.creditCards || []);
    if (data.settings) await this.saveSettings(data.settings);
  },

  /** Limpa todos os dados do usuário atual */
  async clearUserData() {
    if (!AppState.currentUser) return;
    const uid = AppState.currentUser.id;
    ['transactions', 'categories', 'goals', 'creditCards', 'settings'].forEach(col => {
      localStorage.removeItem(this._key(`${col}_${uid}`));
    });
    await this.initDefaultCategories(uid);
  }
};
