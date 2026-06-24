/**
 * Cliente Supabase singleton
 */

let _supabase = null;

/** Verifica se Supabase está configurado */
function isSupabaseConfigured() {
  return SUPABASE_CONFIG.url
    && SUPABASE_CONFIG.anonKey
    && !SUPABASE_CONFIG.url.includes('SUA_URL')
    && !SUPABASE_CONFIG.anonKey.includes('SUA_CHAVE');
}

/** Inicializa e retorna cliente Supabase */
function getSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!_supabase) {
    _supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return _supabase;
}

/** Retorna ID do usuário logado */
function getUserId() {
  return AppState.currentUser?.id || null;
}
