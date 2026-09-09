-- =====================================================================
-- Cheiro Novo — Migração 010: documento digital (ex.: CNH Digital em PDF)
-- na verificação de identidade
-- =====================================================================
-- Até aqui, /conta/verificacao sempre exigia 3 fotos separadas: documento
-- (frente), documento (verso) e selfie. Isso não faz sentido pra quem usa
-- a CNH Digital ou o RG Digital (apps do governo/gov.br) ou outro
-- documento que já vem como um PDF/imagem único com tudo dentro — não tem
-- "frente e verso" pra separar.
--
-- Esta migração adiciona um campo "document_type" em profile_kyc:
--   'fisico' (padrão, comportamento de antes) -> exige frente + verso + selfie
--   'digital'                                  -> exige só um documento (guardado
--                                                  no mesmo campo "document_front_path")
--                                                  + selfie, sem verso
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 009.
-- =====================================================================

-- 1) Novo campo, com valor padrão que preserva o comportamento de quem já
--    tinha enviado documento antes desta migração existir.
alter table public.profile_kyc
  add column if not exists document_type text not null default 'fisico';

alter table public.profile_kyc
  drop constraint if exists profile_kyc_document_type_check;

alter table public.profile_kyc
  add constraint profile_kyc_document_type_check check (document_type in ('fisico', 'digital'));

comment on column public.profile_kyc.document_type is
  'fisico = documento em duas fotos (frente/verso); digital = documento único (ex.: CNH Digital em PDF), guardado em document_front_path, sem verso (migration_010).';

-- 2) admin_review_signup (migration_007) atualizada: só exige "verso"
--    quando o tipo de documento é "fisico". Continua sem aprovar nada que
--    esteja faltando peça obrigatória, do jeito que já era antes.
create or replace function public.admin_review_signup(p_user_id uuid, p_approve boolean, p_notes text default null)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_profile public.profiles;
  v_kyc public.profile_kyc;
  v_missing boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = v_uid;
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem revisar cadastros.';
  end if;

  if p_approve then
    select * into v_kyc from public.profile_kyc where profile_id = p_user_id;

    v_missing := v_kyc is null
      or v_kyc.document_front_path is null
      or v_kyc.selfie_path is null
      or (v_kyc.document_type = 'fisico' and v_kyc.document_back_path is null);

    if v_missing then
      raise exception 'Este cadastro ainda não enviou o(s) documento(s) e a selfie — não é possível aprovar sem isso.';
    end if;
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
