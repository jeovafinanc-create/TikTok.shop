document.addEventListener("DOMContentLoaded",()=>{
 const root=document.getElementById("cart-items"), totalEl=document.getElementById("cart-total");
 function render(){
  const cart=getCart(); updateCartCount();
  if(!cart.length){root.innerHTML='<div class="empty-state">Sua sacola está vazia. <a href="index.html">Ver produtos</a></div>';totalEl.textContent="Total: R$ 0,00";return}
  root.innerHTML=cart.map((p,i)=>`<div class="cart-row" style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #eee"><div><strong>${p.name}</strong><p class="muted">${p.color||""} ${p.size||""}</p><p>${Number(p.price).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p></div><div class="quantity"><button data-minus="${i}">−</button>${p.quantity}<button data-plus="${i}">+</button><button data-remove="${i}" aria-label="Remover">✕</button></div></div>`).join("");
  totalEl.textContent="Total: "+cart.reduce((s,p)=>s+p.price*p.quantity,0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
 }
 root.addEventListener("click",e=>{
  const cart=getCart();let i;
  if(e.target.dataset.plus!==undefined){i=+e.target.dataset.plus;cart[i].quantity++}
  else if(e.target.dataset.minus!==undefined){i=+e.target.dataset.minus;cart[i].quantity=Math.max(1,cart[i].quantity-1)}
  else if(e.target.dataset.remove!==undefined){i=+e.target.dataset.remove;cart.splice(i,1)}
  else return;
  saveCart(cart);render();
 });
 render();
});