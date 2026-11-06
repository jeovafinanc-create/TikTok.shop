
(() => {
  "use strict";

  const CART_KEY = "tiktok_shop_cart";

  // ==============================
  // SACOLA
  // ==============================

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function updateCartCount() {
    const countElement = document.getElementById("cart-count");
    if (!countElement) return;

    const quantity = getCart().reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

    countElement.textContent = quantity;
  }

  function addToCart(product, color = "", size = "") {
    if (!product || !product.id) {
      alert("Não foi possível adicionar este produto.");
      return false;
    }

    const cart = getCart();

    const existing = cart.find(item =>
      item.id === product.id &&
      item.color === color &&
      item.size === size
    );

    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name || "Produto",
        price: Number(product.price || 0),
        image: product.image || "",
        color: color || "",
        size: size || "",
        quantity: 1
      });
    }

    saveCart(cart);
    return true;
  }

  window.getCart = getCart;
  window.saveCart = saveCart;
  window.addToCart = addToCart;
  window.updateCartCount = updateCartCount;

  updateCartCount();

  // ==============================
  // PÁGINA DO PRODUTO
  // ==============================

  async function loadProduct() {
    const root = document.getElementById("product-detail");
    const description = document.getElementById("product-description");

    if (!root) return;

    const db = window.supabaseClient;
    const params = new URLSearchParams(location.search);
    const productId = params.get("id");

    if (!db) {
      root.textContent = "Não foi possível conectar ao catálogo.";
      return;
    }

    let request = db
      .from("products")
      .select("*")
      .eq("active", true);

    if (productId) {
      request = request.eq("id", productId);
    } else {
      request = request
        .order("created_at", { ascending: false })
        .limit(1);
    }

    const { data, error } = await request;

    if (error || !data || !data.length) {
      root.textContent = "Nenhum produto disponível no momento.";
      if (description) description.textContent = "";
      return;
    }

    const product = data[0];

    const money = value =>
      Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });

    const safe = value =>
      String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]);

    const safeUrl = value => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : "";
      } catch {
        return "";
      }
    };

    // Mídias cadastradas no painel administrativo
    let media = Array.isArray(product.media)
      ? product.media
      : [];

    media = media.map(item => ({
      type: item.type === "video" ? "video" : "image",
      url: safeUrl(item.url),
      name: item.name || ""
    })).filter(item => item.url);

    if (!media.length && product.image) {
      const image = safeUrl(product.image);
      if (image) {
        media.push({
          type: "image",
          url: image,
          name: product.name
        });
      }
    }

    const photos = media
      .filter(item => item.type === "image")
      .slice(0, 5);

    const videos = media.filter(item => item.type === "video");

    media = photos.length ? [...photos, ...videos] : videos;

    // Cores disponíveis
    let colors = product.colors || product.available_colors || [];

    if (typeof colors === "string") {
      colors = colors.split(",").map(color => color.trim());
    }

    if (!Array.isArray(colors)) colors = [];

    colors = colors.map(item => {
      if (typeof item === "string") return item;
      return item.color || item.name || "";
    }).filter(Boolean);

    let currentMedia = 0;
    let selectedColor = colors[0] || "";

    const stock = Number(product.stock || 0);

    document.title = `${product.name} | TIKTOK-SHOP`;

    root.innerHTML = `
      <div class="ts-product">

        <section class="ts-gallery">
          <div class="ts-main-wrap">
            <button id="ts-prev" class="ts-arrow ts-prev"
              type="button" aria-label="Mídia anterior">‹</button>

            <div id="ts-main-media" class="ts-main-media"></div>

            <button id="ts-next" class="ts-arrow ts-next"
              type="button" aria-label="Próxima mídia">›</button>
          </div>

          <div id="ts-thumbnails" class="ts-thumbnails"></div>
          <div id="ts-counter" class="ts-counter"></div>
        </section>

        <section class="ts-info">
          <span class="ts-category">${safe(product.category || "DESTAQUE")}</span>

          <h1>${safe(product.name)}</h1>

          <div class="ts-rating">★ Produto em destaque</div>

          <div class="ts-current-price">${money(product.price)}</div>

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

          <button id="ts-buy" class="ts-buy" type="button">
            COMPRAR
          </button>

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
        product.description || "Sem descrição cadastrada.";
    }

    // Galeria
    const main = document.getElementById("ts-main-media");
    const thumbs = document.getElementById("ts-thumbnails");
    const counter = document.getElementById("ts-counter");

    function showMedia(index) {
      if (!media.length) {
        main.innerHTML =
          "<div class='ts-no-media'>Fotos ou vídeo ainda não cadastrados.</div>";
        thumbs.innerHTML = "";
        counter.textContent = "";
        return;
      }

      currentMedia = (index + media.length) % media.length;
      const item = media[currentMedia];

      main.innerHTML = item.type === "video"
        ? `<video src="${safe(item.url)}" controls playsinline preload="metadata"></video>`
        : `<img src="${safe(item.url)}" alt="${safe(product.name)}">`;

      [...thumbs.children].forEach((element, i) => {
        element.classList.toggle("selected", i === currentMedia);
      });

      counter.textContent = `${currentMedia + 1} / ${media.length}`;
    }

    thumbs.innerHTML = media.map((item, index) => `
      <button class="ts-thumb ${index === 0 ? "selected" : ""}"
        data-index="${index}" type="button"
        aria-label="Ver mídia ${index + 1}">
        ${item.type === "video"
          ? "<span class='ts-video-thumb'>▶ VÍDEO</span>"
          : `<img src="${safe(item.url)}" alt="Foto ${index + 1}">`}
      </button>
    `).join("");

    thumbs.querySelectorAll(".ts-thumb").forEach(button => {
      button.addEventListener("click", () => {
        showMedia(Number(button.dataset.index));
      });
    });

    document.getElementById("ts-prev").onclick = () =>
      showMedia(currentMedia - 1);

    document.getElementById("ts-next").onclick = () =>
      showMedia(currentMedia + 1);

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
      colorBox.innerHTML = colors.map((color, index) => `
        <button type="button"
          class="ts-color ${index === 0 ? "selected" : ""}"
          data-color="${safe(color)}"
          aria-label="Selecionar ${safe(color)}">
          <span style="background:${colorMap[color.toLowerCase()] || "#dddddd"}"></span>
          <small>${safe(color)}</small>
        </button>
      `).join("");

      colorBox.querySelectorAll(".ts-color").forEach(button => {
        button.addEventListener("click", () => {
          selectedColor = button.dataset.color;

          colorBox.querySelectorAll(".ts-color").forEach(element => {
            element.classList.toggle("selected", element === button);
          });

          selectedLabel.textContent =
            "Cor selecionada: " + selectedColor;
        });
      });

      selectedLabel.textContent =
        "Cor selecionada: " + selectedColor;
    } else {
      colorBox.innerHTML =
        "<p class='ts-no-colors'>Cores ainda não cadastradas.</p>";
      selectedLabel.textContent = "";
    }

    // Único botão de compra
    document.getElementById("ts-buy").onclick = () => {
      if (stock <= 0) {
        alert("Produto sem estoque disponível.");
        return;
      }

      if (colors.length && !selectedColor) {
        alert("Selecione uma cor.");
        return;
      }

      const added = addToCart(product, selectedColor, "");

      if (added) {
        location.href = "sacola.html";
      }
    };

    updateCartCount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadProduct);
  } else {
    loadProduct();
  }
})();
