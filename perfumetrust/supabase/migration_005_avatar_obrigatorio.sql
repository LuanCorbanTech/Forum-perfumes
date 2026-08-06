-- =====================================================================
-- Migration 005 — Foto de perfil obrigatória
-- Execute no SQL Editor do Supabase (Project > SQL Editor > New query).
-- Idempotente: pode rodar mais de uma vez sem erro.
--
-- O que isso faz:
--  1. Cria o bucket de Storage "avatars" (público pra leitura, upload
--     restrito à própria pasta do usuário) — mesmo padrão já usado pelo
--     bucket "review-photos".
--  2. Cria as policies de RLS do Storage para esse bucket (insert/update/
--     delete restritos à pasta "<uid>/...", select público).
--
-- Observação: a coluna profiles.avatar_url já existe desde o schema
-- original — não precisa de alter table aqui. A obrigatoriedade da foto
-- é aplicada no app (formulário de edição de perfil não deixa salvar sem
-- uma foto definida), e não como "not null" no banco, porque perfis já
-- existentes ainda não têm foto e não podem ficar travados/quebrados por
-- uma migração — eles simplesmente serão solicitados a enviar uma foto
-- na próxima vez que editarem o perfil.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
