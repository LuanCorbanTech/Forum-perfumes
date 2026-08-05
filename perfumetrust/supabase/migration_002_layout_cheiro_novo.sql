-- =====================================================================
-- Cheiro Novo — Migração 002: novo layout + filtro por marca
-- =====================================================================
-- Use este arquivo SE VOCÊ JÁ RODOU antes o schema.sql original (e a
-- migração 001, se você aplicou). Ele só adiciona o que falta para o
-- novo visual do site (marca "Cheiro Novo", filtro por marca de perfume
-- no feed da home). Não apaga nada do que já existe.
--
-- Como usar: copie todo este arquivo, cole no SQL Editor do Supabase do
-- seu projeto, e clique em Run. É seguro rodar mais de uma vez.
-- =====================================================================

-- 1) Nova coluna: marcas que o vendedor costuma vender (usada nas abas de
--    filtro "Amouage / Creed / Dior / ..." na home). É uma lista de texto
--    simples, editada pelo próprio usuário no seu perfil.
alter table public.profiles
  add column if not exists brands text[] not null default '{}';

-- 2) Índice para o filtro por marca ser rápido mesmo com muitos vendedores
create index if not exists idx_profiles_brands on public.profiles using gin (brands);

-- Nenhuma mudança de RLS é necessária: a policy "profiles_update_own" já
-- permite que cada usuário edite o próprio perfil, e a coluna "brands"
-- não está na lista de colunas protegidas em protect_profile_columns().
