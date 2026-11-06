
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

  const safe = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);

  if (!db || !id) {
    root.innerHTML = "<p>Não foi possível localizar o produto.</p>";
    return;
  }

  const { data: p, error } = await db
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .single();

  if (error || !p) {
    root.innerHTML = "<p>Produto não encontrado.</p>";
    return;
  }

  document.title = p.name + " | TIKTOK-SHOP";

  const image = safe(p.image || "");
  const price = Number(p.price || 0);
  const oldPrice = Number(p.original_price || 0);
  const hasDiscount = oldPrice > price && price > 0;
  const discount = hasDiscount
    ? Math.round((1 - price / oldPrice) * 100)
    : 0;

  const rating = p.rating != null ? Number(p.rating) : null;
  const reviews = p.review_count != null ? Number(p.review_count) : null;
  const stock = Number(p.stock || 0);

  root.innerHTML = `
    <div class="ts-product">

      <div class="ts-gallery">
        <div class="ts-main-photo">
          ${image
            ? `<img src="${image}" alt="${safe(p.name)}">`
            : `<div class="ts-no-photo">Foto do produto</div>`}
          ${hasDiscount ? `<span class="ts-photo-tag">-${discount}% OFF</span>` : ""}
        </div>
        <div class="ts-thumbnails">
          ${image ? `<img src="${image}" alt="Foto do produto">` : ""}
        </div>
      </div>

      <div class="ts-info">
        <div class="ts-flash">
          <span>OFERTA ESPECIAL</span>
          <small>Confira as condições do produto</small>
        </div>

        <p class="ts-category">${safe(p.category || "DESTAQUE")}</p>

        <h1>${safe(p.name)}</h1>

        <div class="ts-rating">
          ${rating !== null
            ? `★ ${rating.toFixed(1)} ${reviews !== null ? `(${reviews} avaliações)` : ""}`
            : "Ainda sem avaliações cadastradas"}
        </div>

        <div class="ts-prices">
          ${hasDiscount ? `<span class="ts-old-price">${money(oldPrice)}</span>` : ""}
          <div class="ts-current-price">${money(price)}</div>
          ${hasDiscount ? `<span class="ts-discount">${discount}% OFF</span>` : ""}
        </div>

        <p class="ts-payment">Consulte as condições de pagamento na finalização.</p>

        <div class="ts-delivery">
          <strong>🚚 Informações de disponibilidade</strong>
          <p>${stock > 0 ? "Produto disponível em estoque." : "Consulte a disponibilidade."}</p>
        </div>

        <div class="ts-options">
          <label for="color">Cor ou variação</label>
          <input id="color" placeholder="Ex.: Preto">

          <label for="size">Tamanho ou opção</label>
          <input id="size" placeholder="Ex.: M">
        </div>

        <div class="ts-actions">
          <button id="ts-add" class="ts-add">Adicionar à sacola</button>
          <button id="ts-buy" class="ts-buy">Comprar agora</button>
        </div>

        <p class="ts-stock">${stock > 0 ? "Disponibilidade sujeita à atualização do estoque." : "Estoque não disponível no momento."}</p>
      </div>
    </div>
  `;

  description.textContent = p.description || "Sem descrição cadastrada.";

  const addItem = () => {
    if (typeof window.addToCart !== "function") {
      alert("A função da sacola não foi carregada. Atualize a página.");
      return false;
    }

    window.addToCart(
      p,
      document.getElementById("color").value.trim(),
      document.getElementById("size").value.trim()
    );

    if (typeof window.updateCartCount === "function") {
      window.updateCartCount();
    }
    return true;
  };

  document.getElementById("ts-add").onclick = addItem;

  document.getElementById("ts-buy").onclick = () => {
    if (addItem()) location.href = "sacola.html";
  };

  if (typeof window.updateCartCount === "function") {
    window.updateCartCount();
  }

  const style = document.createElement("style");
  style.textContent = `
    .ts-product {
      display:grid; grid-template-columns:1fr 1fr;
      gap:28px; max-width:1100px; margin:20px auto;
      color:#171717;
    }
    .ts-gallery,.ts-info { min-width:0; }
    .ts-main-photo {
      position:relative; background:#f5f5f5;
      border-radius:12px; overflow:hidden;
      aspect-ratio:1/1; display:flex;
      align-items:center; justify-content:center;
    }
    .ts-main-photo img { width:100%; height:100%; object-fit:contain; }
    .ts-no-photo { color:#777; }
    .ts-photo-tag {
      position:absolute; top:14px; left:14px;
      background:#fe2c55; color:white;
      padding:8px 12px; font-weight:bold; border-radius:5px;
    }
    .ts-thumbnails { display:flex; gap:10px; margin-top:12px; }
    .ts-thumbnails img {
      width:65px; height:65px; object-fit:cover;
      border:1px solid #ddd; border-radius:7px;
    }
    .ts-flash {
      background:#fe2c55; color:white; padding:13px;
      border-radius:8px; display:flex;
      justify-content:space-between; gap:8px; flex-wrap:wrap;
    }
    .ts-flash span { font-weight:bold; }
    .ts-category { color:#777; font-size:12px; margin-top:20px; }
    .ts-info h1 { font-size:25px; line-height:1.3; margin:8px 0; }
    .ts-rating { color:#d78a00; margin:12px 0; font-size:14px; }
    .ts-prices { margin:18px 0 8px; }
    .ts-old-price { color:#888; text-decoration:line-through; }
    .ts-current-price { font-size:32px; font-weight:800; }
    .ts-discount {
      display:inline-block; background:#ffe5eb; color:#d90038;
      padding:5px 8px; border-radius:4px; font-weight:bold;
    }
    .ts-payment { color:#666; font-size:13px; }
    .ts-delivery {
      border-top:1px solid #eee; border-bottom:1px solid #eee;
      padding:15px 0; margin:18px 0;
    }
    .ts-delivery p { color:#666; margin:6px 0 0; font-size:14px; }
    .ts-options { display:grid; gap:8px; margin:15px 0; }
    .ts-options label { font-weight:bold; font-size:13px; }
    .ts-options input {
      padding:12px; border:1px solid #ddd;
      border-radius:7px; width:100%; font-size:14px;
    }
    .ts-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .ts-actions button {
      border:0; padding:15px 10px; border-radius:7px;
      font-weight:bold; cursor:pointer; font-size:14px;
    }
    .ts-add { background:#ffe5eb; color:#d90038; }
    .ts-buy { background:#fe2c55; color:white; }
    .ts-stock { font-size:12px; color:#777; margin-top:12px; }
    @media(max-width:700px) {
      .ts-product { grid-template-columns:1fr; gap:18px; }
      .ts-info h1 { font-size:21px; }
      .ts-current-price { font-size:28px; }
    }
  `;
  document.head.appendChild(style);
})();
