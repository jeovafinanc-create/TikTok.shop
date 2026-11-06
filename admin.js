
document.addEventListener("DOMContentLoaded", () => {
  const getDB = () => window.supabaseClient || null;

  async function aguardarSupabase() {
    for (let i = 0; i < 30; i++) {
      const db = getDB();

      if (db && db.auth) return db;

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return null;
  }

  const loginPanel = document.getElementById("login-panel");
  const adminPanel = document.getElementById("admin-panel");
  const loginMsg = document.getElementById("login-message");
  const productMsg = document.getElementById("product-message");
  const productForm = document.getElementById("product-form");
  const saveButton = document.getElementById("save-product");

  const BUCKET = "secret";

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  async function checkSession() {
    const db = await aguardarSupabase();

    if (!db) {
      loginMsg.textContent = "Falha ao inicializar o Supabase. Verifique a configuração.";
      return;
    }

    const { data, error } = await db.auth.getSession();

    if (error) {
      loginMsg.textContent = error.message;
      return;
    }

    if (data.session) {
      loginPanel.classList.add("hidden");
      adminPanel.classList.remove("hidden");
      await loadProducts();
    }
  }

  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();

    const db = await aguardarSupabase();

    if (!db) {
      loginMsg.textContent = "Falha ao inicializar o Supabase.";
      return;
    }

    loginMsg.textContent = "Entrando...";

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      loginMsg.textContent = error.message;
      return;
    }

    loginMsg.textContent = "";
    await checkSession();
  });

  document.getElementById("logout-button").addEventListener("click", async () => {
    const db = getDB();

    if (db) await db.auth.signOut();

    adminPanel.classList.add("hidden");
    loginPanel.classList.remove("hidden");
  });

  async function loadProducts() {
    const db = await aguardarSupabase();
    const root = document.getElementById("admin-products");

    if (!db) {
      root.textContent = "Supabase não inicializado.";
      return;
    }

    const { data, error } = await db
      .from("products")
      .select("id,name,price,active,media")
      .order("created_at", { ascending: false });

    if (error) {
      root.textContent = "Erro ao carregar produtos: " + error.message;
      return;
    }

    if (!data || data.length === 0) {
      root.innerHTML = "<p>Nenhum produto cadastrado.</p>";
      return;
    }

    root.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Preço</th>
            <th>Mídias</th>
            <th>Ativo</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => {
            const mediaCount = Array.isArray(p.media) ? p.media.length : 0;

            return `
              <tr>
                <td>${escapeHTML(p.name)}</td>
                <td>${Number(p.price).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })}</td>
                <td>${mediaCount || "Cadastro antigo"}</td>
                <td>${p.active ? "Sim" : "Não"}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  productForm.addEventListener("submit", async e => {
    e.preventDefault();

    const db = await aguardarSupabase();

    if (!db) {
      productMsg.textContent = "Supabase não inicializado.";
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Salvando...";
    productMsg.textContent = "";

    const uploadedPaths = [];

    try {
      const { data: userData, error: userError } = await db.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Faça login novamente.");
      }

      const name = document.getElementById("name").value.trim();
      const price = Number(document.getElementById("price").value);
      const description = document.getElementById("description").value.trim();
      const category = document.getElementById("category").value.trim();
      const stock = Number(document.getElementById("stock").value || 0);

      if (!name || !Number.isFinite(price) || price <= 0) {
        throw new Error("Informe o nome e um preço válido.");
      }

      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error("Informe um estoque válido.");
      }

      const selectedFiles = [
        ...document.getElementById("images").files
      ];

      const media = [];

      for (const file of selectedFiles) {
        const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
        const isVideo = ["video/mp4", "video/webm"].includes(file.type);

        if (!isImage && !isVideo) {
          throw new Error(`Formato não permitido: ${file.name}. Use JPG, PNG, WEBP, MP4 ou WEBM.`);
        }

        const maxSize = isVideo
          ? 50 * 1024 * 1024
          : 10 * 1024 * 1024;

        if (file.size > maxSize) {
          throw new Error(`${file.name} ultrapassa o limite de ${isVideo ? "50 MB" : "10 MB"}.`);
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${crypto.randomUUID()}-${safeName}`;

        productMsg.textContent = `Enviando ${file.name}...`;

        const { error: uploadError } = await db.storage
          .from(BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type
          });

        if (uploadError) throw uploadError;

        uploadedPaths.push(path);

        const { data: publicData } = db.storage
          .from(BUCKET)
          .getPublicUrl(path);

        const url = publicData?.publicUrl;

        if (!url) {
          throw new Error("Não foi possível obter o endereço da mídia.");
        }

        media.push({
          type: isImage ? "image" : "video",
          url,
          path,
          name: file.name
        });
      }

      const firstImage = media.find(item => item.type === "image");

      productMsg.textContent = "Salvando cadastro do produto...";

      const { error: insertError } = await db
        .from("products")
        .insert({
          name,
          price,
          description,
          category,
          stock,
          image: firstImage ? firstImage.url : null,
          media,
          active: true
        });

      if (insertError) throw insertError;

      productMsg.textContent = "Produto cadastrado com sucesso!";
      productForm.reset();

      await loadProducts();

    } catch (error) {
      if (uploadedPaths.length) {
        const { error: cleanupError } = await db.storage
          .from(BUCKET)
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error("Erro ao limpar arquivos:", cleanupError);
        }
      }

      productMsg.textContent =
        error.message || "Não foi possível cadastrar o produto.";

    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Cadastrar produto";
    }
  });

  checkSession();
});
