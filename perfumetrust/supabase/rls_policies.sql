-- =====================================================================
-- PerfumeTrust — Row Level Security (RLS)
-- Execute por último, depois de schema.sql e functions_triggers.sql
-- =====================================================================

alter table public.profiles      enable row level security;
alter table public.transactions  enable row level security;
alter table public.reviews       enable row level security;
alter table public.reports       enable row level security;
alter table public.admin_actions enable row level security;

-- ---------------------------------------------------------------------
-- Trigger de proteção: impede que um usuário comum altere campos
-- sensíveis do próprio perfil (score, contadores, flags de admin/ban).
-- Só uma função "security definer" (RPC) ou um admin pode alterá-los.
--
-- IMPORTANTE: esta proteção só se aplica a conexões feitas com os roles
-- 'anon'/'authenticated' (ou seja, requisições vindas da API/PostgREST
-- com um JWT de usuário final). Conexões via SQL Editor do Supabase ou
-- com a service_role key (ex.: para promover o primeiro admin, ver
-- README seção 7.1) usam outro role e passam direto — do contrário,
-- como auth.uid() é nulo fora de uma requisição autenticada, o UPDATE
-- do próprio painel/admin seria revertido por engano.
--
-- Esta função é SECURITY INVOKER de propósito (NÃO definer): precisamos
-- ler current_user como o role real que disparou o UPDATE (anon/
-- authenticated vindo do PostgREST, ou postgres/service_role vindo do
-- SQL Editor). Com security definer, current_user viraria sempre o
-- dono da função e a checagem abaixo nunca bloquearia ninguém — a
-- leitura de profiles funciona mesmo assim porque a policy
-- "profiles_select_public" já permite SELECT a qualquer role.
-- ---------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new; -- SQL Editor / service_role: sem restrição extra (RLS já não se aplica a esses roles)
  end if;

  select is_admin into v_is_admin from public.profiles where id = auth.uid();

  if coalesce(v_is_admin, false) then
    return new; -- admin pode tudo (via painel), auditado pelas RPCs
  end if;

  -- usuário comum: preserva os valores antigos dos campos protegidos
  new.trust_score           := old.trust_score;
  new.average_rating        := old.average_rating;
  new.reviews_count         := old.reviews_count;
  new.completed_sales_count := old.completed_sales_count;
  new.is_admin              := old.is_admin;
  new.is_banned             := old.is_banned;
  new.banned_reason         := old.banned_reason;
  new.banned_at             := old.banned_at;
  new.banned_by             := old.banned_by;
  new.updated_at            := now();

  return new;
end;
$$;

drop trigger if exists protect_profile_columns_trg on public.profiles;
create trigger protect_profile_columns_trg
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- =====================================================================
-- PROFILES
-- =====================================================================
-- Leitura pública: é o ponto central do produto (checar reputação antes
-- de negociar), então qualquer visitante (anon ou logado) pode ver perfis.
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Um usuário só pode editar o próprio perfil (campos sensíveis protegidos
-- pelo trigger acima, independente desta policy).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert é feito pelo trigger handle_new_user (security definer);
-- policy abaixo é apenas um fallback defensivo.
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- =====================================================================
-- TRANSACTIONS
-- =====================================================================
-- Só comprador, vendedor ou admin podem ver a transação.
drop policy if exists "transactions_select_participants" on public.transactions;
create policy "transactions_select_participants"
  on public.transactions for select
  to authenticated
  using (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Qualquer usuário autenticado pode registrar uma transação em que
-- participa (como comprador ou vendedor), com o outro lado sendo um
-- perfil existente e não podendo ser ele mesmo.
drop policy if exists "transactions_insert_participant" on public.transactions;
create policy "transactions_insert_participant"
  on public.transactions for insert
  to authenticated
  with check (
    (auth.uid() = buyer_id or auth.uid() = seller_id)
    and buyer_id <> seller_id
  );

-- Não há policy de UPDATE direta para usuários comuns: a confirmação
-- de transação é feita exclusivamente via RPC public.confirm_transaction(),
-- que roda como security definer e mantém a regra de dupla confirmação.
-- Admin pode atualizar (ex.: marcar como 'disputed') para mediar conflitos.
drop policy if exists "transactions_update_admin" on public.transactions;
create policy "transactions_update_admin"
  on public.transactions for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- =====================================================================
-- REVIEWS
-- =====================================================================
-- Avaliações são públicas (histórico de avaliações no perfil do vendedor).
drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews for select
  to anon, authenticated
  using (true);

-- Inserção só é permitida para quem participou da transação, e somente
-- se ela estiver 'completed' (checagem redundante com o trigger
-- trg_reviews_before_insert, que é a fonte de verdade).
drop policy if exists "reviews_insert_after_completion" on public.reviews;
create policy "reviews_insert_after_completion"
  on public.reviews for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and t.status = 'completed'
        and auth.uid() in (t.buyer_id, t.seller_id)
        and reviewed_id in (t.buyer_id, t.seller_id)
        and reviewed_id <> auth.uid()
    )
  );

-- Sem policy de UPDATE/DELETE => ninguém pode alterar ou apagar avaliações.

-- =====================================================================
-- REPORTS (denúncias)
-- =====================================================================
-- O denunciante vê as próprias denúncias; o denunciado NÃO vê quem o
-- denunciou (privacidade); administradores veem todas.
drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin"
  on public.reports for select
  to authenticated
  using (
    auth.uid() = reporter_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Sem policy de UPDATE para usuários comuns: aprovação/rejeição só via
-- RPC public.admin_review_report() (security definer, auditado).
drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- =====================================================================
-- ADMIN_ACTIONS (log de auditoria)
-- =====================================================================
drop policy if exists "admin_actions_select_admin" on public.admin_actions;
create policy "admin_actions_select_admin"
  on public.admin_actions for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Inserção só acontece via funções security definer (admin_review_report,
-- admin_set_ban); não há policy de insert para uso direto pelo cliente.
