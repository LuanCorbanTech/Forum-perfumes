-- =====================================================================
-- PerfumeTrust — Funções e triggers de negócio
-- Execute depois de schema.sql e antes de rls_policies.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Criação automática de profile ao registrar usuário no auth.users
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, new.phone, 'Usuário'), '@', 1)),
    new.phone,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2) Cálculo do Score de Confiabilidade (0-100)
--    Fórmula (documentada e ajustável):
--      + até 50 pts  -> (nota média / 5) * 50
--      + até 30 pts  -> 1 ponto por venda concluída, até 30 vendas
--      + até 10 pts  -> antiguidade da conta (1 pt a cada 30 dias, até 10)
--      + até 10 pts  -> base inicial de confiança para conta nova/verificada
--      -  15 pts     -> por denúncia APROVADA contra o usuário (não cumulativo ilimitado: cap em -60)
--    Resultado é sempre restrito (clamp) entre 0 e 100.
--    Usuário banido tem trust_score forçado para 0 (ver trigger de ban).
-- ---------------------------------------------------------------------
create or replace function public.calculate_trust_score(p_profile_id uuid)
returns integer
language plpgsql
as $$
declare
  v_avg_rating       numeric;
  v_completed_sales  integer;
  v_account_age_days integer;
  v_approved_reports integer;
  v_is_banned        boolean;
  v_score            numeric;
begin
  select average_rating, completed_sales_count, is_banned,
         extract(day from now() - created_at)::int
    into v_avg_rating, v_completed_sales, v_is_banned, v_account_age_days
  from public.profiles
  where id = p_profile_id;

  if v_is_banned then
    return 0;
  end if;

  select count(*) into v_approved_reports
  from public.reports
  where reported_id = p_profile_id and status = 'approved';

  v_score :=
      (coalesce(v_avg_rating, 0) / 5.0) * 50
    + least(coalesce(v_completed_sales, 0), 30) * 1.0
    + least(coalesce(v_account_age_days, 0) / 30.0, 10) * 1.0
    + 10  -- base inicial
    - least(coalesce(v_approved_reports, 0) * 15, 60);

  return greatest(0, least(100, round(v_score)::int));
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Recalcular estatísticas do perfil (nota média, contagem, score)
-- ---------------------------------------------------------------------
create or replace function public.refresh_profile_stats(p_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_avg   numeric;
  v_count integer;
begin
  select coalesce(avg(rating), 0), count(*)
    into v_avg, v_count
  from public.reviews
  where reviewed_id = p_profile_id;

  update public.profiles
     set average_rating = round(v_avg, 2),
         reviews_count  = v_count,
         updated_at     = now()
   where id = p_profile_id;

  update public.profiles
     set trust_score = public.calculate_trust_score(p_profile_id)
   where id = p_profile_id;
end;
$$;

-- Trigger: após inserir uma review, recalcula estatísticas do avaliado
create or replace function public.trg_reviews_after_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.refresh_profile_stats(new.reviewed_id);
  return new;
end;
$$;

drop trigger if exists reviews_after_insert on public.reviews;
create trigger reviews_after_insert
  after insert on public.reviews
  for each row execute function public.trg_reviews_after_insert();

-- ---------------------------------------------------------------------
-- 4) Validação de review: só pode existir se a transação está 'completed'
--    e o reviewer/reviewed pertencem de fato à transação.
--    (Camada extra de segurança além da policy de RLS.)
-- ---------------------------------------------------------------------
create or replace function public.trg_reviews_before_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tx record;
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

  return new;
end;
$$;

drop trigger if exists reviews_before_insert on public.reviews;
create trigger reviews_before_insert
  before insert on public.reviews
  for each row execute function public.trg_reviews_before_insert();

-- ---------------------------------------------------------------------
-- 4b) Contador de recomendações — recalcula recommendations_count sempre
--     que uma recomendação é criada ou desfeita.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 5) Confirmação de transação (dupla confirmação)
--    Chamada pelas Server Actions da aplicação via RPC:
--      select public.confirm_transaction('<transaction_id>');
--    Usa auth.uid() para saber quem está confirmando.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 6) Aprovar/rejeitar denúncia (admin) — via RPC para manter regra central
-- ---------------------------------------------------------------------
create or replace function public.admin_review_report(
  p_report_id uuid,
  p_approve boolean,
  p_notes text default null,
  p_ban_user boolean default false
)
returns public.reports
language plpgsql
security definer set search_path = public
as $$
declare
  v_report public.reports;
  v_uid    uuid := auth.uid();
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = v_uid;
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem revisar denúncias.';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if v_report is null then
    raise exception 'Denúncia não encontrada.';
  end if;

  update public.reports
     set status = case when p_approve then 'approved' else 'rejected' end::report_status,
         reviewed_by = v_uid,
         reviewed_at = now(),
         admin_notes = p_notes
   where id = p_report_id
   returning * into v_report;

  insert into public.admin_actions (admin_id, action_type, target_user_id, report_id, notes)
  values (v_uid, case when p_approve then 'report_approved' else 'report_rejected' end,
          v_report.reported_id, v_report.id, p_notes);

  if p_approve then
    perform public.refresh_profile_stats(v_report.reported_id);
  end if;

  if p_approve and p_ban_user then
    update public.profiles
       set is_banned = true,
           banned_reason = coalesce(p_notes, 'Denúncia aprovada'),
           banned_at = now(),
           banned_by = v_uid,
           trust_score = 0
     where id = v_report.reported_id;

    insert into public.admin_actions (admin_id, action_type, target_user_id, report_id, notes)
    values (v_uid, 'user_banned', v_report.reported_id, v_report.id, p_notes);
  end if;

  return v_report;
end;
$$;

-- ---------------------------------------------------------------------
-- 7) Banir/desbanir usuário diretamente (admin)
-- ---------------------------------------------------------------------
create or replace function public.admin_set_ban(p_user_id uuid, p_banned boolean, p_reason text default null)
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
    raise exception 'Apenas administradores podem banir usuários.';
  end if;

  update public.profiles
     set is_banned = p_banned,
         banned_reason = case when p_banned then p_reason else null end,
         banned_at = case when p_banned then now() else null end,
         banned_by = case when p_banned then v_uid else null end,
         trust_score = case when p_banned then 0 else public.calculate_trust_score(p_user_id) end
   where id = p_user_id
   returning * into v_profile;

  insert into public.admin_actions (admin_id, action_type, target_user_id, notes)
  values (v_uid, case when p_banned then 'user_banned' else 'user_unbanned' end, p_user_id, p_reason);

  return v_profile;
end;
$$;
