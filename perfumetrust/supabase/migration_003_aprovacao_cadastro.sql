-- =====================================================================
-- Cheiro Novo — Migração 003: aprovação de cadastro pelo admin
-- =====================================================================
-- Adiciona um status de aprovação ao cadastro. A partir de agora, todo
-- MUNDO QUE JÁ TEM CONTA continua igual (aprovado automaticamente por
-- esta migração) — só quem se cadastrar A PARTIR DE AGORA entra como
-- "pendente" até um admin aprovar no painel.
--
-- Enquanto pendente, a pessoa consegue navegar e buscar vendedores
-- normalmente, mas não consegue: registrar transação, avaliar, denunciar,
-- nem aparecer nas listagens públicas de vendedores.
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez.
-- =====================================================================

-- 1) Nova coluna. O default 'approved' aqui é o que preenche quem JÁ
--    tinha conta (ninguém que já usa o site é afetado).
alter table public.profiles
  add column if not exists approval_status text not null default 'approved';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_approval_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end
$$;

-- Só a partir de agora: todo NOVO cadastro nasce pendente.
alter table public.profiles alter column approval_status set default 'pending';

create index if not exists idx_profiles_approval_status on public.profiles (approval_status);

-- 2) Registra os novos tipos de ação no log de auditoria do admin.
alter table public.admin_actions drop constraint if exists admin_actions_action_type_check;
alter table public.admin_actions
  add constraint admin_actions_action_type_check
  check (action_type in (
    'report_approved', 'report_rejected', 'user_banned', 'user_unbanned',
    'signup_approved', 'signup_rejected'
  ));

-- 3) Protege a coluna: usuário comum não pode se autoaprovar (substitui
--    inteiramente a versão anterior da função).
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
  new.reviews_count              := old.reviews_count;
  new.completed_sales_count     := old.completed_sales_count;
  new.completed_purchases_count := old.completed_purchases_count;
  new.recommendations_count     := old.recommendations_count;
  new.approval_status           := old.approval_status;
  new.is_admin                  := old.is_admin;
  new.is_banned                 := old.is_banned;
  new.banned_reason             := old.banned_reason;
  new.banned_at                 := old.banned_at;
  new.banned_by                 := old.banned_by;
  new.updated_at                := now();

  return new;
end;
$$;

-- 4) RPC para o admin aprovar/rejeitar um cadastro (auditado).
create or replace function public.admin_review_signup(p_user_id uuid, p_approve boolean, p_notes text default null)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_profile public.profiles;
begin
  select is_admin into v_is_admin from public.profiles where id = v_uid;
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem revisar cadastros.';
  end if;

  update public.profiles
     set approval_status = case when p_approve then 'approved' else 'rejected' end
   where id = p_user_id
   returning * into v_profile;

  insert into public.admin_actions (admin_id, action_type, target_user_id, notes)
  values (v_uid, case when p_approve then 'signup_approved' else 'signup_rejected' end, p_user_id, p_notes);

  return v_profile;
end;
$$;

-- 5) Reforça no trigger de avaliação (defesa redundante, mesma ideia da
--    checagem de status 'completed' que já existia).
create or replace function public.trg_reviews_before_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tx record;
  v_reviewer_status text;
begin
  select * into v_tx from public.transactions where id = new.transaction_id;

  if v_tx is null then
    raise exception 'Transação não encontrada.';
  end if;

  if v_tx.status <> 'completed' then
    raise exception 'Avaliação só é permitida após confirmação dos dois lados (status completed).';
  end if;

  if new.reviewer_id not in (v_tx.buyer_id, v_tx.seller_id) then
    raise exception 'Você não participou desta transação.';
  end if;

  if new.reviewed_id not in (v_tx.buyer_id, v_tx.seller_id) or new.reviewed_id = new.reviewer_id then
    raise exception 'Avaliado inválido para esta transação.';
  end if;

  select approval_status into v_reviewer_status from public.profiles where id = new.reviewer_id;
  if v_reviewer_status <> 'approved' then
    raise exception 'Seu cadastro ainda está em análise — aguarde a aprovação para avaliar.';
  end if;

  return new;
end;
$$;

-- 6) RLS: exige cadastro aprovado para registrar transação, avaliar ou denunciar.
drop policy if exists "transactions_insert_participant" on public.transactions;
create policy "transactions_insert_participant"
  on public.transactions for insert
  to authenticated
  with check (
    (auth.uid() = buyer_id or auth.uid() = seller_id)
    and buyer_id <> seller_id
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.approval_status = 'approved'
    )
  );

drop policy if exists "reviews_insert_after_completion" on public.reviews;
create policy "reviews_insert_after_completion"
  on public.reviews for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.approval_status = 'approved'
    )
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and t.status = 'completed'
        and auth.uid() in (t.buyer_id, t.seller_id)
        and reviewed_id in (t.buyer_id, t.seller_id)
        and reviewed_id <> auth.uid()
    )
  );

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.approval_status = 'approved'
    )
  );

-- 7) Garante que ninguém que já tinha conta ficou pendente por engano.
update public.profiles set approval_status = 'approved' where approval_status is null;
