/**
 * Dashboard principal com estatísticas e resumos
 */

const Dashboard = {
  /** Renderiza dashboard */
  async render() {
    const period = document.getElementById('dashboard-period').value;
    const transactions = await Filters.getByPeriod(period);
    const monthTransactions = await Filters.getByPeriod('month');
    const totals = calculateTotals(transactions);
    const monthTotals = calculateTotals(monthTransactions);

    document.getElementById('stat-balance').textContent = formatCurrency(totals.balance);
    document.getElementById('stat-income').textContent = formatCurrency(totals.income);
    document.getElementById('stat-expense').textContent = formatCurrency(totals.expense);
    document.getElementById('stat-savings').textContent = formatCurrency(monthTotals.balance);

    const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    Transactions.renderList('recent-transactions', recent);
  }
};
