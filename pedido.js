(() => {
  "use strict";

  const db = () => window.supabaseClient;

  const result = document.getElementById("order-result");
  const input = document.getElementById("order-number");
  const button = document.getElementById("search-order");

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showMessage(message, error = false) {
    result.innerHTML = `
      <p class="notice" style="color:${error ? "#fe2c55" : "#25f4ee"}">
        ${escapeHTML(message)}
      </p>
    `;
  }

  function statusLabel(status) {
    const labels = {
      pending: "Aguardando pagamento",
      paid: "Pagamento confirmado",
      approved: "Pagamento aprovado",
      awaiting_payment: "Aguardando pagamento",
      processing: "Pedido em preparação",
      preparing: "Pedido em preparação",
      shipped: "Pedido enviado",
      in_transit: "Em trânsito",
      delivered: "Pedido entregue",
      cancelled: "Pedido cancelado"
    };

    return labels[String(status || "").toLowerCase()] ||
      "Em atualização";
  }

  async function searchOrder() {
    const orderNumber = input.value.trim();

    if (!orderNumber) {
      showMessage("Digite o número do pedido.", true);
      return;
    }

    if (!db()) {
      showMessage("Não foi possível conectar ao sistema.", true);
      return;
    }

    button.disabled = true;
    button.textContent = "CONSULTANDO...";

    try {
      const { data, error } = await db()
        .from("orders")
        .select("order_number, payment_status, shipping_status, total, created_at")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (error) {
        console.error("Erro na consulta:", error);
        throw new Error(
          "Não foi possível consultar. Verifique as permissões de leitura da tabela orders no Supabase."
        );
      }

      if (!data) {
        showMessage("Pedido não encontrado. Confira o número informado.", true);
        return;
      }

      const payment = statusLabel(data.payment_status);
      const shipping = statusLabel(data.shipping_status);
      const total = Number(data.total || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
      });

      const date = data.created_at
        ? new Date(data.created_at).toLocaleDateString("pt-BR")
        : "Não informado";

      result.innerHTML = `
        <div class="order-status-card">
          <h2>Pedido localizado</h2>

          <p><strong>Número:</strong> ${escapeHTML(data.order_number)}</p>
          <p><strong>Data:</strong> ${escapeHTML(date)}</p>
          <p><strong>Total:</strong> ${escapeHTML(total)}</p>

          <div class="order-status-item">
            <span>Pagamento</span>
            <strong>${escapeHTML(payment)}</strong>
          </div>

          <div class="order-status-item">
            <span>Entrega</span>
            <strong>${escapeHTML(shipping)}</strong>
          </div>

          <p class="notice">
            A situação será atualizada pela loja após a confirmação do pagamento
            e o andamento do envio.
          </p>
        </div>
      `;
    } catch (error) {
      console.error(error);
      showMessage(error.message || "Erro ao consultar pedido.", true);
    } finally {
      button.disabled = false;
      button.textContent = "CONSULTAR PEDIDO";
    }
  }

  if (button && input && result) {
    button.addEventListener("click", searchOrder);

    input.addEventListener("keydown", event => {
      if (event.key === "Enter") searchOrder();
    });

    const savedOrder = localStorage.getItem("tiktok_shop_current_order");

    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        if (order.order_number) {
          input.value = order.order_number;
        }
      } catch {
        // Ignora dados locais inválidos.
      }
    }
  }
})();
