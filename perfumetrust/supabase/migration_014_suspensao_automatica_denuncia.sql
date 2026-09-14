-- =====================================================================
-- Cheiro Novo — Migração 014: suspensão automática por denúncia
-- =====================================================================
-- Enquanto a moderação não decide se uma denúncia é procedente, o perfil
-- denunciado fica automaticamente suspenso (mesma trava usada pra
-- banimento manual: profiles.is_banned) — ninguém enxerga esse perfil
-- como "ativo" enquanto a denúncia está pendente. A nova coluna
-- "auto_suspended" só serve pra distinguir essa suspensão automática e
-- temporária de um banimento manual de verdade (feito pelo admin em
-- "Banir usuário", ou por uma denúncia julgada procedente com a
-- caixinha "Banir usuário denunciado" marcada): só a suspensão
-- automática é levantada sozinha quando a denúncia é decidida — um
-- banimento manual continua exigindo "Desbanir" na tela /admin/usuarios.
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 013.
-- =====================================================================

alter table public.profiles
  add column if not exists auto_suspended boolean not null default false;

comment on column public.profiles.auto_suspended is
  'true = o is_banned atual veio de uma suspensão automática por denúncia '
  'pendente (migration_014), não de um banimento manual do admin. Some '
  'sozinho quando a denúncia é decidida (se não houver outra pendente).';

-- ---------------------------------------------------------------------
-- 1) Suspende automaticamente o perfil denunciado assim que a denúncia
--    é registrada — não sobrescreve um banimento manual já existente
--    (a condição "and not is_banned" evita isso).
-- ---------------------------------------------------------------------
create or replace function public.trg_reports_auto_suspend()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
     set is_banned = true,
         auto_suspended = true,
         banned_reason = coalesce(banned_reason, 'Denúncia recebida — perfil suspenso até a moderação analisar.'),
         banned_at = coalesce(banned_at, now())
   where id = new.reported_id
     and not is_banned;

  return new;
end;
$$;

drop trigger if exists reports_after_insert_auto_suspend on public.reports;
create trigger reports_after_insert_auto_suspend
  after insert on public.reports
  for each row execute function public.trg_reports_auto_suspend();

-- ---------------------------------------------------------------------
-- 2) admin_review_report: ao decidir a denúncia, se a suspensão do
--    perfil era só a automática (não um banimento manual de verdade),
--    a decisão do moderador passa a valer:
--      - Aprovar (procedente) + marcar "Banir usuário denunciado":
--        vira banimento manual de verdade (só sai com "Desbanir").
--      - Aprovar sem marcar essa caixinha, ou Rejeitar (improcedente):
--        a suspensão automática é levantada — a não ser que exista
--        OUTRA denúncia ainda pendente/em análise contra a mesma
--        pessoa, caso em que ela continua suspensa até essa também
--        ser decidida.
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
  v_was_auto_suspended boolean;
  v_other_pending_count int;
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

  select auto_suspended into v_was_auto_suspended from public.profiles where id = v_report.reported_id;

  if p_approve and p_ban_user then
    -- Denúncia procedente e admin optou por banir: vira banimento
    -- permanente de verdade (não é mais suspensão automática).
    update public.profiles
       set is_banned = true,
           auto_suspended = false,
           banned_reason = coalesce(p_notes, 'Denúncia aprovada'),
           banned_at = now(),
           banned_by = v_uid,
           trust_score = 0
     where id = v_report.reported_id;

    insert into public.admin_actions (admin_id, action_type, target_user_id, report_id, notes)
    values (v_uid, 'user_banned', v_report.reported_id, v_report.id, p_notes);

  elsif coalesce(v_was_auto_suspended, false) then
    -- A suspensão atual não é um banimento manual — verifica se ainda
    -- existe outra denúncia pendente contra a mesma pessoa antes de
    -- normalizar o perfil.
    select count(*) into v_other_pending_count
      from public.reports
     where reported_id = v_report.reported_id
       and id <> v_report.id
       and status in ('pending', 'under_review');

    if v_other_pending_count = 0 then
      update public.profiles
         set is_banned = false,
             auto_suspended = false,
             banned_reason = null,
             banned_at = null,
             banned_by = null,
             trust_score = public.calculate_trust_score(v_report.reported_id)
       where id = v_report.reported_id;
    end if;
  end if;

  return v_report;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) admin_set_ban: um banimento (ou desbanimento) feito direto pelo
--    admin em /admin/usuarios é sempre "de verdade" — nunca fica
--    marcado como suspensão automática, então a decisão de uma denúncia
--    futura contra a mesma pessoa não mexe nele sozinha.
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
         auto_suspended = false,
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
