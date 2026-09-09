-- =====================================================================
-- Cheiro Novo — Migração 009: login por e-mail/usuário + senha
-- =====================================================================
-- Substitui o login por código (OTP) por e-mail/usuário + senha.
-- O Supabase Auth continua baseado em e-mail por baixo dos panos — quem
-- digitar um "nome de usuário" (sem @) tem o e-mail correspondente
-- resolvido pela função abaixo antes de tentar a senha.
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez.
-- =====================================================================

-- 1) Novo campo "username" no perfil — único (sem diferenciar
--    maiúsculas/minúsculas), mas continua opcional pra não quebrar quem
--    já tem conta (o índice único ignora linhas com username nulo).
alter table public.profiles
  add column if not exists username text;

create unique index if not exists idx_profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

comment on column public.profiles.username is
  'Nome de usuário opcional, usado como alternativa ao e-mail no login (migration_009).';

-- 2) Resolve e-mail a partir de "login" (e-mail OU nome de usuário),
--    usado pela tela de login antes de chamar signInWithPassword.
--    security definer: precisa enxergar a coluna email mesmo com RLS
--    ativo, mas só devolve o e-mail (não a linha inteira), then
--    controlando bem o que é exposto.
create or replace function public.resolve_login_email(p_login text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if p_login is null or length(trim(p_login)) = 0 then
    return null;
  end if;

  if position('@' in p_login) > 0 then
    return lower(trim(p_login));
  end if;

  select email into v_email
  from public.profiles
  where lower(username) = lower(trim(p_login))
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- 3) handle_new_user atualizada: mesma lógica da migration_006 (perfil +
--    profile_kyc a partir dos metadados do cadastro), agora também
--    gravando o "username" enviado no cadastro (se houver).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_cpf_digits text;
begin
  insert into public.profiles (id, full_name, phone, email, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, new.phone, 'Usuário'), '@', 1)),
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    coalesce(new.email, new.raw_user_meta_data->>'email'),
    nullif(trim(new.raw_user_meta_data->>'username'), '')
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
