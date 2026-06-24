/**
 * Exportação de relatórios para PDF e Excel
 */

const Export = {
  /** Exporta para PDF usando jsPDF */
  async toPDF(transactions) {
    if (!transactions || transactions.length === 0) {
      showToast('Nenhum dado para exportar', 'warning');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const categories = await Database.getCategories();
    const totals = calculateTotals(transactions);
    const type = document.getElementById('report-type').value;
    const refDate = document.getElementById('report-date').value;

    const titles = { daily: 'Diário', monthly: 'Mensal', yearly: 'Anual' };

    doc.setFontSize(18);
    doc.text(`${CONFIG.APP_NAME} - Relatório ${titles[type]}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    doc.text(`Referência: ${formatDate(refDate)}`, 14, 34);
    doc.text(`Receitas: ${formatCurrency(totals.income)} | Despesas: ${formatCurrency(totals.expense)} | Saldo: ${formatCurrency(totals.balance)}`, 14, 40);

    const tableData = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        return [
          formatDate(t.date),
          t.description,
          cat ? cat.name : '-',
          t.type === 'income' ? 'Receita' : 'Despesa',
          formatCurrency(t.amount)
        ];
      });

    doc.autoTable({
      startY: 48,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save(`relatorio_${type}_${refDate}.pdf`);
    showToast('PDF exportado com sucesso!', 'success');
  },

  /** Exporta para Excel usando SheetJS */
  async toExcel(transactions) {
    if (!transactions || transactions.length === 0) {
      showToast('Nenhum dado para exportar', 'warning');
      return;
    }

    const categories = await Database.getCategories();
    const totals = calculateTotals(transactions);
    const type = document.getElementById('report-type').value;
    const refDate = document.getElementById('report-date').value;

    const data = transactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        return {
          Data: formatDate(t.date),
          Descrição: t.description,
          Categoria: cat ? cat.name : '-',
          Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
          'Forma Pagamento': CONFIG.PAYMENT_METHODS[t.paymentMethod] || t.paymentMethod || '',
          Valor: t.amount,
          Observações: t.notes || ''
        };
      });

    data.push({});
    data.push({ Descrição: 'TOTAL RECEITAS', Valor: totals.income });
    data.push({ Descrição: 'TOTAL DESPESAS', Valor: totals.expense });
    data.push({ Descrição: 'SALDO', Valor: totals.balance });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${type}_${refDate}.xlsx`);
    showToast('Excel exportado com sucesso!', 'success');
  },

  /** Exporta backup completo */
  async backup() {
    const data = await Database.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financas_${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup realizado com sucesso!', 'success');
  },

  /** Restaura backup */
  async restore(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await Database.importAllData(data);
      showToast('Backup restaurado com sucesso!', 'success');
      App.refresh();
    } catch {
      showToast('Arquivo de backup inválido', 'error');
    }
  }
};
