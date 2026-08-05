-- =====================================================================
-- PerfumeTrust — Schema do banco de dados (Supabase / PostgreSQL)
-- =====================================================================
-- Ordem de execução recomendada no SQL Editor do Supabase:
--   1) schema.sql          (este arquivo)
--   2) functions_triggers.sql
--   3) rls_policies.sql
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_status') then
    create type transaction_status as enum (
      'pending',          -- criada, aguardando confirmação de ambos
      'buyer_confirmed',  -- só o comprador confirmou
      'seller_confirmed', -- só o vendedor confirmou
      'completed',        -- ambos confirmaram -> libera avaliação
      'cancelled',         -- cancelada por uma das partes
      'disputed'          -- em disputa (aberta por denúncia vinculada)
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('pending', 'under_review', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_reason') then
    create type report_reason as enum (
      'golpe',
      'produto_nao_enviado',
      'produto_falsificado',
      'produto_diferente_anunciado',
      'nao_pagamento',
      'assedio_ou_abuso',
      'outro'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- PROFILES — estende auth.users (1:1)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  full_name              text not null,
  phone                  text unique,               -- formato E.164, ex: +5511999998888
  email                  text unique,
  avatar_url             text,
  bio                    text,
  city                   text,
  state                  text,
  brands                 text[] not null default '{}',  -- marcas que costuma vender (filtro no feed)
  item_types             text[] not null default '{}',  -- tipos de item que costuma vender (frasco cheio, decant, parcial/tester)

  -- métricas de reputação (desnormalizadas para leitura rápida do perfil público)
  average_rating           numeric(3,2) not null default 0,   -- 0.00 a 5.00
  reviews_count            integer      not null default 0,
  completed_sales_count    integer      not null default 0,   -- vendas concluídas (como vendedor)
  completed_purchases_count integer     not null default 0,   -- compras concluídas (como comprador)
  recommendations_count    integer      not null default 0,   -- "recomendo esse vendedor", separado da nota
  trust_score              integer      not null default 50 check (trust_score between 0 and 100),

  -- moderação
  is_admin               boolean not null default false,
  is_banned              boolean not null default false,
  banned_reason          text,
  banned_at              timestamptz,
  banned_by              uuid references public.profiles(id),

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint phone_or_email_required check (phone is not null or email is not null)
);

comment on table public.profiles is 'Perfil público de compradores/vendedores do PerfumeTrust.';

create index if not exists idx_profiles_phone on public.profiles using btree (phone);
create index if not exists idx_profiles_full_name_trgm on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists idx_profiles_brands on public.profiles using gin (brands);
create index if not exists idx_profiles_item_types on public.profiles using gin (item_types);

-- ---------------------------------------------------------------------
-- TRANSACTIONS — negociação entre comprador e vendedor
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id                    uuid primary key default gen_random_uuid(),
  seller_id             uuid not null references public.profiles(id),
  buyer_id              uuid not null references public.profiles(id),

  item_description      text not null,
  price                 numeric(10,2) not null check (price >= 0),

  status                transaction_status not null default 'pending',

  buyer_confirmed_at    timestamptz,
  seller_confirmed_at   timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint different_parties check (seller_id <> buyer_id)
);

comment on table public.transactions is 'Registro de negociação; avaliação só é liberada após dupla confirmação (status = completed).';

create index if not exists idx_transactions_seller on public.transactions (seller_id);
create index if not exists idx_transactions_buyer on public.transactions (buyer_id);
create index if not exists idx_transactions_status on public.transactions (status);

-- ---------------------------------------------------------------------
-- REVIEWS — avaliação (1 a 5 estrelas) por transação/direção
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.transactions(id) on delete cascade,
  reviewer_id     uuid not null references public.profiles(id),
  reviewed_id     uuid not null references public.profiles(id),

  rating          smallint not null check (rating between 1 and 5),
  comment         text,
  photo_url       text,  -- foto opcional do perfume recebido, anexada pelo avaliador

  created_at      timestamptz not null default now(),

  constraint reviewer_not_reviewed check (reviewer_id <> reviewed_id),
  constraint one_review_per_direction unique (transaction_id, reviewer_id)
);

comment on table public.reviews is 'Avaliação só pode ser inserida se a transação estiver com status = completed (ver trigger + RLS).';

create index if not exists idx_reviews_reviewed on public.reviews (reviewed_id);
create index if not exists idx_reviews_transaction on public.reviews (transaction_id);

-- ---------------------------------------------------------------------
-- REPORTS — denúncias entre usuários
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles(id),
  reported_id     uuid not null references public.profiles(id),
  transaction_id  uuid references public.transactions(id),

  reason          report_reason not null,
  description     text not null,

  status          report_status not null default 'pending',
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  admin_notes     text,

  created_at      timestamptz not null default now(),

  constraint reporter_not_reported check (reporter_id <> reported_id)
);

comment on table public.reports is 'Denúncias enviadas por usuários; aprovadas/rejeitadas pelo painel administrativo.';

create index if not exists idx_reports_reported on public.reports (reported_id);
create index if not exists idx_reports_status on public.reports (status);

-- ---------------------------------------------------------------------
-- RECOMMENDATIONS — "recomendo este vendedor", separado da nota/estrelas.
-- Qualquer usuário pode recomendar outro (sem precisar de transação
-- concluída), uma vez por par de usuários — é um sinal social simples,
-- tipo "endorsement", não substitui a avaliação com nota.
-- ---------------------------------------------------------------------
create table if not exists public.recommendations (
  id              uuid primary key default gen_random_uuid(),
  recommender_id  uuid not null references public.profiles(id),
  recommended_id  uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),

  constraint recommender_not_recommended check (recommender_id <> recommended_id),
  constraint one_recommendation_per_pair unique (recommender_id, recommended_id)
);

comment on table public.recommendations is 'Recomendação simples (sem nota/comentário) de um usuário para outro; contador exibido no perfil público.';

create index if not exists idx_recommendations_recommended on public.recommendations (recommended_id);

-- ---------------------------------------------------------------------
-- ADMIN_ACTIONS — trilha de auditoria das ações administrativas
-- ---------------------------------------------------------------------
create table if not exists public.admin_actions (
  id              uuid primary key default gen_random_uuid(),
  admin_id        uuid not null references public.profiles(id),
  action_type     text not null check (action_type in (
                    'report_approved', 'report_rejected', 'user_banned', 'user_unbanned'
                  )),
  target_user_id  uuid references public.profiles(id),
  report_id       uuid references public.reports(id),
  notes           text,
  created_at      timestamptz not null default now()
);

comment on table public.admin_actions is 'Log de auditoria de tudo que um admin faz no painel.';

-- ---------------------------------------------------------------------
-- STORAGE — bucket público para as fotos anexadas nas avaliações
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;
