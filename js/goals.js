/**
 * Metas financeiras com barra de progresso
 */

const Goals = {
  /** Inicializa módulo */
  init() {
    document.getElementById('btn-new-goal').addEventListener('click', () => this.showForm());
    this.render();
  },

  /** Renderiza metas */
  async render() {
    const goals = await Database.getGoals();
    const container = document.getElementById('goals-list');

    if (goals.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-bullseye"></i><p>Nenhuma meta cadastrada. Crie sua primeira meta!</p></div>';
      return;
    }

    container.innerHTML = goals.map(goal => {
      const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

      return `<div class="goal-card">
        <div class="goal-header">
          <h4>${escapeHtml(goal.name)}</h4>
          <div>
            <button class="btn-icon btn-sm" onclick="Goals.showForm('${goal.id}')" title="Editar"><i class="fa-solid fa-edit"></i></button>
            <button class="btn-icon btn-sm" onclick="Goals.delete('${goal.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width:${percent}%"></div>
        </div>
        <div class="goal-stats">
          <span>${formatCurrency(goal.currentAmount)} de ${formatCurrency(goal.targetAmount)}</span>
          <span class="goal-percent">${percent}%</span>
        </div>
        <p style="font-size:0.8125rem;color:var(--text-secondary);margin-top:0.5rem">
          Faltam ${formatCurrency(remaining)}
          ${goal.deadline ? ` · Prazo: ${formatDate(goal.deadline)}` : ''}
        </p>
        <button class="btn btn-outline btn-sm" style="margin-top:0.75rem" onclick="Goals.addAmount('${goal.id}')">
          <i class="fa-solid fa-plus"></i> Adicionar Valor
        </button>
      </div>`;
    }).join('');
  },

  /** Formulário de meta */
  async showForm(id = null) {
    let goal = { name: '', targetAmount: '', currentAmount: 0, deadline: '' };
    if (id) {
      const goals = await Database.getGoals();
      goal = goals.find(g => g.id === id) || goal;
    }

    openModal(
      id ? 'Editar Meta' : 'Nova Meta',
      `<div class="form-group">
        <label>Nome da Meta</label>
        <input type="text" id="goal-name" value="${escapeHtml(goal.name)}" placeholder="Ex: Viagem de férias">
      </div>
      <div class="form-group">
        <label>Valor Alvo</label>
        <input type="number" id="goal-target" value="${goal.targetAmount}" min="0.01" step="0.01">
      </div>
      <div class="form-group">
        <label>Valor Atual</label>
        <input type="number" id="goal-current" value="${goal.currentAmount}" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>Prazo (opcional)</label>
        <input type="date" id="goal-deadline" value="${goal.deadline || ''}">
      </div>`,
      `<button class="btn btn-outline modal-close-btn">Cancelar</button>
       <button class="btn btn-primary" id="goal-save-btn">Salvar</button>`
    );

    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('goal-save-btn').addEventListener('click', () => this.save(id));
  },

  /** Salva meta */
  async save(id) {
    const name = document.getElementById('goal-name').value.trim();
    const targetAmount = parseFloat(document.getElementById('goal-target').value);
    const currentAmount = parseFloat(document.getElementById('goal-current').value) || 0;
    const deadline = document.getElementById('goal-deadline').value;

    if (!name || !targetAmount) {
      showToast('Preencha nome e valor alvo', 'error');
      return;
    }

    const goals = await Database.getGoals();
    const data = { name, targetAmount, currentAmount, deadline, userId: AppState.currentUser.id };

    if (id) {
      const index = goals.findIndex(g => g.id === id);
      goals[index] = { ...goals[index], ...data };
    } else {
      goals.push({ id: generateId(), ...data, createdAt: new Date().toISOString() });
    }

    await Database.saveGoals(goals);
    closeModal();
    showToast('Meta salva!', 'success');
    this.render();
  },

  /** Adiciona valor à meta */
  async addAmount(id) {
    openModal(
      'Adicionar Valor',
      `<div class="form-group">
        <label>Valor a adicionar</label>
        <input type="number" id="goal-add-amount" min="0.01" step="0.01" placeholder="0,00">
      </div>`,
      `<button class="btn btn-outline modal-close-btn">Cancelar</button>
       <button class="btn btn-success" id="goal-add-btn">Adicionar</button>`
    );

    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('goal-add-btn').addEventListener('click', async () => {
      const amount = parseFloat(document.getElementById('goal-add-amount').value);
      if (!amount) return;

      const goals = await Database.getGoals();
      const index = goals.findIndex(g => g.id === id);
      goals[index].currentAmount += amount;
      await Database.saveGoals(goals);
      closeModal();
      showToast(`${formatCurrency(amount)} adicionado à meta!`, 'success');
      this.render();
    });
  },

  /** Exclui meta */
  async delete(id) {
    if (!confirmAction('Deseja excluir esta meta?')) return;
    let goals = await Database.getGoals();
    goals = goals.filter(g => g.id !== id);
    await Database.saveGoals(goals);
    showToast('Meta excluída', 'info');
    this.render();
  }
};
