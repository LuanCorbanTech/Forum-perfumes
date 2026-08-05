-- =====================================================================
-- Cheiro Novo — Migração 004: tipos de item no perfil + foto na avaliação
-- =====================================================================
-- 1) Novo campo no perfil: que tipos de item a pessoa costuma vender
--    (frasco cheio, decant, parcial/tester). Editável no "Editar perfil".
-- 2) Novo campo na avaliação: foto opcional do perfume recebido, anexada
--    pelo avaliador (bucket de storage próprio, com upload restrito ao
--    dono da avaliação).
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez.
-- =====================================================================

-- 1) Tipos de item no perfil.
alter table public.profiles
  add column if not exists item_types text[] not null default '{}';

create index if not exists idx_profiles_item_types on public.profiles using gin (item_types);

-- 1b) Reforço defensivo: alguns perfis estavam mostrando "Perfumes
--     comprados" como undefined no card — sinal de que essa coluna (criada
--     numa migração anterior, "perfil social") pode não existir de fato na
--     tabela. "add column if not exists" é seguro mesmo se ela já existir.
alter table public.profiles
  add column if not exists completed_purchases_count integer not null default 0,
  add column if not exists recommendations_count integer not null default 0;

-- 2) Foto opcional na avaliação.
alter table public.reviews
  add column if not exists photo_url text;

-- 3) Bucket de storage público pra guardar essas fotos.
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- 4) Upload só dentro da própria "pasta" (nome do arquivo começando com o
--    uid do avaliador) — ninguém sobe foto em nome de outra pessoa.
--    Leitura é livre (bucket público), pra aparecer no perfil de qualquer
--    visitante.
drop policy if exists "review_photos_insert_own_folder" on storage.objects;
create policy "review_photos_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "review_photos_select_public" on storage.objects;
create policy "review_photos_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'review-photos');
