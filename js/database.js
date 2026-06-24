/**
 * Camada de persistência - Supabase (PostgreSQL)
 */

const Database = {
  /** Trata erros do Supabase */
  _handleError(error, context) {
    if (error) {
      console.error(`[Database] ${context}:`, error);
      throw new Error(error.message || 'Erro ao acessar o banco de dados');
    }
  },

  _sb() {
    const client = getSupabase();
    if (!client) throw new Error('Supabase não configurado. Edite js/supabase-config.js');
    return client;
  },

  // ========== MAPEAMENTO DB ↔ APP ==========

  _mapCategory(row) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      icon: row.icon,
      color: row.color
    };
  },

  _unmapCategory(cat) {
    return {
      id: cat.id,
      user_id: cat.userId || getUserId(),
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color
    };
  },

  _mapTransaction(row) {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      description: row.description,
      amount: parseFloat(row.amount),
      date: row.date,
      categoryId: row.category_id,
      paymentMethod: row.payment_method,
      notes: row.notes,
      installments: row.installments,
      installmentNumber: row.installment_number,
      parentId: row.parent_id,
      dueDate: row.due_date,
      paid: row.paid,
      creditCardId: row.credit_card_id
    };
  },

  _unmapTransaction(t) {
    return {
      id: t.id,
      user_id: t.userId || getUserId(),
      type: t.type,
      description: t.description,
      amount: t.amount,
      date: t.date,
      category_id: t.categoryId || null,
      payment_method: t.paymentMethod || null,
      notes: t.notes || null,
      installments: t.installments || null,
      installment_number: t.installmentNumber || null,
      parent_id: t.parentId || null,
      due_date: t.dueDate || null,
      paid: t.paid !== false,
      credit_card_id: t.creditCardId || null
    };
  },

  _mapGoal(row) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      targetAmount: parseFloat(row.target_amount),
      currentAmount: parseFloat(row.current_amount),
      deadline: row.deadline,
      createdAt: row.created_at
    };
  },

  _unmapGoal(g) {
    return {
      id: g.id,
      user_id: g.userId || getUserId(),
      name: g.name,
      target_amount: g.targetAmount,
      current_amount: g.currentAmount || 0,
      deadline: g.deadline || null
    };
  },

  _mapCreditCard(row) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      limit: parseFloat(row.limit_amount),
      closingDay: row.closing_day,
      dueDay: row.due_day,
      color: row.color
    };
  },

  _unmapCreditCard(c) {
    return {
      id: c.id,
      user_id: c.userId || getUserId(),
      name: c.name,
      limit_amount: c.limit || 0,
      closing_day: c.closingDay || 1,
      due_day: c.dueDay || 10,
      color: c.color
    };
  },

  // ========== TRANSAÇÕES ==========

  async getTransactions() {
    const { data, error } = await this._sb()
      .from('transactions')
      .select('*')
      .eq('user_id', getUserId())
      .order('date', { ascending: false });

    this._handleError(error, 'getTransactions');
    return (data || []).map(r => this._mapTransaction(r));
  },

  async saveTransactions(transactions) {
    const rows = transactions.map(t => this._unmapTransaction(t));
    const { error } = await this._sb().from('transactions').upsert(rows);
    this._handleError(error, 'saveTransactions');
    return true;
  },

  async addTransaction(transaction) {
    const row = this._unmapTransaction(transaction);
    const { data, error } = await this._sb()
      .from('transactions')
      .insert(row)
      .select()
      .single();

    this._handleError(error, 'addTransaction');
    return this._mapTransaction(data);
  },

  async updateTransaction(id, updates) {
    const mapped = {};
    if (updates.type !== undefined) mapped.type = updates.type;
    if (updates.description !== undefined) mapped.description = updates.description;
    if (updates.amount !== undefined) mapped.amount = updates.amount;
    if (updates.date !== undefined) mapped.date = updates.date;
    if (updates.categoryId !== undefined) mapped.category_id = updates.categoryId;
    if (updates.paymentMethod !== undefined) mapped.payment_method = updates.paymentMethod;
    if (updates.notes !== undefined) mapped.notes = updates.notes;
    if (updates.installments !== undefined) mapped.installments = updates.installments;
    if (updates.installmentNumber !== undefined) mapped.installment_number = updates.installmentNumber;
    if (updates.parentId !== undefined) mapped.parent_id = updates.parentId;
    if (updates.dueDate !== undefined) mapped.due_date = updates.dueDate;
    if (updates.paid !== undefined) mapped.paid = updates.paid;
    if (updates.creditCardId !== undefined) mapped.credit_card_id = updates.creditCardId;

    const { data, error } = await this._sb()
      .from('transactions')
      .update(mapped)
      .eq('id', id)
      .eq('user_id', getUserId())
      .select()
      .single();

    this._handleError(error, 'updateTransaction');
    return this._mapTransaction(data);
  },

  async deleteTransaction(id) {
    const sb = this._sb();
    await sb.from('transactions').delete().eq('parent_id', id).eq('user_id', getUserId());
    const { error } = await sb.from('transactions').delete().eq('id', id).eq('user_id', getUserId());
    this._handleError(error, 'deleteTransaction');
  },

  // ========== CATEGORIAS ==========

  async getCategories() {
    const { data, error } = await this._sb()
      .from('categories')
      .select('*')
      .eq('user_id', getUserId())
      .order('name');

    this._handleError(error, 'getCategories');
    return (data || []).map(r => this._mapCategory(r));
  },

  /** Remove registros que não estão mais na lista local */
  async _syncTable(table, items, unmapFn) {
    const sb = this._sb();
    const uid = getUserId();
    const rows = items.map(item => unmapFn.call(this, item));

    const { data: existing } = await sb.from(table).select('id').eq('user_id', uid);
    const newIds = new Set(items.map(i => i.id));
    const toDelete = (existing || []).filter(e => !newIds.has(e.id)).map(e => e.id);

    if (toDelete.length) {
      await sb.from(table).delete().in('id', toDelete).eq('user_id', uid);
    }

    if (rows.length) {
      const { error } = await sb.from(table).upsert(rows);
      this._handleError(error, `save ${table}`);
    }
  },

  async saveCategories(categories) {
    await this._syncTable('categories', categories, this._unmapCategory);
    return true;
  },

  async initDefaultCategories(userId) {
    const { data: existing, error: checkError } = await this._sb()
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    this._handleError(checkError, 'initDefaultCategories check');
    if (existing?.length) {
      return existing;
    }

    const rows = CONFIG.DEFAULT_CATEGORIES.map(cat => ({
      user_id: userId,
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color
    }));

    const { data, error } = await this._sb().from('categories').insert(rows).select();
    this._handleError(error, 'initDefaultCategories');
    return (data || []).map(r => this._mapCategory(r));
  },

  // ========== METAS ==========

  async getGoals() {
    const { data, error } = await this._sb()
      .from('goals')
      .select('*')
      .eq('user_id', getUserId())
      .order('created_at', { ascending: false });

    this._handleError(error, 'getGoals');
    return (data || []).map(r => this._mapGoal(r));
  },

  async saveGoals(goals) {
    await this._syncTable('goals', goals, this._unmapGoal);
    return true;
  },

  // ========== CARTÕES ==========

  async getCreditCards() {
    const { data, error } = await this._sb()
      .from('credit_cards')
      .select('*')
      .eq('user_id', getUserId())
      .order('name');

    this._handleError(error, 'getCreditCards');
    return (data || []).map(r => this._mapCreditCard(r));
  },

  async saveCreditCards(cards) {
    await this._syncTable('credit_cards', cards, this._unmapCreditCard);
    return true;
  },

  // ========== CONFIGURAÇÕES ==========

  async getSettings() {
    const { data, error } = await this._sb()
      .from('user_settings')
      .select('*')
      .eq('user_id', getUserId())
      .maybeSingle();

    this._handleError(error, 'getSettings');
    if (!data) return { theme: 'light', sidebarCollapsed: false };
    return {
      theme: data.theme || 'light',
      sidebarCollapsed: data.sidebar_collapsed || false
    };
  },

  async saveSettings(settings) {
    const { error } = await this._sb().from('user_settings').upsert({
      user_id: getUserId(),
      theme: settings.theme,
      sidebar_collapsed: settings.sidebarCollapsed,
      updated_at: new Date().toISOString()
    });
    this._handleError(error, 'saveSettings');
    return true;
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
    if (!data.categories) throw new Error('Arquivo de backup inválido');

    const uid = getUserId();
    const sb = this._sb();

    await sb.from('transactions').delete().eq('user_id', uid);
    await sb.from('goals').delete().eq('user_id', uid);
    await sb.from('credit_cards').delete().eq('user_id', uid);
    await sb.from('categories').delete().eq('user_id', uid);

    const catIdMap = {};
    const categories = data.categories.map(c => {
      const newId = generateId();
      catIdMap[c.id] = newId;
      return this._unmapCategory({ ...c, id: newId, userId: uid });
    });
    await sb.from('categories').insert(categories);

    const cardIdMap = {};
    if (data.creditCards?.length) {
      const cards = data.creditCards.map(c => {
        const newId = generateId();
        cardIdMap[c.id] = newId;
        return this._unmapCreditCard({ ...c, id: newId, userId: uid });
      });
      await sb.from('credit_cards').insert(cards);
    }

    if (data.transactions?.length) {
      const txIdMap = {};
      const transactions = data.transactions.map(t => {
        const newId = generateId();
        txIdMap[t.id] = newId;
        return { ...t, id: newId };
      });
      const rows = transactions.map(t => this._unmapTransaction({
        ...t,
        userId: uid,
        categoryId: catIdMap[t.categoryId] || t.categoryId,
        creditCardId: cardIdMap[t.creditCardId] || t.creditCardId,
        parentId: t.parentId ? (txIdMap[t.parentId] || null) : null
      }));
      await sb.from('transactions').insert(rows);
    }

    if (data.goals?.length) {
      const goals = data.goals.map(g => this._unmapGoal({ ...g, id: generateId(), userId: uid }));
      await sb.from('goals').insert(goals);
    }

    if (data.settings) await this.saveSettings(data.settings);
  },

  async clearUserData() {
    const uid = getUserId();
    const sb = this._sb();
    await sb.from('transactions').delete().eq('user_id', uid);
    await sb.from('goals').delete().eq('user_id', uid);
    await sb.from('credit_cards').delete().eq('user_id', uid);
    await sb.from('categories').delete().eq('user_id', uid);
    await this.initDefaultCategories(uid);
  }
};
