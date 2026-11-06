document.addEventListener("DOMContentLoaded",()=>{
 const db=window.supabaseClient, loginPanel=document.getElementById("login-panel"), adminPanel=document.getElementById("admin-panel");
 const loginMsg=document.getElementById("login-message"), productMsg=document.getElementById("product-message");
 async function checkSession(){
  if(!db)return;
  const {data}=await db.auth.getSession();
  if(data.session){loginPanel.classList.add("hidden");adminPanel.classList.remove("hidden");loadProducts()}
 }
 document.getElementById("login-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!db){loginMsg.textContent="Configure o Supabase.";return}
  const {error}=await db.auth.signInWithPassword({email:document.getElementById("login-email").value.trim(),password:document.getElementById("login-password").value});
  loginMsg.textContent=error?error.message:"";if(!error)checkSession();
 });
 document.getElementById("logout-button").addEventListener("click",async()=>{await db.auth.signOut();adminPanel.classList.add("hidden");loginPanel.classList.remove("hidden")});
 async function loadProducts(){
  const root=document.getElementById("admin-products");const {data,error}=await db.from("products").select("id,name,price,active").order("created_at",{ascending:false});
  if(error){root.textContent=error.message;return}
  root.innerHTML=`<table><thead><tr><th>Produto</th><th>Preço</th><th>Ativo</th></tr></thead><tbody>${(data||[]).map(p=>`<tr><td>${String(p.name).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}</td><td>${Number(p.price).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td><td>${p.active?"Sim":"Não"}</td></tr>`).join("")}</tbody></table>`;
 }
 document.getElementById("product-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!db){productMsg.textContent="Configure o Supabase.";return}
  const user=await db.auth.getUser();if(!user.data.user){productMsg.textContent="Faça login novamente.";return}
  const name=document.getElementById("name").value.trim(), price=Number(document.getElementById("price").value);
  const description=document.getElementById("description").value.trim(), category=document.getElementById("category").value.trim(), stock=Number(document.getElementById("stock").value||0);
  let image=null;const selected=[...document.getElementById("images").files];
  try{
   if(selected.length){
    const file=selected[0];if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Use JPG, PNG ou WEBP.");
    const path=`${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const {error:uploadError}=await db.storage.from("secret").upload(path,file,{upsert:false,contentType:file.type});
    if(uploadError)throw uploadError;
    image=db.storage.from("secret").getPublicUrl(path).data.publicUrl;
   }
   const {error}=await db.from("products").insert({name,price,description,category,stock,image,active:true});
   if(error)throw error;
   productMsg.textContent="Produto cadastrado.";e.target.reset();loadProducts();
  }catch(error){productMsg.textContent=error.message||"Erro ao cadastrar."}
 });
 checkSession();
});