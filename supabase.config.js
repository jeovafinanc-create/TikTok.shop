(() => {
  const SUPABASE_URL = "https://wiryisehatplfwqxnxmp.supabase.co";

  // Cole sua chave pública verdadeira nesta linha.
  const SUPABASE_ANON_KEY = "sb_publishable_cQq5WFaCVeq4OCJSQNHdcg_z1bpFjl3";

  if (!window.supabase) {
    console.error("Biblioteca Supabase não carregada.");
    return;
  }

  if (SUPABASE_ANON_KEY === "sb_publishable_cQq5WFaCVeq4OCJSQNHdcg_z1bpFjl3") {
    console.error("Falta configurar a chave pública.");
    window.supabaseClient = null;
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  console.log("Supabase conectado!");
})();
