/**
 * Controle de cartões de crédito
 */

const CreditCards = {
  /** Inicializa módulo */
  init() {
    document.getElementById('btn-new-card').addEventListener('click', () => this.showForm());
    this.render();
    this.populateSelect();
  },

  /** Preenche select de cartões no formulário de despesas */
  async populateSelect() {
    const cards = await Database.getCreditCards();
    const select = document.getElementById('expense-credit-card');
    select.innerHTML = '<option value="">Nenhum</option>' +
      cards.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  },

  /** Renderiza cartões */
  async render() {
    const cards = await Database.getCreditCards();
    const transactions = await Database.getTransactions();
    const container = document.getElementById('credit-cards-list');

    if (cards.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-credit-card"></i><p>Nenhum cartão cadastrado</p></div>';
      return;
    }

    container.innerHTML = cards.map(card => {
      const usage = transactions
        .filter(t => t.creditCardId === card.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const percent = card.limit > 0 ? Math.round((usage / card.limit) * 100) : 0;

      return `<div class="credit-card-item" style="background:linear-gradient(135deg, ${card.color}, ${card.color}cc)">
        <div>
          <h4>${escapeHtml(card.name)}</h4>
          <p class="card-limit">Limite: ${formatCurrency(card.limit)}</p>
        </div>
        <div class="card-usage">
          <p>Utilizado: ${formatCurrency(usage)} (${percent}%)</p>
          <div class="goal-progress-bar" style="margin-top:0.5rem">
            <div class="goal-progress-fill" style="width:${Math.min(100, percent)}%;background:white"></div>
          </div>
          <p style="font-size:0.75rem;margin-top:0.5rem;opacity:0.8">
            Fechamento: dia ${card.closingDay} · Vencimento: dia ${card.dueDay}
          </p>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white" onclick="CreditCards.showForm('${card.id}')">
            <i class="fa-solid fa-edit"></i>
          </button>
          <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:white" onclick="CreditCards.delete('${card.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
    }).join('');
  },

  /** Formulário de cartão */
  async showForm(id = null) {
    let card = { name: '', limit: '', closingDay: 1, dueDay: 10, color: CONFIG.CARD_COLORS[0] };
    if (id) {
      const cards = await Database.getCreditCards();
      card = cards.find(c => c.id === id) || card;
    }

    openModal(
      id ? 'Editar Cartão' : 'Novo Cartão',
      `<div class="form-group">
        <label>Nome do Cartão</label>
        <input type="text" id="card-name" value="${escapeHtml(card.name)}" placeholder="Ex: Nubank">
      </div>
      <div class="form-group">
        <label>Limite</label>
        <input type="number" id="card-limit" value="${card.limit}" min="0" step="0.01">
      </div>
      <div class="form-group">
        <label>Dia de Fechamento</label>
        <input type="number" id="card-closing" value="${card.closingDay}" min="1" max="31">
      </div>
      <div class="form-group">
        <label>Dia de Vencimento</label>
        <input type="number" id="card-due" value="${card.dueDay}" min="1" max="31">
      </div>
      <div class="form-group">
        <label>Cor</label>
        <input type="color" id="card-color" value="${card.color}">
      </div>`,
      `<button class="btn btn-outline modal-close-btn">Cancelar</button>
       <button class="btn btn-primary" id="card-save-btn">Salvar</button>`
    );

    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('card-save-btn').addEventListener('click', () => this.save(id));
  },

  /** Salva cartão */
  async save(id) {
    const name = document.getElementById('card-name').value.trim();
    const limit = parseFloat(document.getElementById('card-limit').value);
    if (!name) { showToast('Informe o nome do cartão', 'error'); return; }

    const cards = await Database.getCreditCards();
    const data = {
      name,
      limit: limit || 0,
      closingDay: parseInt(document.getElementById('card-closing').value) || 1,
      dueDay: parseInt(document.getElementById('card-due').value) || 10,
      color: document.getElementById('card-color').value,
      userId: AppState.currentUser.id
    };

    if (id) {
      const index = cards.findIndex(c => c.id === id);
      cards[index] = { ...cards[index], ...data };
    } else {
      cards.push({ id: generateId(), ...data });
    }

    await Database.saveCreditCards(cards);
    closeModal();
    showToast('Cartão salvo!', 'success');
    this.render();
    this.populateSelect();
  },

  /** Exclui cartão */
  async delete(id) {
    if (!confirmAction('Deseja excluir este cartão?')) return;
    let cards = await Database.getCreditCards();
    cards = cards.filter(c => c.id !== id);
    await Database.saveCreditCards(cards);
    showToast('Cartão excluído', 'info');
    this.render();
    this.populateSelect();
  }
};
