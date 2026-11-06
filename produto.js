(async()=>{
 const db=window.supabaseClient; const root=document.getElementById("product-detail");
 const id=new URLSearchParams(location.search).get("id");
 if(!db||!id){root.innerHTML="<p>Não foi possível localizar o produto. Verifique a configuração e o link.</p>";return}
 const {data:p,error}=await db.from("products").select("*").eq("id",id).eq("active",true).single();
 if(error||!p){root.innerHTML="<p>Produto não encontrado.</p>";return}
 document.title=p.name+" | TIKTOK-SHOP";
 document.getElementById("product-description").textContent=p.description||"Sem descrição cadastrada.";
 root.innerHTML=`<div><img class="product-main-image" src="${p.image||""}" alt=""><div class="thumb-row"></div></div><div><p class="eyebrow">${p.category||"DESTAQUE"}</p><h1 class="page-title">${p.name}</h1><p class="price-large">${Number(p.price).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p><p class="muted">${Number(p.stock||0)>0?"Disponível em estoque":"Consulte disponibilidade"}</p><label class="label" for="color">Cor (opcional)</label><input class="field" id="color" placeholder="Ex.: Preto"><label class="label" for="size">Tamanho/opção (opcional)</label><input class="field" id="size" placeholder="Ex.: M"><button class="button button-block" id="add-cart" style="margin-top:18px">Adicionar à sacola</button></div>`;
 document.getElementById("add-cart").onclick=()=>addToCart(p,document.getElementById("color").value.trim(),document.getElementById("size").value.trim());
 updateCartCount();
})();
