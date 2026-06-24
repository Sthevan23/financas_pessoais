/**
 * Relatórios financeiros (diário, mensal, anual)
 */

const Reports = {
  currentData: [],

  /** Inicializa módulo */
  init() {
    document.getElementById('report-date').value = today();
    document.getElementById('btn-generate-report').addEventListener('click', () => this.generate());
    document.getElementById('btn-export-pdf').addEventListener('click', () => Export.toPDF(this.currentData));
    document.getElementById('btn-export-excel').addEventListener('click', () => Export.toExcel(this.currentData));
    this.generate();
  },

  /** Gera relatório baseado no tipo selecionado */
  async generate() {
    const type = document.getElementById('report-type').value;
    const refDate = document.getElementById('report-date').value || today();
    let transactions = [];
    let title = '';

    switch (type) {
      case 'daily':
        transactions = await Filters.getByPeriod('day', refDate);
        title = `Relatório Diário - ${formatDate(refDate)}`;
        break;
      case 'monthly':
        transactions = await Filters.getByPeriod('month', refDate);
        title = `Relatório Mensal - ${getMonthName(new Date(refDate).getMonth(), new Date(refDate).getFullYear())}`;
        break;
      case 'yearly':
        transactions = await Filters.getByPeriod('year', refDate);
        title = `Relatório Anual - ${new Date(refDate).getFullYear()}`;
        break;
    }

    this.currentData = transactions;
    const totals = calculateTotals(transactions);
    const categories = await Database.getCategories();

    document.getElementById('report-summary').innerHTML = `
      <div class="report-stat">
        <span class="label">Receitas</span>
        <span class="value" style="color:var(--success)">${formatCurrency(totals.income)}</span>
      </div>
      <div class="report-stat">
        <span class="label">Despesas</span>
        <span class="value" style="color:var(--danger)">${formatCurrency(totals.expense)}</span>
      </div>
      <div class="report-stat">
        <span class="label">Saldo</span>
        <span class="value">${formatCurrency(totals.balance)}</span>
      </div>`;

    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
      document.getElementById('report-table').innerHTML = '<div class="empty-state"><p>Nenhum lançamento no período</p></div>';
      return;
    }

    document.getElementById('report-table').innerHTML = `
      <h3 style="margin-bottom:1rem">${title}</h3>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Tipo</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            return `<tr>
              <td>${formatDate(t.date)}</td>
              <td>${escapeHtml(t.description)}</td>
              <td>${cat ? escapeHtml(cat.name) : '-'}</td>
              <td>${t.type === 'income' ? 'Receita' : 'Despesa'}</td>
              <td style="color:${t.type === 'income' ? 'var(--success)' : 'var(--danger)'}">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }
};
