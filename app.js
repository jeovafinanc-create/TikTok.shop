
(async () => {
  const db = window.supabaseClient;
  const root = document.getElementById("product-detail");
  const description = document.getElementById("product-description");
  const id = new URLSearchParams(location.search).get("id");

  if (!root) return;

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

  // Fotos e vídeos cadastrados no produto
  let media = Array.isArray(p.media) ? p.media : [];

  media = media.map(item => ({
    type: item.type === "video" ? "video" : "image",
    url: safeUrl(item.url),
    name: item.name || ""
  })).filter(item => item.url);

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

  // Até cinco fotos, ou vídeo quando cadastrado
  const photos = media.filter(item => item.type === "image").slice(0, 5);
  const videos = media.filter(item => item.type === "video");
  media = photos.length ? [...photos, ...videos] : videos;

  // Cores disponíveis cadastradas no produto
  let colors = p.colors || p.available_colors || [];

  if (typeof colors === "string") {
    colors = colors.split(",").map(c => c.trim()).filter(Boolean);
  }

  if (!Array.isArray(colors)) colors = [];

  colors = colors.map(item => {
    if (typeof item === "string") return item;
    return item.color || item.name || "";
  }).filter(Boolean);

  let current = 0;
  let selectedColor = colors[0] || "";

  const stock = Number(p.stock || 0);
  const price = Number(p.price || 0);

  root.innerHTML = `
    <div class="ts-product">

      <section class="ts-gallery">
        <div class="ts-main-wrap">
          <button id="ts-prev" class="ts-arrow ts-prev"
            type="button" aria-label="Foto anterior">‹</button>

          <div id="ts-main-media" class="ts-main-media"></div>

          <button id="ts-next" class="ts-arrow ts-next"
            type="button" aria-label="Próxima foto">›</button>
        </div>

        <div id="ts-thumbnails" class="ts-thumbnails"></div>
        <div id="ts-counter" class="ts-counter"></div>
      </section>

      <section class="ts-info">
        <span class="ts-category">
          ${safe(p.category || "DESTAQUE")}
        </span>

        <h1>${safe(p.name)}</h1>

        <div class="ts-rating">★ Produto em destaque</div>

        <div class="ts-current-price">${money(price)}</div>

        <p class="ts-stock">
          ${stock > 0
            ? `${stock} unidade(s) disponível(is)`
            : "Produto sem estoque disponível"}
        </p>

        <div class="ts-options">
          <label>Escolha a cor disponível</label>
          <div id="ts-colors" class="ts-colors"></div>
          <p id="ts-selected-color" class="ts-selected-color"></p>
        </div>

        <div class="ts-buy-area">
          <button id="ts-buy" class="ts-buy" type="button">
            COMPRAR
          </button>
        </div>

        <div class="ts-benefits">
          <p>✓ Informações do pedido na próxima etapa</p>
          <p>✓ Acompanhamento do pedido</p>
          <p>✓ Pagamento pelo fluxo RecargaPay</p>
        </div>
      </section>
    </div>
  `;

  if (description) {
    description.textContent =
      p.description || "Sem descrição cadastrada.";
  }

  const main = document.getElementById("ts-main-media");
  const thumbs = document.getElementById("ts-thumbnails");
  const counter = document.getElementById("ts-counter");

  function showMedia(index) {
    if (!media.length) {
      main.innerHTML =
        "<div class='ts-no-media'>Fotos ou vídeo ainda não cadastrados.</div>";
      counter.textContent = "";
      thumbs.innerHTML = "";
      return;
    }

    current = (index + media.length) % media.length;
    const item = media[current];

    main.innerHTML = item.type === "video"
      ? `<video src="${safe(item.url)}"
           controls playsinline preload="metadata"></video>`
      : `<img src="${safe(item.url)}" alt="${safe(p.name)}">`;

    [...thumbs.children].forEach((el, i) => {
      el.classList.toggle("selected", i === current);
    });

    counter.textContent = `${current + 1} / ${media.length}`;
  }

  thumbs.innerHTML = media.map((item, index) => `
    <button class="ts-thumb ${index === 0 ? "selected" : ""}"
      data-index="${index}" type="button"
      aria-label="Ver mídia ${index + 1}">
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

  document.getElementById("ts-prev").onclick = () =>
    showMedia(current - 1);

  document.getElementById("ts-next").onclick = () =>
    showMedia(current + 1);

  showMedia(0);

  // Seleção das cores
  const colorBox = document.getElementById("ts-colors");
  const selectedLabel = document.getElementById("ts-selected-color");

  const colorMap = {
    "preto": "#171717",
    "black": "#171717",
    "branco": "#ffffff",
    "white": "#ffffff",
    "azul": "#2875c7",
    "blue": "#2875c7",
    "rosa": "#e9a4b8",
    "pink": "#e9a4b8",
    "dourado": "#c9a34a",
    "gold": "#c9a34a",
    "prata": "#c0c0c0",
    "silver": "#c0c0c0",
    "titânio": "#88847d",
    "titanio": "#88847d",
    "verde": "#39865b",
    "green": "#39865b",
    "roxo": "#8060a8",
    "purple": "#8060a8"
  };

  if (colors.length) {
    colorBox.innerHTML = colors.map((color, index) => {
      const background =
        colorMap[color.toLowerCase()] || "#dddddd";

      return `
        <button type="button"
          class="ts-color ${index === 0 ? "selected" : ""}"
          data-color="${safe(color)}"
          aria-label="Selecionar ${safe(color)}"
          title="${safe(color)}">
          <span style="background:${background}"></span>
          <small>${safe(color)}</small>
        </button>
      `;
    }).join("");

    colorBox.querySelectorAll(".ts-color").forEach(button => {
      button.addEventListener("click", () => {
        selectedColor = button.dataset.color;

        colorBox.querySelectorAll(".ts-color").forEach(el => {
          el.classList.toggle("selected", el === button);
        });

        selectedLabel.textContent = "Cor selecionada: " + selectedColor;
      });
    });

    selectedLabel.textContent = "Cor selecionada: " + selectedColor;
  } else {
    colorBox.innerHTML =
      "<p class='ts-no-colors'>Cores ainda não cadastradas.</p>";
    selectedLabel.textContent = "";
  }

  // ÚNICO botão de compra
  document.getElementById("ts-buy").onclick = () => {
    if (stock <= 0) {
      alert("Produto sem estoque disponível.");
      return;
    }

    if (colors.length && !selectedColor) {
      alert("Selecione uma cor.");
      return;
    }

    if (typeof window.addToCart !== "function") {
      alert("A sacola não foi carregada.");
      return;
    }

    window.addToCart(p, selectedColor, "");

    location.href = "sacola.html";
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
      padding:16px;
      color:#171717;
    }

    .ts-gallery,.ts-info { min-width:0; }

    .ts-main-wrap {
      position:relative;
      background:#111;
      border-radius:12px;
      overflow:hidden;
    }

    .ts-main-media {
      aspect-ratio:1/1;
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;
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

    .ts-arrow {
      position:absolute;
      z-index:2;
      top:50%;
      transform:translateY(-50%);
      width:38px;
      height:38px;
      border:0;
      border-radius:50%;
      background:rgba(0,0,0,.65);
      color:white;
      font-size:28px;
      cursor:pointer;
    }

    .ts-prev { left:10px; }
    .ts-next { right:10px; }

    .ts-thumbnails {
      display:flex;
      gap:9px;
      margin-top:12px;
      flex-wrap:wrap;
    }

    .ts-thumb {
      width:65px;
      height:65px;
      border:2px solid #ddd;
      border-radius:8px;
      overflow:hidden;
      padding:0;
      cursor:pointer;
      background:#111;
    }

    .ts-thumb.selected { border-color:#fe2c55; }

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
      font-size:11px;
      font-weight:bold;
    }

    .ts-counter {
      color:#777;
      font-size:12px;
      margin-top:8px;
    }

    .ts-category {
      color:#777;
      font-size:12px;
      text-transform:uppercase;
    }

    .ts-info h1 {
      font-size:25px;
      margin:10px 0;
    }

    .ts-rating { color:#d78a00; margin:12px 0; }

    .ts-current-price {
      font-size:32px;
      font-weight:800;
      margin:20px 0;
    }

    .ts-stock { color:#666; font-size:13px; }

    .ts-options {
      display:grid;
      gap:10px;
      margin:22px 0;
    }

    .ts-options label { font-weight:700; }

    .ts-colors {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
    }

    .ts-color {
      min-width:65px;
      padding:8px 7px;
      border:1px solid #ddd;
      border-radius:9px;
      background:white;
      cursor:pointer;
      display:grid;
      justify-items:center;
      gap:6px;
    }

    .ts-color span {
      display:block;
      width:27px;
      height:27px;
      border-radius:50%;
      border:1px solid #aaa;
    }

    .ts-color.selected {
      border:2px solid #fe2c55;
      background:#fff5f7;
    }

    .ts-color small { font-size:11px; }

    .ts-selected-color {
      color:#555;
      font-size:13px;
    }

    .ts-no-colors {
      color:#777;
      font-size:13px;
    }

    .ts-buy {
      width:100%;
      padding:17px;
      border:0;
      border-radius:9px;
      background:#fe2c55;
      color:white;
      font-size:16px;
      font-weight:800;
      cursor:pointer;
    }

    .ts-buy:hover { background:#df1743; }

    .ts-benefits {
      margin-top:20px;
      color:#555;
      font-size:13px;
      line-height:1.8;
    }

    @media(max-width:700px) {
      .ts-product {
        grid-template-columns:1fr;
        gap:18px;
        padding:12px;
      }

      .ts-info h1 { font-size:21px; }
      .ts-current-price { font-size:28px; }
    }
  `;

  document.head.appendChild(style);
})();
