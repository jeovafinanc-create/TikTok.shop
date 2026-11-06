
(() => {
  "use strict";

  const CART_KEY = "tiktok_shop_cart";

  const money = value =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const safe = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);

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
  }

  function updateCount(cart) {
    const count = document.getElementById("cart-count");
    if (count) {
      count.textContent = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
    }
  }

  function renderCart() {
    const container = document.getElementById("cart-items");
    const totalElement = document.getElementById("cart-total");

    if (!container || !totalElement) return;

    const cart = getCart();
    updateCount(cart);

    if (!cart.length) {
      container.innerHTML = `
        <div class="empty-cart">
          <h2>Sua sacola está vazia</h2>
          <p>Escolha um produto para continuar.</p>
          <a class="button" href="index.html">Ver produto</a>
        </div>
      `;

      totalElement.textContent = "Total: R$ 0,00";
      return;
    }

    let total = 0;

    container.innerHTML = cart.map((item, index) => {
      const price = Number(item.price || 0);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const subtotal = price * quantity;

      total += subtotal;

      return `
        <article class="cart-item">
          <div class="cart-product-image">
            ${item.image
              ? `<img src="${safe(item.image)}" alt="${safe(item.name)}">`
              : "<span>Produto</span>"}
          </div>

          <div class="cart-product-info">
            <h3>${safe(item.name)}</h3>

            <p>Preço: ${money(price)}</p>

            ${item.color
              ? `<p>Cor: ${safe(item.color)}</p>`
              : ""}

            <div class="cart-quantity">
              <button type="button" data-action="minus"
                data-index="${index}" aria-label="Diminuir quantidade">−</button>

              <span>${quantity}</span>

              <button type="button" data-action="plus"
                data-index="${index}" aria-label="Aumentar quantidade">+</button>
            </div>

            <strong>${money(subtotal)}</strong>

            <button class="remove-item" type="button"
              data-action="remove" data-index="${index}">
              Remover
            </button>
          </div>
        </article>
      `;
    }).join("");

    totalElement.textContent = "Total: " + money(total);

    container.querySelectorAll("[data-action]").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        const action = button.dataset.action;
        const updatedCart = getCart();

        if (!updatedCart[index]) return;

        if (action === "plus") {
          updatedCart[index].quantity =
            Number(updatedCart[index].quantity || 1) + 1;
        }

        if (action === "minus") {
          updatedCart[index].quantity =
            Number(updatedCart[index].quantity || 1) - 1;

          if (updatedCart[index].quantity <= 0) {
            updatedCart.splice(index, 1);
          }
        }

        if (action === "remove") {
          updatedCart.splice(index, 1);
        }

        saveCart(updatedCart);
        renderCart();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", renderCart);
})();
