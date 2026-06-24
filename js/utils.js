/**
 * Funções utilitárias gerais
 */

/** Gera ID único */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/** Formata valor monetário */
function formatCurrency(value) {
  return new Intl.NumberFormat(CONFIG.LOCALE, {
    style: 'currency',
    currency: CONFIG.CURRENCY
  }).format(value || 0);
}

/** Formata data para exibição */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(CONFIG.LOCALE);
}

/** Formata data e hora */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString(CONFIG.LOCALE);
}

/** Retorna data atual no formato YYYY-MM-DD */
function today() {
  return new Date().toISOString().split('T')[0];
}

/** Retorna início do mês */
function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

/** Retorna fim do mês */
function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
}

/** Retorna início do ano */
function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
}

/** Retorna fim do ano */
function endOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
}

/** Retorna início da semana (domingo) */
function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

/** Retorna fim da semana (sábado) */
function endOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  return d.toISOString().split('T')[0];
}

/** Nome do mês */
function getMonthName(month, year) {
  return new Date(year, month).toLocaleDateString(CONFIG.LOCALE, { month: 'long', year: 'numeric' });
}

/** Debounce para pesquisa */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Exibe toast de notificação */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
  toast.innerHTML = `<i class="fa-solid fa-${icons[type]}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/** Abre modal genérico */
function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

/** Fecha modal */
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/** Confirma ação do usuário */
function confirmAction(message) {
  return window.confirm(message);
}

/** Escapa HTML para prevenir XSS */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** Obtém intervalo de datas baseado no período */
function getDateRange(period, referenceDate = today()) {
  const ref = new Date(referenceDate + 'T00:00:00');

  switch (period) {
    case 'day':
      return { from: referenceDate, to: referenceDate };
    case 'week':
      return { from: startOfWeek(ref), to: endOfWeek(ref) };
    case 'month':
      return { from: startOfMonth(ref), to: endOfMonth(ref) };
    case 'year':
      return { from: startOfYear(ref), to: endOfYear(ref) };
    default:
      return { from: null, to: null };
  }
}

/** Calcula totais de transações */
function calculateTotals(transactions) {
  return transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, balance: 0 }
  );
}

/** Agrupa transações por categoria */
function groupByCategory(transactions, categories) {
  const groups = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = categories.find(c => c.id === t.categoryId);
    const name = cat ? cat.name : 'Sem categoria';
    groups[name] = (groups[name] || 0) + t.amount;
  });
  return groups;
}

/** Agrupa transações por mês */
function groupByMonth(transactions, year) {
  const months = Array(12).fill(null).map(() => ({ income: 0, expense: 0 }));
  transactions.forEach(t => {
    const d = new Date(t.date + 'T00:00:00');
    if (d.getFullYear() === year) {
      const m = d.getMonth();
      if (t.type === 'income') months[m].income += t.amount;
      else months[m].expense += t.amount;
    }
  });
  return months;
}
