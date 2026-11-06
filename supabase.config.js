// Configure com a URL e a chave PUBLICÁVEL do seu projeto Supabase.
// Nunca coloque service_role ou chave secreta em arquivos do navegador.
(() => {
  const SUPABASE_URL = "COLOQUE_AQUI_A_URL_DO_PROJETO";
  const SUPABASE_ANON_KEY = "COLOQUE_AQUI_A_CHAVE_PUBLICAVEL";

  if (!window.supabase) {
    console.error("Biblioteca Supabase não carregada.");
    return;
  }
  if (SUPABASE_URL.startsWith("COLOQUE_") || SUPABASE_ANON_KEY.startsWith("COLOQUE_")) {
    console.warn("Configure URL e chave pública do Supabase em supabase.config.js.");
    window.supabaseClient = null;
    return;
  }
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
