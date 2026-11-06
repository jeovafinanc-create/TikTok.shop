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

    const total = cart.reduce((sum, item) => {
      return sum +
        Number(item.price || 0) *
        Math.max(1, Number(item.quantity || 1));
    }, 0);

    summary.innerHTML = `
      <h2>Resumo do pedido</h2>
      ${cart.map(item => `
        <p>
          ${Number(item.quantity || 1)}x
          ${escapeHTML(item.name)}
          ${item.color ? " — " + escapeHTML(item.color) : ""}
          <strong>
            ${money(Number(item.price || 0) * Number(item.quantity || 1))}
          </strong>
        </p>
      `).join("")}
      <p>Frete: a combinar</p>
      <h2>Total dos produtos: ${money(total)}</h2>
    `;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function generateOrderNumber() {
    const random = Math.floor(100000 + Math.random() * 900000);
    return "TT-" + Date.now() + "-" + random;
  }

  async function submitOrder(event) {
    event.preventDefault();

    const cart = getCart();

    if (!cart.length) {
      showMessage("Sua sacola está vazia. Escolha um produto primeiro.", true);
      return;
    }

    if (!db()) {
      showMessage("Não foi possível conectar ao sistema. Tente novamente.", true);
      return;
    }

    const form = document.getElementById("checkout-form");
    if (!form.reportValidity()) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "REGISTRANDO PEDIDO...";

    try {
      const formData = new FormData(form);

      const name = String(formData.get("name") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const cep = String(formData.get("cep") || "").trim();

      const addressParts = [
        String(formData.get("address") || "").trim(),
        "Nº " + String(formData.get("number") || "").trim(),
        String(formData.get("complement") || "").trim(),
        String(formData.get("neighborhood") || "").trim(),
        String(formData.get("city") || "").trim(),
        String(formData.get("state") || "").trim().toUpperCase()
      ].filter(Boolean);

      const address = addressParts.join(", ");

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
        items: items,
        subtotal: subtotal,
        shipping: 0,
        total: subtotal,
        payment_status: "pending",
        payment_provider: "RecargaPay",
        shipping_status: "awaiting_payment"
      };

      const { data, error } = await db()
        .from("orders")
        .insert(order)
        .select("id, order_number")
        .single();

      if (error) {
        console.error("Erro ao registrar pedido:", error);
        throw new Error(
          "Não foi possível registrar o pedido. Verifique a conexão e as permissões da tabela orders."
        );
      }

      localStorage.setItem(ORDER_KEY, JSON.stringify({
        id: data.id,
        order_number: data.order_number,
        total: subtotal,
        customer_name: name
      }));

      localStorage.removeItem(CART_KEY);

      window.location.href =
        "pagamento.html?pedido=" + encodeURIComponent(data.order_number);

    } catch (error) {
      console.error(error);
      showMessage(error.message || "Erro ao finalizar o pedido.", true);

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
