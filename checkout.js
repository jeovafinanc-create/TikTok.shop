
document.addEventListener("DOMContentLoaded", () => {
  const db = window.supabaseClient;
  const form = document.getElementById("checkout-form");
  const summary = document.getElementById("checkout-summary");
  const message = document.getElementById("checkout-message");

  const money = value =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });

  const getField = name =>
    form.elements.namedItem(name)?.value?.trim() || "";

  const showMessage = (text, error = false) => {
    if (!message) return;
    message.textContent = text;
    message.style.color = error ? "#ff526f" : "#25f4ee";
  };

  let cart = [];

  try {
    cart = JSON.parse(localStorage.getItem("tiktok_shop_cart") || "[]");
  } catch {
    cart = [];
  }

  if (!cart.length) {
    showMessage("Sua sacola está vazia.", true);
    if (summary) {
      summary.textContent = "Adicione produtos antes de continuar.";
    }
    return;
  }

  const subtotal = cart.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  if (summary) {
    summary.textContent = `Total dos produtos: ${money(subtotal)}`;
  }

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!db) {
      showMessage("Falha na conexão com o Supabase.", true);
      return;
    }

    const name = getField("name");
    const email = getField("email");
    const phone = getField("phone");
    const cep = getField("cep");
    const address = getField("address");
    const number = getField("number");

    const complement = getField("complement");
    const neighborhood = getField("neighborhood");
    const city = getField("city");
    const state = getField("state");

    if (!name || !email || !phone || !cep || !address || !number) {
      showMessage("Preencha todos os campos obrigatórios.", true);
      return;
    }

    const fullAddress = [
      address,
      complement,
      neighborhood,
      city,
      state
    ].filter(Boolean).join(", ");

    const items = cart.map(item => ({
      id: item.id,
      quantity: Number(item.quantity || 1),
      color: item.color || ""
    }));

    if (items.some(item => !item.id)) {
      showMessage("Existe um produto inválido na sacola.", true);
      return;
    }

    const submitButton = form.querySelector('[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Registrando pedido...";
    }

    showMessage("Registrando seu pedido. Aguarde...");

    try {
      const { data, error } = await db.functions.invoke("create-order", {
        body: {
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          customer_cep: cep,
          customer_address: fullAddress,
          customer_number: number,
          items
        }
      });

      if (error) {
        console.error("Erro na função:", error);
        throw new Error("Não foi possível registrar o pedido.");
      }

      if (!data || !data.success || !data.order) {
        throw new Error(data?.error || "Resposta inválida do servidor.");
      }

      const currentOrder = {
        id: data.order.id,
        order_number: data.order.order_number,
        total: Number(data.order.total),
        customer_name: name
      };

      localStorage.setItem(
        "tiktok_shop_current_order",
        JSON.stringify(currentOrder)
      );

      localStorage.removeItem("tiktok_shop_cart");

      window.location.href =
        "pagamento.html?pedido=" +
        encodeURIComponent(data.order.order_number);

    } catch (error) {
      console.error(error);
      showMessage(
        error.message || "Erro ao registrar o pedido. Tente novamente.",
        true
      );

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Continuar";
      }
    }
  });
});
