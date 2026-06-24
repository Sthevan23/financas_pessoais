/**
 * Sistema de filtros para transações
 */

const Filters = {
  /** Inicializa filtros */
  init() {
    ['filter-period', 'filter-type', 'filter-category', 'filter-date-from', 'filter-date-to'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.apply());
    });
    document.getElementById('btn-clear-filters').addEventListener('click', () => this.clear());
    document.getElementById('dashboard-period').addEventListener('change', () => Dashboard.render());
  },

  /** Aplica filtros e renderiza lista */
  async apply() {
    const transactions = await this.getFiltered();
    Transactions.renderList('transactions-list', transactions);
  },

  /** Obtém transações filtradas */
  async getFiltered() {
    let transactions = await Database.getTransactions();
    const period = document.getElementById('filter-period').value;
    const type = document.getElementById('filter-type').value;
    const category = document.getElementById('filter-category').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    if (period !== 'all') {
      const range = getDateRange(period);
      transactions = transactions.filter(t => t.date >= range.from && t.date <= range.to);
    }

    if (type !== 'all') {
      transactions = transactions.filter(t => t.type === type);
    }

    if (category !== 'all') {
      transactions = transactions.filter(t => t.categoryId === category);
    }

    if (dateFrom) {
      transactions = transactions.filter(t => t.date >= dateFrom);
    }

    if (dateTo) {
      transactions = transactions.filter(t => t.date <= dateTo);
    }

    return transactions;
  },

  /** Limpa filtros */
  clear() {
    document.getElementById('filter-period').value = 'all';
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    this.apply();
  },

  /** Filtra por período específico */
  async getByPeriod(period, referenceDate = today()) {
    const transactions = await Database.getTransactions();
    if (period === 'all') return transactions;
    const range = getDateRange(period, referenceDate);
    return transactions.filter(t => t.date >= range.from && t.date <= range.to);
  }
};
