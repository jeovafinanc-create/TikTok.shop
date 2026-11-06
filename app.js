const db = window.supabaseClient || null;
const money = value => Number(value || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const CART_KEY = "tiktok_shop_cart";

function getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{return []} }
function saveCart(cart){localStorage.setItem(CART_KEY,JSON.stringify(cart));updateCartCount()}
function updateCartCount(){
  const el=document.getElementById("cart-count");
  if(el) el.textContent=getCart().reduce((sum,item)=>sum+Number(item.quantity||1),0);
}
function addToCart(product, color="", size=""){
  const cart=getCart();
  const key=[product.id,color,size].join("|");
  const existing=cart.find(item=>item.key===key);
  if(existing) existing.quantity+=1;
  else cart.push({key,id:product.id,name:product.name,price:Number(product.price),image:product.image||"",color,size,quantity:1});
  saveCart(cart);
  alert("Produto adicionado à sacola.");
}
async function getProducts(){
  if(!db) return [];
  const {data,error}=await db.from("products").select("id,name,description,category,price,image,stock,active,created_at").eq("active",true).order("created_at",{ascending:false});
  if(error) throw error;
  return data||[];
}
function productCard(p){
  const image=p.image ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">` : `<div class="product-placeholder">▧</div>`;
  return `<article class="product-card">${image}<div class="product-info"><h3>${escapeHTML(p.name)}</h3><div class="price">${money(p.price)}</div><p class="product-description">${escapeHTML(p.description||"Confira os detalhes deste produto.")}</p><a class="button button-block" href="produto.html?id=${encodeURIComponent(p.id)}">Ver produto</a></div></article>`;
}
async function renderStore(){
  const grid=document.getElementById("product-grid");
  if(!grid) return;
  const status=document.getElementById("product-status");
  const empty=document.getElementById("empty-state");
  try{
    const products=await getProducts();
    grid.innerHTML=products.map(productCard).join("");
    if(status) status.textContent=`${products.length} produto(s)`;
    if(empty) empty.classList.toggle("hidden",products.length>0);
  }catch(error){
    console.error(error);
    if(status) status.textContent="Não foi possível carregar os produtos.";
    if(empty){empty.textContent="Configure o Supabase e a tabela products para exibir produtos.";empty.classList.remove("hidden")}
  }
}
function setupSearch(){
  const form=document.getElementById("search-form");
  if(!form)return;
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const term=(document.getElementById("search-input")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const title=document.getElementById("listing-title");
    if(title) title.textContent=term?`Resultados para: ${term}`:"Produtos em destaque";
    const grid=document.getElementById("product-grid");
    try{
      const products=await getProducts();
      const filtered=products.filter(p=>`${p.name} ${p.description||""} ${p.category||""}`.toLocaleLowerCase("pt-BR").includes(term));
      grid.innerHTML=filtered.map(productCard).join("");
      const empty=document.getElementById("empty-state");
      if(empty) empty.classList.toggle("hidden",filtered.length>0);
    }catch(error){console.error(error)}
  });
}
document.addEventListener("DOMContentLoaded",()=>{
  updateCartCount();
  setupSearch();
  renderStore();
});
