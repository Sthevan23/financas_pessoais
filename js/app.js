/**
 * Aplicação principal - inicialização e coordenação dos módulos
 */

const App = {
  initialized: false,

  /** Inicializa todos os módulos */
  async init() {
    if (this.initialized) {
      this.refresh();
      return;
    }
    this.initialized = true;

    UI.init();
    Transactions.init();
    Filters.init();
    Categories.init();
    Reports.init();
    Goals.init();
    Calendar.init();
    CreditCards.init();
    Notifications.init();

    await Categories.populateSelects();
    await CreditCards.populateSelect();

    this.refresh();
  },

  /** Atualiza todos os dados da aplicação */
  async refresh() {
    await Categories.populateSelects();
    await CreditCards.populateSelect();
    Dashboard.render();
    Charts.renderAll();
    Filters.apply();
    Categories.render();
    Goals.render();
    Calendar.render();
    CreditCards.render();
    Installments.render();
    Notifications.update();
    Reports.generate();
  }
};

/** Inicializa autenticação ao carregar a página */
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
