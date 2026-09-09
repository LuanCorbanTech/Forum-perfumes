-- =====================================================================
-- Cheiro Novo — Migração 012: cadastro unificado (dados + documento +
-- selfie numa tela só) e "Clientes reprovados"
-- =====================================================================
-- Contexto: o cadastro passa a pedir documento e selfie já na primeira
-- tela (sem confirmação por e-mail — a conta nasce sem poder logar até
-- um admin aprovar). Quando um admin RECUSA um cadastro, a conta ativa
-- (auth.users + profiles + profile_kyc) é apagada de verdade, pra liberar
-- o CPF/telefone/e-mail/usuário pra um novo cadastro — mas antes disso os
-- dados e documentos enviados são copiados pra esta tabela nova, só pra
-- consulta do admin (nunca mais editável, nunca aprova nada daqui).
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 011.
-- =====================================================================

-- 1) Tabela de arquivo — snapshot do que a pessoa enviou antes de ser
--    recusada. Sem referência (FK) pro profile original: ele já não vai
--    mais existir depois da recusa.
create table if not exists public.rejected_signups (
  id                    uuid primary key default gen_random_uuid(),
  original_profile_id   uuid,
  full_name             text,
  phone                 text,
  email                 text,
  username              text,
  cpf                   text,
  document_type         text,
  document_front_path   text,
  document_back_path    text,
  selfie_path           text,
  notes                 text,
  rejected_by           uuid references public.profiles(id) on delete set null,
  rejected_at           timestamptz not null default now()
);

comment on table public.rejected_signups is
  'Arquivo somente-leitura de cadastros recusados (migration_012) — a conta ativa correspondente já foi apagada, então o CPF/telefone/e-mail/username dela estão livres de novo pra um cadastro novo.';

alter table public.rejected_signups enable row level security;

drop policy if exists "rejected_signups_admin_select" on public.rejected_signups;
create policy "rejected_signups_admin_select"
  on public.rejected_signups for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Sem policy de insert/update/delete pra anon/authenticated: essa tabela só
-- é escrita pelo server (service role, via server action), nunca pelo
-- navegador de ninguém, nem admin.

-- 2) admin_actions.target_user_id hoje é uma FK "seca" (sem ON DELETE),
--    então apagar um profile que já teve alguma ação registrada (ex.: uma
--    recusa antiga, de antes desta migração) travaria a exclusão com erro
--    de chave estrangeira. Troca pra ON DELETE SET NULL: o histórico da
--    ação continua existindo, só perde o link pro usuário (que não existe
--    mais).
alter table public.admin_actions
  drop constraint if exists admin_actions_target_user_id_fkey;

alter table public.admin_actions
  add constraint admin_actions_target_user_id_fkey
  foreign key (target_user_id) references public.profiles(id) on delete set null;
