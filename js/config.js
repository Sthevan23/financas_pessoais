/**
 * Configurações globais da aplicação
 */
const CONFIG = {
  APP_NAME: 'Finanças Pessoais',
  VERSION: '1.0.0',
  STORAGE_PREFIX: 'financas_pessoais_',
  CURRENCY: 'BRL',
  LOCALE: 'pt-BR',

  PAYMENT_METHODS: {
    pix: 'PIX',
    transfer: 'Transferência',
    cash: 'Dinheiro',
    debit: 'Débito',
    credit: 'Crédito',
    other: 'Outro'
  },

  DEFAULT_CATEGORIES: [
    { name: 'Alimentação', type: 'expense', icon: 'fa-utensils', color: '#ef4444' },
    { name: 'Transporte', type: 'expense', icon: 'fa-car', color: '#f97316' },
    { name: 'Moradia', type: 'expense', icon: 'fa-house', color: '#eab308' },
    { name: 'Saúde', type: 'expense', icon: 'fa-heart-pulse', color: '#22c55e' },
    { name: 'Educação', type: 'expense', icon: 'fa-graduation-cap', color: '#3b82f6' },
    { name: 'Lazer', type: 'expense', icon: 'fa-gamepad', color: '#8b5cf6' },
    { name: 'Investimentos', type: 'income', icon: 'fa-chart-line', color: '#06b6d4' },
    { name: 'Cartão de Crédito', type: 'expense', icon: 'fa-credit-card', color: '#ec4899' },
    { name: 'Combustível', type: 'expense', icon: 'fa-gas-pump', color: '#f59e0b' },
    { name: 'Internet', type: 'expense', icon: 'fa-wifi', color: '#6366f1' },
    { name: 'Água', type: 'expense', icon: 'fa-droplet', color: '#0ea5e9' },
    { name: 'Energia', type: 'expense', icon: 'fa-bolt', color: '#fbbf24' },
    { name: 'Salário', type: 'income', icon: 'fa-money-bill-wave', color: '#10b981' },
    { name: 'Freelance', type: 'income', icon: 'fa-laptop', color: '#14b8a6' },
    { name: 'Outros', type: 'both', icon: 'fa-ellipsis', color: '#64748b' }
  ],

  CARD_COLORS: ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']
};

/** Estado global da aplicação */
const AppState = {
  currentUser: null,
  sessionKey: null,
  theme: 'light'
};
