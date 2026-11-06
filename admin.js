
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
  const imagesInput = document.getElementById("images");

  const BUCKET = "secret";

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  // Campo de cores criado automaticamente no painel
  const colorField = document.createElement("div");
  colorField.className = "product-color-field";
  colorField.innerHTML = `
    <label for="product-colors">
      Cores disponíveis
    </label>
    <input
      type="text"
      id="product-colors"
      placeholder="Ex.: Preto, Branco, Azul, Titânio"
    >
    <small>Separe as cores por vírgula.</small>
  `;

  if (imagesInput) {
    imagesInput.parentElement.insertAdjacentElement(
      "beforebegin",
      colorField
    );

    imagesInput.setAttribute(
      "accept",
      "image/jpeg,image/png,image/webp,video/mp4,video/webm"
    );
    imagesInput.setAttribute("multiple", "");
  }

  const colorStyle = document.createElement("style");
  colorStyle.textContent = `
    .product-color-field {
      display:grid;
      gap:8px;
      margin:15px 0;
    }

    .product-color-field label {
      font-weight:700;
    }

    .product-color-field input {
      width:100%;
      padding:12px;
      border:1px solid #ccc;
      border-radius:8px;
      box-sizing:border-box;
    }

    .product-color-field small {
      color:#777;
    }
  `;
  document.head.appendChild(colorStyle);

  async function checkSession() {
    const db = await aguardarSupabase();

    if (!db) {
      loginMsg.textContent =
        "Falha ao inicializar o Supabase. Verifique a configuração.";
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

  document.getElementById("login-form")
    .addEventListener("submit", async e => {
      e.preventDefault();

      const db = await aguardarSupabase();

      if (!db) {
        loginMsg.textContent = "Falha ao inicializar o Supabase.";
        return;
      }

      loginMsg.textContent = "Entrando...";

      const email =
        document.getElementById("login-email").value.trim();

      const password =
        document.getElementById("login-password").value;

      const { error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        loginMsg.textContent = error.message;
        return;
      }

      loginMsg.textContent = "";
      await checkSession();
    });

  document.getElementById("logout-button")
    .addEventListener("click", async () => {
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
      .select("id,name,price,active,media,colors")
      .order("created_at", { ascending: false });

    if (error) {
      root.textContent =
        "Erro ao carregar produtos: " + error.message;
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
            <th>Cores</th>
            <th>Ativo</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => {
            const mediaCount =
              Array.isArray(p.media) ? p.media.length : 0;

            const colors =
              Array.isArray(p.colors) ? p.colors.join(", ") : "—";

            return `
              <tr>
                <td>${escapeHTML(p.name)}</td>
                <td>${Number(p.price).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })}</td>
                <td>${mediaCount || "Cadastro antigo"}</td>
                <td>${escapeHTML(colors)}</td>
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
      const { data: userData, error: userError } =
        await db.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Faça login novamente.");
      }

      const name =
        document.getElementById("name").value.trim();

      const price =
        Number(document.getElementById("price").value);

      const description =
        document.getElementById("description").value.trim();

      const category =
        document.getElementById("category").value.trim();

      const stock =
        Number(document.getElementById("stock").value || 0);

      const colors = [
        ...new Set(
          document.getElementById("product-colors").value
            .split(",")
            .map(color => color.trim())
            .filter(Boolean)
        )
      ];

      if (!name || !Number.isFinite(price) || price <= 0) {
        throw new Error("Informe o nome e um preço válido.");
      }

      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error("Informe um estoque válido.");
      }

      if (colors.length > 10) {
        throw new Error("Informe no máximo 10 cores.");
      }

      const selectedFiles = [...imagesInput.files];

      const imageFiles = selectedFiles.filter(file =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type)
      );

      const videoFiles = selectedFiles.filter(file =>
        ["video/mp4", "video/webm"].includes(file.type)
      );

      const invalidFiles = selectedFiles.filter(file =>
        !["image/jpeg", "image/png", "image/webp",
          "video/mp4", "video/webm"].includes(file.type)
      );

      if (invalidFiles.length) {
        throw new Error(
          "Formato não permitido. Use JPG, PNG, WEBP, MP4 ou WEBM."
        );
      }

      if (videoFiles.length && imageFiles.length) {
        throw new Error(
          "Escolha até 5 fotos OU 1 vídeo. Não misture os dois formatos."
        );
      }

      if (imageFiles.length > 5) {
        throw new Error("Escolha no máximo 5 fotos.");
      }

      if (videoFiles.length > 1) {
        throw new Error("Escolha somente 1 vídeo.");
      }

      const media = [];

      for (const file of selectedFiles) {
        const isImage = file.type.startsWith("image/");
        const maxSize = isImage
          ? 10 * 1024 * 1024
          : 50 * 1024 * 1024;

        if (file.size > maxSize) {
          throw new Error(
            `${file.name} ultrapassa o limite de ${
              isImage ? "10 MB" : "50 MB"
            }.`
          );
        }

        const safeName =
          file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        const uniqueId = crypto.randomUUID();
        const path = `${uniqueId}-${safeName}`;

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
          throw new Error(
            "Não foi possível obter o endereço da mídia."
          );
        }

        media.push({
          type: isImage ? "image" : "video",
          url,
          path,
          name: file.name
        });
      }

      const firstImage =
        media.find(item => item.type === "image");

      productMsg.textContent =
        "Salvando cadastro do produto...";

      const { error: insertError } = await db
        .from("products")
        .insert({
          name,
          price,
          description,
          category,
          stock,
          colors,
          image: firstImage ? firstImage.url : null,
          media,
          active: true
        });

      if (insertError) throw insertError;

      productMsg.textContent =
        "Produto cadastrado com sucesso!";

      productForm.reset();

      await loadProducts();

    } catch (error) {
      if (uploadedPaths.length) {
        const { error: cleanupError } = await db.storage
          .from(BUCKET)
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error(
            "Erro ao limpar arquivos:",
            cleanupError
          );
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
