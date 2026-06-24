/**
 * Controle de parcelas
 */

const Installments = {
  /** Renderiza parcelas agrupadas */
  async render() {
    const transactions = await Database.getTransactions();
    const installmentGroups = {};

    transactions.filter(t => t.parentId || t.installments).forEach(t => {
      const groupId = t.parentId || t.id;
      if (!installmentGroups[groupId]) {
        installmentGroups[groupId] = [];
      }
      installmentGroups[groupId].push(t);
    });

    const container = document.getElementById('installments-list');
    const groups = Object.values(installmentGroups);

    if (groups.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-layer-group"></i><p>Nenhuma compra parcelada</p></div>';
      return;
    }

    container.innerHTML = groups.map(group => {
      const sorted = group.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
      const total = sorted.reduce((s, t) => s + t.amount, 0);
      const paid = sorted.filter(t => t.paid).length;
      const description = sorted[0].description.replace(/\(\d+\/\d+\)/, '').trim();

      return `<div class="installment-group">
        <div class="installment-header">
          <div>
            <strong>${escapeHtml(description)}</strong>
            <p style="font-size:0.8125rem;color:var(--text-secondary)">
              ${sorted.length} parcelas · Total: ${formatCurrency(total)} · ${paid}/${sorted.length} pagas
            </p>
          </div>
        </div>
        <div class="installment-items">
          ${sorted.map(t => `
            <div class="installment-item ${t.paid ? 'paid' : ''}">
              <span>${t.installmentNumber || 1}/${t.installments || 1} - ${formatDate(t.date)} - ${formatCurrency(t.amount)}</span>
              ${t.paid
                ? '<span class="paid-badge">Paga</span>'
                : `<button class="btn btn-sm btn-success" onclick="Installments.markPaid('${t.id}')">Marcar Paga</button>`
              }
            </div>
          `).join('')}
        </div>
      </div>`;
    }).join('');
  },

  /** Marca parcela como paga */
  async markPaid(id) {
    await Database.updateTransaction(id, { paid: true });
    showToast('Parcela marcada como paga!', 'success');
    this.render();
    Dashboard.render();
  }
};
