document.addEventListener("DOMContentLoaded",()=>{
 document.getElementById("reset-form").addEventListener("submit",async e=>{
  e.preventDefault();const msg=document.getElementById("reset-message");const db=window.supabaseClient;
  if(!db){msg.textContent="Configure o Supabase antes de usar esta função.";return}
  const email=document.getElementById("email").value.trim();
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/recuperar-senha.html"});
  msg.textContent=error?error.message:"Se o e-mail estiver cadastrado, você receberá as instruções.";
 });
});