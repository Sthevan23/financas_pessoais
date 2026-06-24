/**
 * Calendário financeiro com visualização de movimentações
 */

const Calendar = {
  currentDate: new Date(),
  selectedDate: null,

  /** Inicializa calendário */
  init() {
    document.getElementById('cal-prev').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });
    this.render();
  },

  /** Renderiza calendário */
  async render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const transactions = await Database.getTransactions();

    document.getElementById('cal-month-year').textContent =
      getMonthName(month, year);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let html = dayNames.map(d => `<div class="cal-header">${d}</div>`).join('');

    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      html += `<div class="cal-day other-month"><span class="cal-day-number">${day}</span></div>`;
    }

    const todayStr = today();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const hasIncome = dayTransactions.some(t => t.type === 'income');
      const hasExpense = dayTransactions.some(t => t.type === 'expense');
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === this.selectedDate;

      html += `<div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
        onclick="Calendar.selectDay('${dateStr}')">
        <span class="cal-day-number">${day}</span>
        <div class="cal-day-dots">
          ${hasIncome ? '<span class="cal-dot income"></span>' : ''}
          ${hasExpense ? '<span class="cal-dot expense"></span>' : ''}
        </div>
      </div>`;
    }

    // Dias do próximo mês
    const totalCells = firstDay + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="cal-day other-month"><span class="cal-day-number">${i}</span></div>`;
    }

    document.getElementById('calendar-grid').innerHTML = html;
  },

  /** Seleciona dia e mostra transações */
  async selectDay(dateStr) {
    this.selectedDate = dateStr;
    this.render();

    const transactions = await Database.getTransactions();
    const dayTransactions = transactions.filter(t => t.date === dateStr);
    const totals = calculateTotals(dayTransactions);

    document.getElementById('calendar-day-title').textContent =
      `Movimentações - ${formatDate(dateStr)} (${formatCurrency(totals.balance)})`;

    Transactions.renderList('calendar-day-transactions', dayTransactions);
  }
};
