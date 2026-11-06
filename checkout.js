(() => {
  "use strict";

  const CART_KEY = "tiktok_shop_cart";
  const ORDER_KEY = "tiktok_shop_current_order";

  const db = () => window.supabaseClient;

  const money = value =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function showMessage(message, error = false) {
    const element = document.getElementById("checkout-message");
    if (!element) return;

    element.textContent = message;
    element.style.color = error ? "#fe2c55" : "#25f4ee";
  }

  function renderSummary() {
    const cart = getCart();
    const summary = document.getElementById("checkout-summary");

    if (!summary) return;

    if (!cart.length) {
      summary.innerHTML = "<p>Sua sacola está vazia.</p>";
      return;
    }

    const total = cart.reduce((sum, item) =>
      sum + Number(item.price || 0) *
      Math.max(1, Number(item.quantity || 1)), 0
    );

    summary.innerHTML = `
      <h2>Resumo do pedido</h2>
      ${cart.map(item => `
        <p>
          ${Number(item.quantity || 1)}x ${escapeHTML(item.name)}
          ${item.color ? " — " + escapeHTML(item.color) : ""}
          <strong>${money(Number(item.price || 0) *
            Number(item.quantity || 1))}</strong>
        </p>
      `).join("")}
      <h2>Total: ${money(total)}</h2>
    `;
  }

  function generateOrderNumber() {
    return "TT-" + Date.now() + "-" +
      Math.floor(100000 + Math.random() * 900000);
  }

  async function submitOrder(event) {
    event.preventDefault();

    const cart = getCart();

    if (!cart.length) {
      showMessage("Sua sacola está vazia.", true);
      return;
    }

    if (!db()) {
      showMessage("Falha na conexão com o sistema.", true);
      return;
    }

    const form = document.getElementById("checkout-form");

    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "REGISTRANDO PEDIDO...";

    try {
      const values = new FormData(form);

      const name = String(values.get("name") || "").trim();
      const email = String(values.get("email") || "").trim();
      const phone = String(values.get("phone") || "").trim();
      const cep = String(values.get("cep") || "").trim();
      const street = String(values.get("address") || "").trim();
      const number = String(values.get("number") || "").trim();
      const complement = String(values.get("complement") || "").trim();
      const neighborhood = String(values.get("neighborhood") || "").trim();
      const city = String(values.get("city") || "").trim();
      const state = String(values.get("state") || "").trim().toUpperCase();

      const address = [
        street,
        complement,
        neighborhood,
        city,
        state
      ].filter(Boolean).join(", ");

      const items = cart.map(item => ({
        product_id: item.id,
        name: item.name,
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        color: item.color || "",
        image: item.image || ""
      }));

      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const orderNumber = generateOrderNumber();

      const order = {
        order_number: orderNumber,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_cep: cep,
        customer_address: address,
        customer_number: number,
        items: items,
        subtotal: subtotal,
        shipping: 0,
        total: subtotal,
        payment_method: "RecargaPay",
        payment_provider: "RecargaPay",
        payment_status: "pending",
        status: "pending",
        shipping_status: "awaiting_payment"
      };

      const { data, error } = await db()
        .from("orders")
        .insert(order)
        .select("id, order_number")
        .single();

      if (error) {
        console.error("Erro ao registrar pedido:", error);
        throw new Error(error.message);
      }

      localStorage.setItem(ORDER_KEY, JSON.stringify({
        id: data.id,
        order_number: data.order_number,
        total: subtotal,
        customer_name: name
      }));

      localStorage.removeItem(CART_KEY);

      window.location.href =
        "pagamento.html?pedido=" +
        encodeURIComponent(data.order_number);

    } catch (error) {
      console.error(error);
      showMessage(
        "Não foi possível registrar o pedido: " + error.message,
        true
      );

      button.disabled = false;
      button.textContent = "CONTINUAR PARA PAGAMENTO";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderSummary();

    const form = document.getElementById("checkout-form");

    if (form) {
      form.addEventListener("submit", submitOrder);
    }
  });
})();
