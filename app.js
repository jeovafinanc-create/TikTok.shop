
(async () => {
  const db = window.supabaseClient;
  const root = document.getElementById("product-detail");
  const description = document.getElementById("product-description");
  const id = new URLSearchParams(location.search).get("id");

  const money = value =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const safe = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[c]);

  const safeUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  };

  if (!db || !id) {
    root.textContent = "Não foi possível localizar o produto.";
    return;
  }

  const { data: p, error } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();

  if (error || !p) {
    root.textContent = "Produto não encontrado.";
    return;
  }

  document.title = p.name + " | TIKTOK-SHOP";

  let media = Array.isArray(p.media) ? p.media : [];

  media = media.map(item => ({
    type: item.type === "video" ? "video" : "image",
    url: safeUrl(item.url),
    name: item.name || ""
  })).filter(item => item.url);

  // Compatibilidade com produtos antigos
  if (!media.length && p.image) {
    const oldImage = safeUrl(p.image);
    if (oldImage) {
      media.push({
        type: "image",
        url: oldImage,
        name: p.name
      });
    }
  }

  let current = 0;

  const stock = Number(p.stock || 0);
  const price = Number(p.price || 0);

  root.innerHTML = `
    <div class="ts-product">

      <section class="ts-gallery">
        <div id="ts-main-media" class="ts-main-media"></div>
        <div id="ts-thumbnails" class="ts-thumbnails"></div>
      </section>

      <section class="ts-info">
        <span class="ts-category">
          ${safe(p.category || "DESTAQUE")}
        </span>

        <h1>${safe(p.name)}</h1>

        <div class="ts-rating">
          ★ ${p.rating != null
            ? Number(p.rating).toFixed(1)
            : "Produto em destaque"}
        </div>

        <div class="ts-current-price">
          ${money(price)}
        </div>

        <p class="ts-stock">
          ${stock > 0
            ? "Produto disponível em estoque."
            : "Consulte a disponibilidade."}
        </p>

        <div class="ts-options">
          <label for="color">Cor ou variação</label>
          <input id="color" placeholder="Ex.: Preto">

          <label for="size">Tamanho ou opção</label>
          <input id="size" placeholder="Ex.: 256 GB">
        </div>

        <div class="ts-actions">
          <button id="ts-add" class="ts-add">
            ADICIONAR À SACOLA
          </button>

          <button id="ts-buy" class="ts-buy">
            COMPRAR
          </button>
        </div>
      </section>
    </div>
  `;

  description.textContent =
    p.description || "Sem descrição cadastrada.";

  const main = document.getElementById("ts-main-media");
  const thumbs = document.getElementById("ts-thumbnails");

  function showMedia(index) {
    if (!media.length) {
      main.innerHTML = "<div class='ts-no-media'>Mídia não cadastrada</div>";
      return;
    }

    current = index;
    const item = media[index];

    main.innerHTML = item.type === "video"
      ? `<video src="${safe(item.url)}"
           controls playsinline preload="metadata"></video>`
      : `<img src="${safe(item.url)}"
           alt="${safe(p.name)}">`;

    [...thumbs.children].forEach((el, i) => {
      el.classList.toggle("selected", i === index);
    });
  }

  thumbs.innerHTML = media.map((item, index) => `
    <button class="ts-thumb ${index === 0 ? "selected" : ""}"
      data-index="${index}" type="button">
      ${item.type === "video"
        ? `<span class="ts-video-thumb">▶ VÍDEO</span>`
        : `<img src="${safe(item.url)}" alt="Foto ${index + 1}">`}
    </button>
  `).join("");

  thumbs.querySelectorAll(".ts-thumb").forEach(button => {
    button.addEventListener("click", () => {
      showMedia(Number(button.dataset.index));
    });
  });

  showMedia(0);

  const addItem = () => {
    if (stock <= 0) {
      alert("Produto sem estoque disponível.");
      return false;
    }

    if (typeof window.addToCart !== "function") {
      alert("A sacola não foi carregada.");
      return false;
    }

    window.addToCart(
      p,
      document.getElementById("color").value.trim(),
      document.getElementById("size").value.trim()
    );

    return true;
  };

  document.getElementById("ts-add").onclick = addItem;

  document.getElementById("ts-buy").onclick = () => {
    if (addItem()) {
      location.href = "sacola.html";
    }
  };

  if (typeof window.updateCartCount === "function") {
    window.updateCartCount();
  }

  const style = document.createElement("style");

  style.textContent = `
    .ts-product {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:28px;
      max-width:1100px;
      margin:20px auto;
      color:#171717;
    }

    .ts-gallery,.ts-info { min-width:0; }

    .ts-main-media {
      background:#111;
      border-radius:12px;
      overflow:hidden;
      aspect-ratio:1/1;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .ts-main-media img,
    .ts-main-media video {
      width:100%;
      height:100%;
      object-fit:contain;
    }

    .ts-no-media {
      color:white;
      padding:30px;
    }

    .ts-thumbnails {
      display:flex;
      gap:10px;
      margin-top:12px;
      flex-wrap:wrap;
    }

    .ts-thumb {
      width:70px;
      height:70px;
      border:2px solid #ddd;
      border-radius:8px;
      overflow:hidden;
      padding:0;
      cursor:pointer;
      background:#111;
    }

    .ts-thumb.selected {
      border-color:#fe2c55;
    }

    .ts-thumb img {
      width:100%;
      height:100%;
      object-fit:cover;
    }

    .ts-video-thumb {
      color:white;
      display:flex;
      align-items:center;
      justify-content:center;
      width:100%;
      height:100%;
      font-size:12px;
      font-weight:bold;
    }

    .ts-category {
      color:#777;
      font-size:12px;
    }

    .ts-info h1 {
      font-size:25px;
      margin:10px 0;
    }

    .ts-rating {
      color:#d78a00;
      margin:12px 0;
    }

    .ts-current-price {
      font-size:32px;
      font-weight:800;
      margin:20px 0;
    }

    .ts-stock {
      color:#666;
      font-size:13px;
    }

    .ts-options {
      display:grid;
      gap:8px;
      margin:20px 0;
    }

    .ts-options input {
      padding:12px;
      border:1px solid #ddd;
      border-radius:7px;
    }

    .ts-actions {
      display:grid;
      gap:10px;
      grid-template-columns:1fr 1fr;
    }

    .ts-actions button {
      padding:15px 8px;
      border:0;
      border-radius:7px;
      font-weight:bold;
      cursor:pointer;
    }

    .ts-add {
      background:#ffe5eb;
      color:#d90038;
    }

    .ts-buy {
      background:#fe2c55;
      color:white;
    }

    @media(max-width:700px) {
      .ts-product {
        grid-template-columns:1fr;
        gap:18px;
      }

      .ts-info h1 { font-size:21px; }
    }
  `;

  document.head.appendChild(style);
})();
