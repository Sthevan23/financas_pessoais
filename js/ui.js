/**
 * Interface do usuário - navegação, tema, sidebar e pesquisa
 */

const UI = {
  initialized: false,

  /** Inicializa UI */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.initNavigation();
    this.initTheme();
    this.initSidebar();
    this.initSearch();
    this.initModal();
    this.initSettings();
    this.loadSettings();
  },

  /** Navegação entre páginas */
  initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo(item.dataset.page);
        this.closeMobileSidebar();
      });
    });
  },

  /** Navega para página específica */
  navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    const navEl = document.querySelector(`[data-page="${page}"]`);

    if (pageEl) pageEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    // Atualiza conteúdo da página ao navegar
    const pageHandlers = {
      dashboard: () => { Dashboard.render(); Charts.renderAll(); },
      transactions: () => Filters.apply(),
      categories: () => Categories.render(),
      reports: () => Reports.generate(),
      goals: () => Goals.render(),
      calendar: () => Calendar.render(),
      'credit-cards': () => CreditCards.render(),
      installments: () => Installments.render()
    };

    if (pageHandlers[page]) pageHandlers[page]();
  },

  /** Tema claro/escuro */
  initTheme() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
    });
  },

  /** Define tema */
  setTheme(theme) {
    if (theme === 'auto') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', theme);
    AppState.theme = theme;

    const icon = document.querySelector('#theme-toggle i');
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

    Charts.renderAll();
    this.saveSettings();
  },

  /** Sidebar recolhível */
  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const app = document.getElementById('app');

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      app.classList.toggle('sidebar-collapsed');
      this.saveSettings();
    });

    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      sidebar.classList.toggle('open');
      this.toggleOverlay();
    });
  },

  /** Overlay mobile */
  toggleOverlay() {
    let overlay = document.querySelector('.sidebar-overlay');
    const sidebar = document.getElementById('sidebar');

    if (sidebar.classList.contains('open')) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => this.closeMobileSidebar());
        document.body.appendChild(overlay);
      }
    } else if (overlay) {
      overlay.remove();
    }
  },

  /** Fecha sidebar mobile */
  closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.remove();
  },

  /** Pesquisa rápida de lançamentos */
  initSearch() {
    const input = document.getElementById('global-search');
    let resultsEl = null;

    const doSearch = debounce(async (query) => {
      if (resultsEl) resultsEl.remove();
      if (!query || query.length < 2) return;

      const results = await Transactions.search(query);
      if (results.length === 0) return;

      resultsEl = document.createElement('div');
      resultsEl.className = 'search-results';
      resultsEl.innerHTML = results.map(t =>
        `<div class="search-result-item" data-id="${t.id}">
          <strong>${escapeHtml(t.description)}</strong>
          <span>${formatDate(t.date)} · ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
        </div>`
      ).join('');

      input.parentElement.appendChild(resultsEl);

      resultsEl.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          Transactions.edit(item.dataset.id);
          resultsEl.remove();
          input.value = '';
        });
      });
    }, 300);

    input.addEventListener('input', (e) => doSearch(e.target.value));

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && resultsEl && !resultsEl.contains(e.target)) {
        resultsEl.remove();
        resultsEl = null;
      }
    });
  },

  /** Modal genérico */
  initModal() {
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
  },

  /** Configurações */
  initSettings() {
    document.getElementById('settings-theme').addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });

    document.getElementById('btn-backup').addEventListener('click', () => Export.backup());

    document.getElementById('btn-restore').addEventListener('click', (e) => {
      const file = e.target.files[0];
      if (file) Export.restore(file);
      e.target.value = '';
    });

    document.getElementById('btn-clear-data').addEventListener('click', async () => {
      if (!confirmAction('ATENÇÃO: Isso apagará TODOS os seus dados financeiros. Deseja continuar?')) return;
      if (!confirmAction('Tem certeza? Esta ação não pode ser desfeita.')) return;
      await Database.clearUserData();
      showToast('Dados limpos. Categorias padrão restauradas.', 'warning');
      App.refresh();
    });
  },

  /** Carrega configurações salvas */
  async loadSettings() {
    const settings = await Database.getSettings();
    if (settings.theme) {
      document.getElementById('settings-theme').value = settings.theme;
      this.setTheme(settings.theme);
    }
    if (settings.sidebarCollapsed) {
      document.getElementById('sidebar').classList.add('collapsed');
      document.getElementById('app').classList.add('sidebar-collapsed');
    }
  },

  /** Salva configurações */
  async saveSettings() {
    const sidebar = document.getElementById('sidebar');
    await Database.saveSettings({
      theme: AppState.theme,
      sidebarCollapsed: sidebar.classList.contains('collapsed')
    });
  }
};
