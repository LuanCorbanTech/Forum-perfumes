-- =====================================================================
-- Cheiro Novo — Migração 007: verificação de identidade por moderação
-- manual (documento frente/verso + selfie), em vez de um serviço
-- automático (ex.: ZapSign) de reconhecimento facial.
-- =====================================================================
-- Como funciona: depois de completar o cadastro (código confirmado), a
-- pessoa é levada para /conta/verificacao, onde envia 3 fotos: documento
-- (frente), documento (verso) e uma selfie. Um admin vê essas fotos em
-- /admin/cadastros e aprova ou rejeita o cadastro manualmente — é
-- exatamente a mesma decisão que "admin_review_signup" (migration_003)
-- já tomava, só que agora com evidência de verdade em vez de decidir às
-- cegas. Por isso este arquivo NÃO cria um status novo: continua usando
-- profiles.approval_status (pending/approved/rejected) que já existia.
--
-- IMPORTANTE — por que as fotos NÃO ficam num bucket público (ao
-- contrário de "avatars" e "review-photos"): documento de identidade é
-- dado ainda mais sensível que CPF. O bucket "verification-docs" é
-- privado; só o próprio dono do cadastro e admins conseguem gerar uma
-- URL assinada para ver o arquivo (via supabase.storage...createSignedUrl,
-- que já respeita a policy de SELECT abaixo).
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 006.
-- =====================================================================

-- 1) Novas colunas em profile_kyc (criada na migration_006) para guardar
--    o CAMINHO (não a URL pública — o bucket é privado) de cada foto.
alter table public.profile_kyc
  add column if not exists document_front_path text,
  add column if not exists document_back_path  text,
  add column if not exists selfie_path          text,
  add column if not exists submitted_at          timestamptz;

comment on column public.profile_kyc.document_front_path is
  'Caminho no bucket privado "verification-docs" (não é URL pública).';

-- 2) Bucket privado para os documentos e a selfie.
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

-- Upload/troca/remoção: só o próprio dono, na própria pasta "<uid>/...".
drop policy if exists "verification_docs_insert_own_folder" on storage.objects;
create policy "verification_docs_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verification_docs_update_own_folder" on storage.objects;
create policy "verification_docs_update_own_folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "verification_docs_delete_own_folder" on storage.objects;
create policy "verification_docs_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura: só o próprio dono OU um admin (diferente de avatars/review-photos,
-- que são públicos — aqui NADA de "to public").
drop policy if exists "verification_docs_select_own_or_admin" on storage.objects;
create policy "verification_docs_select_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );

-- 3) A pessoa dona do cadastro precisa conseguir ver o motivo de uma
--    recusa em /conta/verificacao. A policy que já existia
--    ("admin_actions_select_admin", em rls_policies.sql) só deixa admins
--    lerem a tabela — sem esta policy extra, a consulta de
--    /conta/verificacao simplesmente não retorna nada para o usuário comum.
drop policy if exists "admin_actions_select_own_target" on public.admin_actions;
create policy "admin_actions_select_own_target"
  on public.admin_actions for select
  to authenticated
  using (target_user_id = auth.uid());

-- 4) Reforça a regra no próprio banco: nenhum admin consegue aprovar um
--    cadastro sem as 3 fotos terem sido enviadas antes — é isso que torna
--    a verificação "obrigatória" de verdade, e não só uma sugestão da tela.
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
begin
  select is_admin into v_is_admin from public.profiles where id = v_uid;
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem revisar cadastros.';
  end if;

  if p_approve then
    select * into v_kyc from public.profile_kyc where profile_id = p_user_id;
    if v_kyc is null
       or v_kyc.document_front_path is null
       or v_kyc.document_back_path is null
       or v_kyc.selfie_path is null then
      raise exception 'Este cadastro ainda não enviou documento (frente/verso) e selfie — não é possível aprovar sem essas fotos.';
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
