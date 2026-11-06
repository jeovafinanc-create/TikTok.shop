(() => {
  "use strict";

  const ORDER_KEY = "tiktok_shop_current_order";

  const money = value =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  function loadPayment() {
    const numberElement = document.getElementById("payment-order-number");
    const totalElement = document.getElementById("payment-total");
    const messageElement = document.getElementById("payment-message");

    if (!numberElement || !totalElement) return;

    let order = null;

    try {
      order = JSON.parse(localStorage.getItem(ORDER_KEY) || "null");
    } catch {
      order = null;
    }

    const params = new URLSearchParams(window.location.search);
    const orderNumber = params.get("pedido");

    if (!order || !order.order_number || order.order_number !== orderNumber) {
      numberElement.textContent = "Pedido não localizado";
      totalElement.textContent = "—";

      if (messageElement) {
        messageElement.textContent =
          "Não encontramos os dados deste pedido neste navegador. Entre em contato com a loja.";
      }

      const link = document.getElementById("recargapay-link");
      if (link) {
        link.style.pointerEvents = "none";
        link.style.opacity = ".5";
      }

      return;
    }

    numberElement.textContent = order.order_number;
    totalElement.textContent = money(order.total);

    if (messageElement) {
      messageElement.textContent =
        "Pedido registrado. Aguardando confirmação do pagamento pela loja.";
    }
  }

  document.addEventListener("DOMContentLoaded", loadPayment);
})();
