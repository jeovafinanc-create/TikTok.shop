
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return respond({ error: "Método não permitido." }, 405);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !serviceKey) {
      return respond({ error: "Configuração do servidor incompleta." }, 500);
    }

    const db = createClient(url, serviceKey);

    const body = await req.json();

    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_cep,
      customer_address,
      customer_number,
      items,
    } = body;

    if (
      !customer_name ||
      !customer_email ||
      !customer_phone ||
      !customer_cep ||
      !customer_address ||
      !customer_number ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return respond({ error: "Preencha todos os dados e informe os produtos." }, 400);
    }

    if (items.length > 30) {
      return respond({ error: "Limite de produtos excedido." }, 400);
    }

    const productIds = [...new Set(items.map((item) => item.id))];

    if (
      productIds.some((id) => typeof id !== "string") ||
      productIds.length !== items.length
    ) {
      return respond({ error: "Produtos inválidos ou repetidos." }, 400);
    }

    const { data: products, error: productError } = await db
      .from("products")
      .select("id, name, price, stock, active")
      .in("id", productIds);

    if (productError || !products || products.length !== productIds.length) {
      return respond({ error: "Não foi possível validar os produtos." }, 400);
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      const quantity = Number(item.quantity || 1);

      if (
        !product ||
        product.active !== true ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 20 ||
        product.stock < quantity
      ) {
        return respond({ error: "Produto indisponível ou quantidade inválida." }, 400);
      }

      const price = Number(product.price);
      subtotal += price * quantity;

      orderItems.push({
        id: product.id,
        name: product.name,
        price,
        quantity,
        color: String(item.color || ""),
      });
    }

    const orderNumber =
      "TT" + Date.now().toString().slice(-9) +
      Math.floor(100 + Math.random() * 900);

    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: String(customer_name).trim(),
        customer_email: String(customer_email).trim(),
        customer_phone: String(customer_phone).trim(),
        customer_cep: String(customer_cep).trim(),
        customer_address: String(customer_address).trim(),
        customer_number: String(customer_number).trim(),
        items: orderItems,
        subtotal,
        shipping: 0,
        total: subtotal,
        payment_method: "RecargaPay",
        payment_provider: "RecargaPay",
        payment_status: "pending",
        status: "pending",
        shipping_status: "awaiting_payment",
      })
      .select("id, order_number, total")
      .single();

    if (orderError) {
      console.error("Erro ao criar pedido:", orderError);
      return respond({ error: "Não foi possível registrar o pedido." }, 500);
    }

    return respond({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
      },
    });
  } catch (error) {
    console.error(error);
    return respond({ error: "Erro interno ao processar o pedido." }, 500);
  }
});
