/**
 * Gráficos financeiros com Chart.js
 */

const Charts = {
  instances: {},

  /** Renderiza todos os gráficos */
  async renderAll() {
    await Promise.all([
      this.renderComparison(),
      this.renderCategories(),
      this.renderBalance(),
      this.renderMonthly()
    ]);
  },

  /** Destroi gráfico existente */
  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  /** Obtém cores do tema atual */
  getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: isDark ? '#94a3b8' : '#64748b',
      grid: isDark ? '#334155' : '#e2e8f0'
    };
  },

  /** Gráfico de comparação receitas vs despesas */
  async renderComparison() {
    const period = document.getElementById('dashboard-period').value;
    const transactions = await Filters.getByPeriod(period);
    const totals = calculateTotals(transactions);
    const colors = this.getThemeColors();

    this.destroy('comparison');
    const ctx = document.getElementById('chart-comparison');
    if (!ctx) return;

    this.instances.comparison = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Receitas', 'Despesas'],
        datasets: [{
          data: [totals.income, totals.expense],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: colors.text, padding: 16 } }
        }
      }
    });
  },

  /** Gráfico pizza por categoria */
  async renderCategories() {
    const period = document.getElementById('dashboard-period').value;
    const transactions = await Filters.getByPeriod(period);
    const categories = await Database.getCategories();
    const groups = groupByCategory(transactions, categories);
    const colors = this.getThemeColors();

    const labels = Object.keys(groups);
    const data = Object.values(groups);
    const bgColors = labels.map(name => {
      const cat = categories.find(c => c.name === name);
      return cat ? cat.color : '#64748b';
    });

    this.destroy('categories');
    const ctx = document.getElementById('chart-categories');
    if (!ctx) return;

    this.instances.categories = new Chart(ctx, {
      type: 'pie',
      data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 0 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: colors.text, padding: 12, font: { size: 11 } } }
        }
      }
    });
  },

  /** Gráfico de evolução do saldo */
  async renderBalance() {
    const transactions = await Database.getTransactions();
    const colors = this.getThemeColors();
    const year = new Date().getFullYear();

    const monthlyBalance = Array(12).fill(0);
    let runningBalance = 0;

    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const monthBalances = Array(12).fill(null).map(() => runningBalance);

    sorted.forEach(t => {
      const d = new Date(t.date + 'T00:00:00');
      if (d.getFullYear() === year) {
        runningBalance += t.type === 'income' ? t.amount : -t.amount;
        for (let m = d.getMonth(); m < 12; m++) {
          monthBalances[m] = runningBalance;
        }
      }
    });

    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    this.destroy('balance');
    const ctx = document.getElementById('chart-balance');
    if (!ctx) return;

    this.instances.balance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'Saldo',
          data: monthBalances,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: colors.grid }, ticks: { color: colors.text } },
          y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => formatCurrency(v) } }
        },
        plugins: { legend: { display: false } }
      }
    });
  },

  /** Gráfico de barras por mês */
  async renderMonthly() {
    const transactions = await Database.getTransactions();
    const year = new Date().getFullYear();
    const months = groupByMonth(transactions, year);
    const colors = this.getThemeColors();
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    this.destroy('monthly');
    const ctx = document.getElementById('chart-monthly');
    if (!ctx) return;

    this.instances.monthly = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          { label: 'Receitas', data: months.map(m => m.income), backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Despesas', data: months.map(m => m.expense), backgroundColor: '#ef4444', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.text } },
          y: { grid: { color: colors.grid }, ticks: { color: colors.text, callback: v => formatCurrency(v) } }
        },
        plugins: { legend: { labels: { color: colors.text } } }
      }
    });
  }
};
