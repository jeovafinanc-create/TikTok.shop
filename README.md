# TIKTOK-SHOP — estrutura inicial

Projeto independente de loja virtual, sem vínculo com o TikTok.

## Arquivos
Os 11 arquivos HTML/CSS/JS estão incluídos. Os arquivos auxiliares JS (produto.js, sacola.js etc.) também estão incluídos.

## Configuração inicial
1. Em `supabase.config.js`, preencher URL e chave PUBLICÁVEL do projeto Supabase.
2. Criar a tabela `public.products` com colunas:
   - id uuid primary key default gen_random_uuid()
   - name text not null
   - description text
   - category text
   - price numeric not null
   - image text
   - stock integer default 0
   - active boolean default true
   - created_at timestamptz default now()
3. Criar o bucket Storage `secret`. A URL pública só funcionará se o bucket permitir leitura pública. Upload exige política Storage restrita a administradores.
4. Criar autenticação e autorização administrativa com políticas RLS. O login Supabase, sozinho, NÃO transforma qualquer usuário em administrador. Configure uma tabela/política de administradores antes de usar em produção.

## Stripe
O checkout desta base é demonstrativo. Pagamento real exige backend seguro (por exemplo, Supabase Edge Function) para criar a Checkout Session, validar produtos/preços/estoque e usar a chave secreta Stripe somente no servidor. Nunca colocar chave secreta no navegador.

## Publicação
Para hospedagem estática, publicar a pasta raiz do projeto. `index.html` fica na raiz.
