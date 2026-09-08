-- =====================================================================
-- Cheiro Novo — Migração 008: aba "APIs" em Configurações, no admin
-- =====================================================================
-- Guarda credenciais de integrações (por enquanto só a chave da Brevo,
-- usada pra mandar o e-mail de aprovação/recusa de cadastro — ver
-- migration_007 e supabase/functions/notify-signup-review) numa tabela
-- que só admin enxerga, editável pela nova tela /admin/configuracoes.
--
-- Antes disso, a chave da Brevo só podia ser configurada via
-- `supabase secrets set` (linha de comando). A partir de agora ela fica
-- guardada aqui, e a Edge Function passa a ler o valor mais recente
-- direto do banco — ou seja, trocar a chave pela tela do site já vale
-- na hora, sem precisar reimplantar (redeploy) nada.
--
-- Segurança: esta tabela é OFF LIMITS pra "anon" e pra qualquer usuário
-- comum autenticado — só quem tem profiles.is_admin = true consegue ler
-- ou escrever aqui (nem select nem insert/update ficam liberados pra
-- mais ninguém, ao contrário de "profiles", que é público por design).
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 007.
-- =====================================================================

create table if not exists public.admin_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.admin_settings enable row level security;

drop policy if exists "admin_settings_select_admin" on public.admin_settings;
create policy "admin_settings_select_admin"
  on public.admin_settings for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "admin_settings_insert_admin" on public.admin_settings;
create policy "admin_settings_insert_admin"
  on public.admin_settings for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "admin_settings_update_admin" on public.admin_settings;
create policy "admin_settings_update_admin"
  on public.admin_settings for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Sem policy de delete: pra "apagar" uma chave, a própria tela salva o
-- campo vazio por cima, não precisa remover a linha da tabela.
