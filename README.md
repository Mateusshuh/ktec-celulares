# KTEC Celulares

Site da KTEC, loja e assistência de celulares em Ijuí e Cruz Alta/RS: página única com as categorias
(iPhones, Xiaomi, JBL e áudio, acessórios e assistência técnica), vitrine de produtos, depoimentos e contato.
No ar em https://www.kteccelulares.com.br

## Rodar localmente

É um site estático, sem build. Sirva a pasta com qualquer servidor, por exemplo:

```bash
npx serve .
```

## Painel do administrador (`/paineldoadmin`)

Os produtos da vitrine (iPhones, Xiaomi, JBL, capinhas, películas e carregadores) são cadastrados em
`seudominio.com.br/paineldoadmin`, com login. Lá dá para escolher cidade (Ijuí ou Cruz Alta), condição
(novo, seminovo ou com defeito), preço e enviar várias fotos por produto. As fotos são reduzidas
automaticamente antes do envio.

Os dados e as fotos ficam no [Supabase](https://supabase.com). Configuração, uma vez só:

1. Crie uma conta e um projeto no Supabase (o plano gratuito serve para começar).
2. No projeto, abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/setup.sql` e clique em **Run**.
   Isso cria a tabela de produtos, a pasta de fotos e as regras de acesso.
3. Em **Authentication → Users → Add user → Create new user**, crie o usuário do painel (e-mail e senha),
   marcando **Auto Confirm User**.
4. Volte ao **SQL Editor** e libere esse usuário no painel (troque pelo e-mail criado):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'seu@email.com';
   ```
5. Em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**, para ninguém criar conta sozinho.
6. Em **Project Settings → API Keys** (e **Data API** para a URL), copie a **Project URL** e a chave
   **publishable** (ou a antiga **anon**) para `js/config.js`. Nunca use a chave **secret/service_role**.
7. Publique na Vercel. O painel abre em `/paineldoadmin`.

Para dar acesso a outra pessoa, repita os passos 3 e 4 com o e-mail dela.

## Onde editar

- `paineldoadmin/`: painel do administrador (login, cadastro de produtos e fotos)
- `supabase/setup.sql`: banco de dados e regras de acesso do painel
- `js/config.js`: conexão com o Supabase
- `index.html`: textos e seções do site
- `js/dados.js`: WhatsApp, endereços, Instagram, CNPJ e parcelamento
- `js/site.js`: vitrine (lê os produtos cadastrados no painel), filtros, menu e links de WhatsApp
- `css/site.css`: cores e estilos do site
- `css/style.css`: base de cores, fontes e botões usada pelo painel do administrador (mudanças aqui alteram o visual do painel)
- `IMAGENS.md`: fotos do site, com nome, pasta e tamanho

A vitrine também abre já filtrada pelo endereço, por exemplo `/?categoria=xiaomi&cidade=Cruz%20Alta#vitrine`.

Apple, iPhone, AirPods e Apple Watch são marcas registradas da Apple Inc.
