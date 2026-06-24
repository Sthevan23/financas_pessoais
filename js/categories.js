/**
 * Gerenciamento de categorias personalizadas
 */

const Categories = {
  /** Inicializa módulo */
  init() {
    document.getElementById('btn-new-category').addEventListener('click', () => this.showForm());

    document.getElementById('categories-list').addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-action="edit-category"]');
      const deleteBtn = e.target.closest('[data-action="delete-category"]');
      if (editBtn) this.showForm(editBtn.dataset.id);
      if (deleteBtn) this.delete(deleteBtn.dataset.id);
    });

    this.render();
  },

  /** Renderiza lista de categorias */
  async render() {
    const categories = await Database.getCategories();
    const container = document.getElementById('categories-list');

    if (categories.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-tags"></i><p>Nenhuma categoria cadastrada</p></div>';
      return;
    }

    container.innerHTML = categories.map(cat => `
      <div class="category-card">
        <div class="category-icon" style="background:${escapeHtml(cat.color)}">
          <i class="fa-solid ${escapeHtml(cat.icon)}"></i>
        </div>
        <div class="category-info">
          <h4 title="${escapeHtml(cat.name)}">${escapeHtml(cat.name)}</h4>
          <span>${cat.type === 'income' ? 'Receita' : cat.type === 'expense' ? 'Despesa' : 'Ambos'}</span>
        </div>
        <div class="category-actions">
          <button type="button" class="btn-icon btn-sm" data-action="edit-category" data-id="${cat.id}" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button type="button" class="btn-icon btn-sm" data-action="delete-category" data-id="${cat.id}" title="Excluir">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  },

  /** Preenche selects de categorias nos formulários */
  async populateSelects() {
    const categories = await Database.getCategories();
    const incomeSelect = document.getElementById('income-category');
    const expenseSelect = document.getElementById('expense-category');
    const filterSelect = document.getElementById('filter-category');

    const incomeCats = categories.filter(c => c.type === 'income' || c.type === 'both');
    const expenseCats = categories.filter(c => c.type === 'expense' || c.type === 'both');

    incomeSelect.innerHTML = incomeCats.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('');

    expenseSelect.innerHTML = expenseCats.map(c =>
      `<option value="${c.id}">${escapeHtml(c.name)}</option>`
    ).join('');

    filterSelect.innerHTML = '<option value="all">Todas Categorias</option>' +
      categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  },

  /** Exibe formulário de categoria no modal */
  async showForm(id = null) {
    let cat = { name: '', type: 'expense', icon: 'fa-tag', color: '#6366f1' };
    if (id) {
      const categories = await Database.getCategories();
      cat = categories.find(c => c.id === id) || cat;
    }

    const icons = ['fa-utensils', 'fa-car', 'fa-house', 'fa-heart-pulse', 'fa-graduation-cap',
      'fa-gamepad', 'fa-chart-line', 'fa-credit-card', 'fa-gas-pump', 'fa-wifi',
      'fa-droplet', 'fa-bolt', 'fa-money-bill-wave', 'fa-laptop', 'fa-tag', 'fa-ellipsis'];

    openModal(
      id ? 'Editar Categoria' : 'Nova Categoria',
      `<div class="form-group">
        <label>Nome</label>
        <input type="text" id="cat-name" value="${escapeHtml(cat.name)}" required>
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="cat-type">
          <option value="expense" ${cat.type === 'expense' ? 'selected' : ''}>Despesa</option>
          <option value="income" ${cat.type === 'income' ? 'selected' : ''}>Receita</option>
          <option value="both" ${cat.type === 'both' ? 'selected' : ''}>Ambos</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ícone</label>
        <select id="cat-icon">
          ${icons.map(i => `<option value="${i}" ${cat.icon === i ? 'selected' : ''}>${i.replace('fa-', '')}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Cor</label>
        <input type="color" id="cat-color" value="${cat.color}">
      </div>`,
      `<button class="btn btn-outline modal-close-btn">Cancelar</button>
       <button class="btn btn-primary" id="cat-save-btn">Salvar</button>`
    );

    document.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('cat-save-btn').addEventListener('click', () => this.save(id));
  },

  /** Salva categoria */
  async save(id) {
    const name = document.getElementById('cat-name').value.trim();
    if (!name) { showToast('Informe o nome da categoria', 'error'); return; }

    const categories = await Database.getCategories();
    const data = {
      name,
      type: document.getElementById('cat-type').value,
      icon: document.getElementById('cat-icon').value,
      color: document.getElementById('cat-color').value
    };

    if (id) {
      const index = categories.findIndex(c => c.id === id);
      categories[index] = { ...categories[index], ...data };
    } else {
      categories.push({ id: generateId(), userId: AppState.currentUser.id, ...data });
    }

    await Database.saveCategories(categories);
    closeModal();
    showToast('Categoria salva!', 'success');
    this.render();
    this.populateSelects();
  },

  /** Exclui categoria */
  async delete(id) {
    if (!confirmAction('Deseja excluir esta categoria?')) return;
    let categories = await Database.getCategories();
    categories = categories.filter(c => c.id !== id);
    await Database.saveCategories(categories);
    showToast('Categoria excluída', 'info');
    this.render();
    this.populateSelects();
  },

  /** Busca categoria por ID */
  async getById(id) {
    const categories = await Database.getCategories();
    return categories.find(c => c.id === id);
  }
};
