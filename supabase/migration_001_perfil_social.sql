-- =====================================================================
-- PerfumeTrust — Migração 001: mais informações no perfil (rede social)
-- =====================================================================
-- Use este arquivo SE VOCÊ JÁ RODOU antes o schema.sql, functions_triggers.sql
-- e rls_policies.sql originais (ou seja, seu site já está no ar). Ele só
-- aplica as MUDANÇAS novas, sem apagar nada do que já existe:
--
--   1. Quantidade de compras concluídas (completed_purchases_count)
--   2. Quantidade de recomendações recebidas (recommendations_count)
--   3. Nova tabela "recommendations" (botão "Recomendo este vendedor")
--
-- "Membro há X tempo" não precisa de mudança no banco — já calculamos a
-- partir da coluna profiles.created_at, que já existe.
--
-- Como usar: copie todo este arquivo, cole no SQL Editor do Supabase do
-- seu projeto já publicado, e clique em Run. É seguro rodar mais de uma
-- vez (idempotente).
-- =====================================================================

-- 1) Novas colunas em profiles
alter table public.profiles
  add column if not exists completed_purchases_count integer not null default 0,
  add column if not exists recommendations_count      integer not null default 0;

-- 2) Nova tabela de recomendações
create table if not exists public.recommendations (
  id              uuid primary key default gen_random_uuid(),
  recommender_id  uuid not null references public.profiles(id),
  recommended_id  uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),

  constraint recommender_not_recommended check (recommender_id <> recommended_id),
  constraint one_recommendation_per_pair unique (recommender_id, recommended_id)
);

comment on table public.recommendations is 'Recomendação simples (sem nota/comentário) de um usuário para outro; contador exibido no perfil público.';

create index if not exists idx_recommendations_recommended on public.recommendations (recommended_id);

-- 3) Função + trigger para manter recommendations_count sempre atualizado
create or replace function public.refresh_recommendations_count(p_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
     set recommendations_count = (
           select count(*) from public.recommendations where recommended_id = p_profile_id
         ),
         updated_at = now()
   where id = p_profile_id;
end;
$$;

create or replace function public.trg_recommendations_after_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_recommendations_count(old.recommended_id);
    return old;
  else
    perform public.refresh_recommendations_count(new.recommended_id);
    return new;
  end if;
end;
$$;

drop trigger if exists recommendations_after_change on public.recommendations;
create trigger recommendations_after_change
  after insert or delete on public.recommendations
  for each row execute function public.trg_recommendations_after_change();

-- 4) Atualiza confirm_transaction para também contar compras do comprador
--    (substitui inteiramente a versão anterior da função)
create or replace function public.confirm_transaction(p_transaction_id uuid)
returns public.transactions
language plpgsql
security definer set search_path = public
as $$
declare
  v_tx     public.transactions;
  v_uid    uuid := auth.uid();
begin
  select * into v_tx from public.transactions where id = p_transaction_id for update;

  if v_tx is null then
    raise exception 'Transação não encontrada.';
  end if;

  if v_uid not in (v_tx.buyer_id, v_tx.seller_id) then
    raise exception 'Você não participa desta transação.';
  end if;

  if v_tx.status in ('cancelled', 'completed') then
    raise exception 'Transação já finalizada.';
  end if;

  if v_uid = v_tx.buyer_id then
    v_tx.buyer_confirmed_at := now();
  else
    v_tx.seller_confirmed_at := now();
  end if;

  if v_tx.buyer_confirmed_at is not null and v_tx.seller_confirmed_at is not null then
    v_tx.status := 'completed';
    v_tx.completed_at := now();
  elsif v_tx.buyer_confirmed_at is not null then
    v_tx.status := 'buyer_confirmed';
  elsif v_tx.seller_confirmed_at is not null then
    v_tx.status := 'seller_confirmed';
  end if;

  v_tx.updated_at := now();

  update public.transactions
     set status = v_tx.status,
         buyer_confirmed_at = v_tx.buyer_confirmed_at,
         seller_confirmed_at = v_tx.seller_confirmed_at,
         completed_at = v_tx.completed_at,
         updated_at = v_tx.updated_at
   where id = p_transaction_id;

  -- Ao concluir, incrementa vendas do vendedor e compras do comprador, e recalcula score dos dois
  if v_tx.status = 'completed' then
    update public.profiles
       set completed_sales_count = completed_sales_count + 1
     where id = v_tx.seller_id;

    update public.profiles
       set completed_purchases_count = completed_purchases_count + 1
     where id = v_tx.buyer_id;

    perform public.refresh_profile_stats(v_tx.seller_id);
    perform public.refresh_profile_stats(v_tx.buyer_id);
  end if;

  return v_tx;
end;
$$;

-- 5) Atualiza o trigger de proteção de colunas para também blindar as
--    2 colunas novas (substitui inteiramente a versão anterior)
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  select is_admin into v_is_admin from public.profiles where id = auth.uid();

  if coalesce(v_is_admin, false) then
    return new;
  end if;

  new.trust_score               := old.trust_score;
  new.average_rating            := old.average_rating;
  new.reviews_count             := old.reviews_count;
  new.completed_sales_count     := old.completed_sales_count;
  new.completed_purchases_count := old.completed_purchases_count;
  new.recommendations_count     := old.recommendations_count;
  new.is_admin                  := old.is_admin;
  new.is_banned                 := old.is_banned;
  new.banned_reason             := old.banned_reason;
  new.banned_at                 := old.banned_at;
  new.banned_by                 := old.banned_by;
  new.updated_at                := now();

  return new;
end;
$$;

-- 6) Segurança (RLS) da nova tabela recommendations
alter table public.recommendations enable row level security;

drop policy if exists "recommendations_select_public" on public.recommendations;
create policy "recommendations_select_public"
  on public.recommendations for select
  to anon, authenticated
  using (true);

drop policy if exists "recommendations_insert_own" on public.recommendations;
create policy "recommendations_insert_own"
  on public.recommendations for insert
  to authenticated
  with check (auth.uid() = recommender_id and recommender_id <> recommended_id);

drop policy if exists "recommendations_delete_own" on public.recommendations;
create policy "recommendations_delete_own"
  on public.recommendations for delete
  to authenticated
  using (auth.uid() = recommender_id);

-- 7) Preenche os contadores para quem já tinha dados antes desta migração
update public.profiles p
   set recommendations_count = (
     select count(*) from public.recommendations r where r.recommended_id = p.id
   );
