-- ==========================================================================
-- KTEC Celulares · banco do painel /paineldoadmin
-- Rode este arquivo inteiro uma vez no Supabase: SQL Editor → New query → colar → Run.
-- ==========================================================================

-- Quem pode usar o painel. Depois de criar o usuário em Authentication → Users, rode:
--   insert into public.admins (user_id) select id from auth.users where email = 'seu@email.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Produtos da vitrine
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  categoria text not null check (categoria in ('iphone', 'xiaomi', 'jbl', 'capinha', 'pelicula', 'carregador')),
  nome text not null check (length(trim(nome)) > 0),
  condicao text not null check (condicao in ('novo', 'seminovo', 'com_defeito')),
  cidade text not null check (cidade in ('Ijuí', 'Cruz Alta')),
  capacidade text,
  cor text,
  bateria smallint check (bateria between 0 and 100),
  defeito text,
  descricao text,
  preco numeric(10, 2) check (preco >= 0),
  fotos text[] not null default '{}', -- caminhos no Storage; a primeira é a capa
  visivel boolean not null default true
);

create index if not exists produtos_vitrine_idx on public.produtos (visivel, criado_em desc);

create or replace function public.produtos_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists produtos_atualizado_em on public.produtos;
create trigger produtos_atualizado_em
  before update on public.produtos
  for each row execute function public.produtos_atualizado_em();

-- Regras: o site só lê o que está visível; só administradores escrevem
alter table public.admins enable row level security;
alter table public.produtos enable row level security;

drop policy if exists "admin ve a propria linha" on public.admins;
create policy "admin ve a propria linha" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "site le produtos visiveis" on public.produtos;
create policy "site le produtos visiveis" on public.produtos
  for select to anon, authenticated using (visivel or public.is_admin());

drop policy if exists "admin cadastra produtos" on public.produtos;
create policy "admin cadastra produtos" on public.produtos
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admin edita produtos" on public.produtos;
create policy "admin edita produtos" on public.produtos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin exclui produtos" on public.produtos;
create policy "admin exclui produtos" on public.produtos
  for delete to authenticated using (public.is_admin());

-- Fotos: pasta pública "produtos" (qualquer um vê, só administradores enviam e apagam)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin envia fotos" on storage.objects;
create policy "admin envia fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "admin troca fotos" on storage.objects;
create policy "admin troca fotos" on storage.objects
  for update to authenticated using (bucket_id = 'produtos' and public.is_admin());

drop policy if exists "admin apaga fotos" on storage.objects;
create policy "admin apaga fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'produtos' and public.is_admin());
