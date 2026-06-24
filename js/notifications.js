/**
 * Notificações de contas a vencer
 */

const Notifications = {
  /** Atualiza notificações */
  async update() {
    const transactions = await Database.getTransactions();
    const todayDate = new Date(today() + 'T00:00:00');
    const in7Days = new Date(todayDate);
    in7Days.setDate(in7Days.getDate() + 7);

    const upcoming = transactions.filter(t => {
      if (!t.dueDate || t.paid) return false;
      const due = new Date(t.dueDate + 'T00:00:00');
      return due >= todayDate && due <= in7Days;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const overdue = transactions.filter(t => {
      if (!t.dueDate || t.paid) return false;
      return new Date(t.dueDate + 'T00:00:00') < todayDate;
    });

    const all = [...overdue, ...upcoming];
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notifications-list');

    if (all.length === 0) {
      badge.classList.add('hidden');
      list.innerHTML = '<p style="padding:1rem;font-size:0.8125rem;color:var(--text-secondary)">Nenhuma conta a vencer</p>';
      return;
    }

    badge.textContent = all.length;
    badge.classList.remove('hidden');

    list.innerHTML = all.map(t => {
      const isOverdue = new Date(t.dueDate + 'T00:00:00') < todayDate;
      return `<div class="notification-item">
        <strong>${escapeHtml(t.description)}</strong>
        <span>${formatCurrency(t.amount)} · Vence: ${formatDate(t.dueDate)}</span>
        ${isOverdue ? '<span style="color:var(--danger);font-size:0.75rem">VENCIDA</span>' : ''}
      </div>`;
    }).join('');
  },

  /** Inicializa painel de notificações */
  init() {
    const btn = document.getElementById('notifications-btn');
    const panel = document.getElementById('notifications-panel');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
    });

    document.addEventListener('click', () => panel.classList.add('hidden'));
    panel.addEventListener('click', (e) => e.stopPropagation());
  }
};
