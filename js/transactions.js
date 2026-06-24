/**
 * Gerenciamento de transações (receitas e despesas)
 */

const Transactions = {
  /** Inicializa módulo */
  init() {
    document.getElementById('income-form').addEventListener('submit', (e) => this.handleIncome(e));
    document.getElementById('expense-form').addEventListener('submit', (e) => this.handleExpense(e));
    document.getElementById('btn-new-income').addEventListener('click', () => UI.navigateTo('income'));
    document.getElementById('btn-new-expense').addEventListener('click', () => UI.navigateTo('expense'));

    document.getElementById('expense-installment').addEventListener('change', (e) => {
      document.querySelector('.installment-fields').classList.toggle('hidden', !e.target.checked);
    });

    document.getElementById('income-date').value = today();
    document.getElementById('expense-date').value = today();
  },

  /** Salva receita */
  async handleIncome(e) {
    e.preventDefault();
    const id = document.getElementById('income-id').value;
    const data = {
      type: 'income',
      description: document.getElementById('income-description').value.trim(),
      amount: parseFloat(document.getElementById('income-amount').value),
      date: document.getElementById('income-date').value,
      categoryId: document.getElementById('income-category').value,
      paymentMethod: document.getElementById('income-payment').value,
      notes: document.getElementById('income-notes').value.trim(),
      userId: AppState.currentUser.id
    };

    if (id) {
      await Database.updateTransaction(id, data);
      showToast('Receita atualizada!', 'success');
    } else {
      data.id = generateId();
      data.paid = true;
      await Database.addTransaction(data);
      showToast('Receita registrada!', 'success');
    }

    e.target.reset();
    document.getElementById('income-id').value = '';
    document.getElementById('income-date').value = today();
    this.refreshAll();
  },

  /** Salva despesa (com suporte a parcelas) */
  async handleExpense(e) {
    e.preventDefault();
    const id = document.getElementById('expense-id').value;
    const isInstallment = document.getElementById('expense-installment').checked;
    const installmentCount = parseInt(document.getElementById('expense-installments-count').value) || 2;

    const baseData = {
      type: 'expense',
      description: document.getElementById('expense-description').value.trim(),
      amount: parseFloat(document.getElementById('expense-amount').value),
      date: document.getElementById('expense-date').value,
      categoryId: document.getElementById('expense-category').value,
      paymentMethod: document.getElementById('expense-payment').value,
      notes: document.getElementById('expense-notes').value.trim(),
      creditCardId: document.getElementById('expense-credit-card').value || null,
      dueDate: document.getElementById('expense-due-date').value || null,
      userId: AppState.currentUser.id
    };

    if (id) {
      await Database.updateTransaction(id, baseData);
      showToast('Despesa atualizada!', 'success');
    } else if (isInstallment && installmentCount > 1) {
      const parentId = generateId();
      const installmentAmount = baseData.amount / installmentCount;
      const baseDate = new Date(baseData.date + 'T00:00:00');

      for (let i = 0; i < installmentCount; i++) {
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        await Database.addTransaction({
          ...baseData,
          id: i === 0 ? parentId : generateId(),
          parentId: i === 0 ? null : parentId,
          amount: installmentAmount,
          date: date.toISOString().split('T')[0],
          installments: installmentCount,
          installmentNumber: i + 1,
          description: `${baseData.description} (${i + 1}/${installmentCount})`,
          paid: i === 0
        });
      }
      showToast(`${installmentCount} parcelas registradas!`, 'success');
    } else {
      baseData.id = generateId();
      baseData.paid = true;
      await Database.addTransaction(baseData);
      showToast('Despesa registrada!', 'success');
    }

    e.target.reset();
    document.getElementById('expense-id').value = '';
    document.getElementById('expense-date').value = today();
    document.querySelector('.installment-fields').classList.add('hidden');
    this.refreshAll();
  },

  /** Renderiza lista de transações */
  async renderList(containerId, transactions) {
    const container = document.getElementById(containerId);
    const categories = await Database.getCategories();

    if (transactions.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>Nenhum lançamento encontrado</p></div>';
      return;
    }

    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sorted.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : 'Sem categoria';
      const catIcon = cat ? cat.icon : 'fa-tag';
      const catColor = cat ? cat.color : '#64748b';

      return `<div class="transaction-item">
        <div class="transaction-icon ${t.type}" style="background:${catColor}20;color:${catColor}">
          <i class="fa-solid ${catIcon}"></i>
        </div>
        <div class="transaction-info">
          <h4>${escapeHtml(t.description)}</h4>
          <p>${formatDate(t.date)} · ${catName} · ${CONFIG.PAYMENT_METHODS[t.paymentMethod] || t.paymentMethod || ''}
          ${t.installmentNumber ? ` · Parcela ${t.installmentNumber}/${t.installments}` : ''}</p>
        </div>
        <span class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
        <div class="transaction-actions">
          <button class="btn-icon btn-sm" onclick="Transactions.edit('${t.id}')" title="Editar"><i class="fa-solid fa-edit"></i></button>
          <button class="btn-icon btn-sm" onclick="Transactions.remove('${t.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
  },

  /** Edita transação */
  async edit(id) {
    const transactions = await Database.getTransactions();
    const t = transactions.find(tr => tr.id === id);
    if (!t) return;

    if (t.type === 'income') {
      UI.navigateTo('income');
      document.getElementById('income-id').value = t.id;
      document.getElementById('income-description').value = t.description;
      document.getElementById('income-amount').value = t.amount;
      document.getElementById('income-date').value = t.date;
      document.getElementById('income-category').value = t.categoryId;
      document.getElementById('income-payment').value = t.paymentMethod || 'pix';
      document.getElementById('income-notes').value = t.notes || '';
    } else {
      UI.navigateTo('expense');
      document.getElementById('expense-id').value = t.id;
      document.getElementById('expense-description').value = t.description;
      document.getElementById('expense-amount').value = t.amount;
      document.getElementById('expense-date').value = t.date;
      document.getElementById('expense-category').value = t.categoryId;
      document.getElementById('expense-payment').value = t.paymentMethod || 'pix';
      document.getElementById('expense-notes').value = t.notes || '';
      document.getElementById('expense-due-date').value = t.dueDate || '';
    }
  },

  /** Remove transação */
  async remove(id) {
    if (!confirmAction('Deseja excluir este lançamento?')) return;
    await Database.deleteTransaction(id);
    showToast('Lançamento excluído', 'info');
    this.refreshAll();
  },

  /** Atualiza todas as views dependentes */
  refreshAll() {
    Filters.apply();
    Dashboard.render();
    Charts.renderAll();
    Notifications.update();
    Installments.render();
    CreditCards.render();
    Calendar.render();
  },

  /** Pesquisa transações */
  async search(query) {
    if (!query || query.length < 2) return [];
    const transactions = await Database.getTransactions();
    const q = query.toLowerCase();
    return transactions.filter(t =>
      t.description.toLowerCase().includes(q) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    ).slice(0, 10);
  }
};
