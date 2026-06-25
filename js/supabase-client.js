/**
 * Cliente Supabase singleton
 */

let _supabase = null;
let _supabaseConfigKey = null;

const SUPABASE_STORAGE = {
  url: 'financas_supabase_url',
  key: 'financas_supabase_anon_key'
};

/** Normaliza URL do projeto (corrige erros comuns de colagem) */
function normalizeSupabaseUrl(url) {
  if (!url) return '';

  let normalized = String(url).trim().replace(/^["']|["']$/g, '');

  // Erro comum: colar URL do dashboard em vez da Project URL
  if (normalized.includes('supabase.com/dashboard')) {
    return '';
  }

  // Remove paths extras que o usuário pode colar por engano
  normalized = normalized.replace(/\/rest\/v1\/?$/i, '');
  normalized = normalized.replace(/\/auth\/v1\/?$/i, '');
  normalized = normalized.replace(/\/+$/, '');

  // Adiciona https:// se faltar
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  // Força https
  normalized = normalized.replace(/^http:\/\//i, 'https://');

  return normalized;
}

/** Normaliza chave anon */
function normalizeSupabaseKey(key) {
  if (!key) return '';
  return String(key).trim().replace(/^["']|["']$/g, '').replace(/\s+/g, '');
}

/** Valida formato da URL */
function isValidSupabaseUrl(url) {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
}

/** Obtém credenciais normalizadas */
function getSupabaseCredentials() {
  const storedUrl = localStorage.getItem(SUPABASE_STORAGE.url);
  const storedKey = localStorage.getItem(SUPABASE_STORAGE.key);

  return {
    url: normalizeSupabaseUrl(storedUrl || SUPABASE_CONFIG.url),
    anonKey: normalizeSupabaseKey(storedKey || SUPABASE_CONFIG.anonKey)
  };
}

/** Salva credenciais no navegador */
function saveSupabaseCredentials(url, anonKey) {
  const normalizedUrl = normalizeSupabaseUrl(url);
  const normalizedKey = normalizeSupabaseKey(anonKey);

  if (!isValidSupabaseUrl(normalizedUrl)) {
    throw new Error('URL inválida. Use: https://seu-projeto.supabase.co');
  }
  if (!normalizedKey.startsWith('eyJ') || normalizedKey.length < 100) {
    throw new Error('Chave anon inválida. Copie a "anon public" em Settings → API');
  }

  localStorage.setItem(SUPABASE_STORAGE.url, normalizedUrl);
  localStorage.setItem(SUPABASE_STORAGE.key, normalizedKey);
  resetSupabaseClient();
}

/** Reseta cliente ao trocar credenciais */
function resetSupabaseClient() {
  _supabase = null;
  _supabaseConfigKey = null;
}

/** Verifica se Supabase está configurado */
function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseCredentials();
  return isValidSupabaseUrl(url)
    && !url.includes('SUA_URL')
    && anonKey.length > 100
    && !anonKey.includes('SUA_CHAVE')
    && typeof supabase !== 'undefined';
}

/** URL segura para redirects de auth */
function getAuthRedirectUrl() {
  if (window.location.protocol === 'file:') {
    return 'http://localhost:8080';
  }
  return `${window.location.origin}${window.location.pathname}`;
}

/** Inicializa e retorna cliente Supabase via SDK oficial */
function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    console.error('SDK Supabase não carregou. Verifique o script no index.html');
    return null;
  }

  const { url, anonKey } = getSupabaseCredentials();
  const configKey = `${url}|${anonKey.slice(0, 20)}`;

  if (!_supabase || _supabaseConfigKey !== configKey) {
    _supabase = supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    _supabaseConfigKey = configKey;
  }

  return _supabase;
}

/** Testa conexão com o Supabase */
async function testSupabaseConnection() {
  const client = getSupabase();
  if (!client) {
    throw new Error('Cliente Supabase não inicializado');
  }

  const { error } = await client.auth.getSession();
  if (error) throw error;
  return true;
}

/** Retorna ID do usuário logado */
function getUserId() {
  return AppState.currentUser?.id || null;
}

/** Mensagem de erro amigável para auth */
function getSupabaseAuthErrorMessage(error) {
  const msg = error?.message || 'Erro desconhecido';

  if (msg.includes('Invalid path') || msg.includes('No host specified')) {
    return 'URL do Supabase incorreta. Use https://seu-projeto.supabase.co (Settings → API → Project URL)';
  }
  if (msg.includes('Invalid API key') || msg.includes('apikey')) {
    return 'Chave anon inválida. Copie a "anon public" em Settings → API';
  }
  if (msg === 'Invalid login credentials') {
    return 'E-mail ou senha incorretos';
  }
  if (msg.includes('already registered')) {
    return 'Este e-mail já está cadastrado';
  }

  return msg;
}
