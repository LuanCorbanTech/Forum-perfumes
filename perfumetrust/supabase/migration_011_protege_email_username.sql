-- =====================================================================
-- Cheiro Novo — Migração 011: protege "email" e "username" contra edição
-- direta pelo próprio usuário comum
-- =====================================================================
-- Achado numa revisão de segurança: a policy "profiles_update_own"
-- (rls_policies.sql) deixa qualquer pessoa atualizar QUALQUER coluna da
-- própria linha em "profiles" — quem impede mexer em coisas sensíveis
-- (nota, score, is_admin, banimento etc.) é a função
-- protect_profile_columns() (definida em rls_policies.sql, usada pelo
-- gatilho protect_profile_columns_trg). Essa função nunca foi
-- atualizada depois que os campos "email" e "username" passaram a existir
-- (migration_009) e a importar de verdade pro login — então hoje, mesmo
-- sem nenhum botão na tela pra isso, dá pra chamar a API do Supabase
-- direto (fora do site) e:
--   - trocar o próprio "username" pra qualquer coisa (sem seguir o
--     formato validado só no navegador em LoginForm.tsx);
--   - trocar o próprio "email" pra qualquer valor, inclusive o e-mail de
--     OUTRA pessoa — o que não rouba a conta de ninguém (a senha real
--     continua sendo a de auth.users, intocada), mas desalinha o próprio
--     login por usuário e pode fazer o e-mail de aprovação/recusa de
--     cadastro (Edge Function notify-signup-review) ser mandado pro
--     endereço errado.
--
-- Esta migração fecha essa brecha: "email" e "username" passam a só
-- poder ser alterados pelo gatilho handle_new_user (cadastro) ou por um
-- admin/service-role (ex.: a tela /admin/administradores) — igual já
-- acontecia com is_admin, approval_status etc.
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 010.
-- =====================================================================

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if coalesce(v_is_admin, false) then
    return new;
  end if;

  new.trust_score               := old.trust_score;
  new.average_rating            := old.average_rating;
  new.reviews_count              := old.reviews_count;
  new.completed_sales_count     := old.completed_sales_count;
  new.completed_purchases_count := old.completed_purchases_count;
  new.recommendations_count     := old.recommendations_count;
  new.approval_status           := old.approval_status;
  new.is_admin                  := old.is_admin;
  new.is_banned                 := old.is_banned;
  new.banned_reason             := old.banned_reason;
  new.banned_at                 := old.banned_at;
  new.banned_by                 := old.banned_by;
  new.email                     := old.email;    -- NOVO (migration_011)
  new.username                  := old.username;  -- NOVO (migration_011)
  new.updated_at                := now();

  return new;
end;
$$;

-- O gatilho em si (protect_profile_columns_trg, criado em rls_policies.sql)
-- já existe e continua apontando pra essa função — não precisa recriar.
--
-- Atenção: se um dia você rodar rls_policies.sql de novo sozinho (sem
-- rodar esta migração 011 logo depois), essa proteção volta a desaparecer
-- — porque rls_policies.sql também recria a mesma função, na versão
-- antiga (sem proteger email/username). Rodando o RODAR_TUDO_NA_ORDEM.sql
-- inteiro com esta migração incluída no final, sem problema nenhum.
