document.addEventListener("DOMContentLoaded",()=>{
 const form=document.getElementById("checkout-form");
 form.addEventListener("submit",e=>{
  e.preventDefault();
  const cart=getCart();
  if(!cart.length){alert("Sua sacola está vazia.");location.href="sacola.html";return}
  const customer={name:document.getElementById("name").value.trim(),email:document.getElementById("email").value.trim(),phone:document.getElementById("phone").value.trim(),cep:document.getElementById("cep").value.trim(),address:document.getElementById("address").value.trim(),number:document.getElementById("number").value.trim()};
  sessionStorage.setItem("tiktok_shop_checkout",JSON.stringify({customer,cart,total:cart.reduce((s,p)=>s+p.price*p.quantity,0)}));
  location.href="pagamento.html";
 });
});