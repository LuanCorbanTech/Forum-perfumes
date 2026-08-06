-- =====================================================================
-- Cheiro Novo — Migração 006: CPF, e-mail de contato e "já participa
-- do grupo de WhatsApp"
-- =====================================================================
-- Adiciona campos ao cadastro: CPF, e-mail de contato (para quem se
-- cadastra por telefone, que antes não tinha e-mail nenhum salvo) e se
-- a pessoa já participa do grupo de WhatsApp de desapego.
--
-- IMPORTANTE — por que isso NÃO entra na tabela "profiles": a policy
-- "profiles_select_public" (rls_policies.sql) permite que QUALQUER
-- visitante, mesmo sem login, leia todas as colunas de "profiles" — é
-- assim que a busca pública de reputação funciona. CPF é dado sensível
-- (protegido pela LGPD) e não pode ficar exposto dessa forma. Por isso
-- ele mora numa tabela nova e separada, "profile_kyc", com leitura
-- restrita ao próprio dono do cadastro e a administradores.
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois das migrações 001–005.
-- =====================================================================

-- 1) Tabela separada e protegida para os dados sensíveis do cadastro.
create table if not exists public.profile_kyc (
  profile_id         uuid primary key references public.profiles(id) on delete cascade,
  cpf                text,
  in_whatsapp_group  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.profile_kyc is
  'Dados sensíveis de cadastro (CPF, participação no grupo de WhatsApp). '
  'Separado de "profiles" de propósito: "profiles" é de leitura pública, '
  'esta tabela não é.';

-- Formato básico: 11 dígitos (com ou sem pontuação, guardamos só dígitos).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profile_kyc_cpf_format_check'
  ) then
    alter table public.profile_kyc
      add constraint profile_kyc_cpf_format_check
      check (cpf is null or cpf ~ '^[0-9]{11}$');
  end if;
end
$$;

create unique index if not exists idx_profile_kyc_cpf_unique
  on public.profile_kyc (cpf)
  where cpf is not null;

alter table public.profile_kyc enable row level security;

-- Leitura: só o próprio dono do cadastro, ou um admin (ex.: futura tela
-- de verificação de cadastro). NADA de "anon" aqui, ao contrário de
-- "profiles" — é essa a diferença que protege o CPF.
drop policy if exists "profile_kyc_select_own_or_admin" on public.profile_kyc;
create policy "profile_kyc_select_own_or_admin"
  on public.profile_kyc for select
  to authenticated
  using (
    auth.uid() = profile_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Escrita direta: fallback defensivo (o insert de verdade acontece via
-- trigger "handle_new_user", que é security definer).
drop policy if exists "profile_kyc_insert_own" on public.profile_kyc;
create policy "profile_kyc_insert_own"
  on public.profile_kyc for insert
  to authenticated
  with check (auth.uid() = profile_id);

drop policy if exists "profile_kyc_update_own" on public.profile_kyc;
create policy "profile_kyc_update_own"
  on public.profile_kyc for update
  to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- 2) Atualiza o trigger de criação automática de profile para também
--    gravar CPF e participação no grupo, vindos de options.data no
--    signInWithOtp (mesma mecânica que já existe para full_name), e
--    para gravar o e-mail de contato mesmo em cadastros feitos por
--    telefone (nesse caso "new.email" vem nulo do auth.users — o
--    e-mail de contato digitado no formulário chega só em
--    raw_user_meta_data->>'email').
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_cpf_digits text;
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, new.phone, 'Usuário'), '@', 1)),
    new.phone,
    coalesce(new.email, new.raw_user_meta_data->>'email')
  )
  on conflict (id) do nothing;

  v_cpf_digits := regexp_replace(coalesce(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g');

  if v_cpf_digits <> '' then
    insert into public.profile_kyc (profile_id, cpf, in_whatsapp_group)
    values (
      new.id,
      v_cpf_digits,
      coalesce((new.raw_user_meta_data->>'in_whatsapp_group')::boolean, false)
    )
    on conflict (profile_id) do update
      set cpf = excluded.cpf,
          in_whatsapp_group = excluded.in_whatsapp_group,
          updated_at = now();
  end if;

  return new;
end;
$$;
