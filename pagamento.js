document.addEventListener("DOMContentLoaded",()=>{
 const data=JSON.parse(sessionStorage.getItem("tiktok_shop_checkout")||"null");
 const el=document.getElementById("payment-summary");
 if(!data){el.textContent="Nenhum pedido preparado. Volte à sacola.";return}
 el.textContent=`Pedido demonstrativo de ${data.customer.name}. Total: ${Number(data.total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}.`;
});