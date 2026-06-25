/**
 * Cliente Supabase singleton
 */

let _supabase = null;

const SUPABASE_STORAGE = {
  url: 'financas_supabase_url',
  key: 'financas_supabase_anon_key'
};

/** Obtém credenciais (arquivo ou localStorage) */
function getSupabaseCredentials() {
  const storedUrl = localStorage.getItem(SUPABASE_STORAGE.url);
  const storedKey = localStorage.getItem(SUPABASE_STORAGE.key);

  return {
    url: storedUrl || SUPABASE_CONFIG.url,
    anonKey: storedKey || SUPABASE_CONFIG.anonKey
  };
}

/** Salva credenciais no navegador */
function saveSupabaseCredentials(url, anonKey) {
  localStorage.setItem(SUPABASE_STORAGE.url, url.trim());
  localStorage.setItem(SUPABASE_STORAGE.key, anonKey.trim());
  _supabase = null;
}

/** Verifica se Supabase está configurado */
function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseCredentials();
  return url
    && anonKey
    && !url.includes('SUA_URL')
    && !anonKey.includes('SUA_CHAVE')
    && url.startsWith('https://')
    && anonKey.length > 20;
}

/** Inicializa e retorna cliente Supabase */
function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const { url, anonKey } = getSupabaseCredentials();
  if (!_supabase) {
    _supabase = supabase.createClient(url, anonKey);
  }
  return _supabase;
}

/** Retorna ID do usuário logado */
function getUserId() {
  return AppState.currentUser?.id || null;
}
