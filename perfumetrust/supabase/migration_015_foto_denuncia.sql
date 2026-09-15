-- =====================================================================
-- Cheiro Novo — Migração 015: foto anexada na denúncia
-- =====================================================================
-- Até agora, uma denúncia só tinha motivo + texto — decidir se é
-- procedente dependia só da palavra de quem denunciou. Esta migração
-- deixa anexar uma foto (print de conversa, foto do produto errado
-- etc.) na hora de denunciar, em /perfil/[id] (ReportForm.tsx).
--
-- O arquivo fica no bucket privado "report-evidence" — MESMO padrão do
-- "verification-docs" (migration_007): só quem denunciou e os admins
-- conseguem ver (o denunciado NUNCA vê, nem quem denunciou nem o anexo —
-- mesma regra de privacidade que já existia pra "reports").
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 014.
-- =====================================================================

alter table public.reports
  add column if not exists photo_path text;

comment on column public.reports.photo_path is
  'Caminho no bucket privado "report-evidence" (não é URL pública) — '
  'foto opcional anexada como prova ao registrar a denúncia.';

insert into storage.buckets (id, name, public)
values ('report-evidence', 'report-evidence', false)
on conflict (id) do nothing;

drop policy if exists "report_evidence_insert_own_folder" on storage.objects;
create policy "report_evidence_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'report-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "report_evidence_update_own_folder" on storage.objects;
create policy "report_evidence_update_own_folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'report-evidence' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'report-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "report_evidence_delete_own_folder" on storage.objects;
create policy "report_evidence_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'report-evidence' and (storage.foldername(name))[1] = auth.uid()::text);

-- Leitura: só quem enviou (o denunciante) ou um admin — igual à regra da
-- própria tabela "reports" (o denunciado nunca vê nada disso).
drop policy if exists "report_evidence_select_own_or_admin" on storage.objects;
create policy "report_evidence_select_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'report-evidence'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );
