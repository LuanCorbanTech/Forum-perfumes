# Cheiro Novo

MVP de uma plataforma de reputação para grupos brasileiros de desapego de
perfumes usados. Permite que compradores verifiquem a reputação de um
vendedor (nota média, vendas concluídas, score de confiabilidade e
histórico de avaliações) antes de negociar, com registro de transações,
dupla confirmação, avaliações e um sistema de denúncias moderado por um
painel administrativo.

**Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase
(PostgreSQL, Auth, RLS) + Vercel.

---

## 1. Estrutura do banco de dados

| Tabela           | Descrição                                                                 |
|------------------|----------------------------------------------------------------------------|
| `profiles`       | Perfil público (1:1 com `auth.users`): nome, telefone, e-mail, nota média, vendas concluídas, score de confiabilidade, flags de admin/banimento. |
| `transactions`   | Negociação entre `buyer_id` e `seller_id`, com `status` controlado por confirmação dupla (`pending` → `buyer_confirmed`/`seller_confirmed` → `completed`). |
| `reviews`        | Avaliação (1–5 estrelas) de uma parte sobre a outra, **só pode existir se a transação estiver `completed`**. |
| `reports`        | Denúncias de um usuário contra outro, com `status` (`pending`/`approved`/`rejected`) revisado no painel admin. |
| `admin_actions`  | Log de auditoria de toda ação administrativa (aprovação de denúncia, banimento). |

Diagrama simplificado de relacionamento:

```
auth.users 1───1 profiles
profiles 1───N transactions (como seller_id)
profiles 1───N transactions (como buyer_id)
transactions 1───N reviews
profiles 1───N reviews (como reviewed_id)
profiles 1───N reports (como reporter_id / reported_id)
profiles 1───N admin_actions (como admin_id)
```

### Score de confiabilidade (0–100)

Calculado pela função `public.calculate_trust_score()` (ver
`supabase/functions_triggers.sql`):

- até **50 pts** — proporcional à nota média (`nota/5 * 50`)
- até **30 pts** — 1 ponto por venda concluída (máx. 30 vendas)
- até **10 pts** — antiguidade da conta (1 pt a cada 30 dias, máx. 10)
- **+10 pts** — base inicial de confiança
- **−15 pts por denúncia aprovada** contra o usuário (máx. −60)
- Usuário banido → score sempre **0**

O resultado é sempre limitado entre 0 e 100. A fórmula é só uma sugestão de
MVP — ajuste os pesos em `calculate_trust_score()` conforme aprender com
uso real.

---

## 2. SQL para criar as tabelas no Supabase

Os arquivos estão em `supabase/`, e devem ser executados **nesta ordem**
no SQL Editor do seu projeto Supabase (Dashboard → SQL Editor → New query):

1. `supabase/schema.sql` — tabelas, enums, índices
2. `supabase/functions_triggers.sql` — funções de negócio (score, dupla
   confirmação, criação automática de profile, aprovação de denúncia,
   banimento) e triggers
3. `supabase/rls_policies.sql` — políticas de Row Level Security

> Dica: cole o conteúdo de cada arquivo, execute, confira que não houve
> erro, e só então passe para o próximo.

---

## 3. Arquitetura de pastas do projeto

```
perfumetrust/
├── supabase/
│   ├── schema.sql
│   ├── functions_triggers.sql
│   └── rls_policies.sql
├── src/
│   ├── middleware.ts               # protege rotas + refresh de sessão
│   ├── app/
│   │   ├── layout.tsx              # layout raiz (Navbar + footer)
│   │   ├── globals.css
│   │   ├── page.tsx                # Home (destaques + busca)
│   │   ├── busca/page.tsx          # Busca por nome/telefone
│   │   ├── login/page.tsx          # Login/cadastro por OTP (telefone ou e-mail)
│   │   ├── auth/
│   │   │   ├── sair/route.ts       # logout
│   │   │   └── callback/route.ts   # fallback magic link
│   │   ├── perfil/[id]/page.tsx    # Perfil público do vendedor
│   │   ├── transacoes/
│   │   │   ├── nova/page.tsx       # Registrar transação
│   │   │   └── [id]/page.tsx       # Detalhe + confirmação + avaliação
│   │   ├── denuncias/page.tsx      # Minhas denúncias enviadas
│   │   └── admin/
│   │       ├── page.tsx            # Dashboard
│   │       ├── denuncias/page.tsx  # Aprovar/rejeitar denúncias
│   │       └── usuarios/page.tsx   # Buscar/banir usuários
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SellerCard.tsx
│   │   ├── StarRating.tsx
│   │   ├── TrustScoreBadge.tsx
│   │   ├── ReviewList.tsx
│   │   ├── TransactionActions.tsx  # confirmar + avaliar (client)
│   │   ├── ReportForm.tsx          # enviar denúncia (client)
│   │   └── admin/
│   │       ├── ReportReviewActions.tsx
│   │       └── UserBanActions.tsx
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts           # cliente para Client Components
│       │   └── server.ts           # cliente para Server Components/Actions
│       ├── types.ts                # tipos alinhados ao schema.sql
│       └── trustScore.ts           # helpers de apresentação do score
├── package.json
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── .env.example
```

---

## 4–5. Páginas principais e componentes React

Já implementados no código-fonte entregue (ver árvore acima). Resumo do
que cada um faz:

- **`/login`** — fluxo único de login/cadastro via código OTP (SMS para
  telefone, código de 6 dígitos por e-mail). No primeiro acesso, o
  trigger `handle_new_user` cria a linha em `profiles` automaticamente.
- **`/perfil/[id]`** — perfil público: nota média (`StarRating`), vendas
  concluídas, `TrustScoreBadge`, histórico de avaliações (`ReviewList`) e
  botão de denúncia (`ReportForm`).
- **`/transacoes/nova`** — busca o vendedor, informa item e valor, e
  registra a transação (`status = pending`).
- **`/transacoes/[id]`** — mostra os dados da negociação e o componente
  `TransactionActions`, que:
  1. permite cada lado confirmar a transação (RPC `confirm_transaction`);
  2. libera o formulário de avaliação **somente** quando `status = completed`.
- **`/denuncias`** — histórico de denúncias enviadas pelo usuário logado.
- **`/admin`**, **`/admin/denuncias`**, **`/admin/usuarios`** — dashboard,
  fila de denúncias (aprovar/rejeitar, opcionalmente banindo o usuário via
  RPC `admin_review_report`) e gestão de usuários (banir/desbanir via RPC
  `admin_set_ban`). Acesso restrito por `is_admin`, verificado no
  `middleware.ts` e nas próprias funções SQL.

---

## 6. Regras de segurança (RLS)

Resumo das políticas em `supabase/rls_policies.sql` (comentadas em detalhe
no próprio arquivo):

- **`profiles`** — leitura pública (é o propósito do produto: checar
  reputação antes de negociar); cada usuário só edita o próprio perfil, e
  um trigger (`protect_profile_columns`) impede que ele altere campos
  sensíveis (`trust_score`, `is_admin`, `is_banned`, contadores) — só
  admins ou as funções RPC (`security definer`) podem mudá-los.
- **`transactions`** — visível apenas para comprador, vendedor ou admin;
  inserção permitida só se o usuário autenticado for uma das partes; **não
  há UPDATE direto pelo cliente** — a confirmação só acontece via RPC
  `confirm_transaction`, que valida `auth.uid()` e aplica a regra de
  dupla confirmação no banco (não dá para "trapacear" pelo client).
- **`reviews`** — leitura pública (transparência); inserção só é aceita
  se `auth.uid()` participou da transação **e** ela está `completed`
  (checado tanto na policy quanto em um trigger `BEFORE INSERT`, como
  camada dupla de proteção); sem policy de UPDATE/DELETE → avaliações são
  imutáveis.
- **`reports`** — o denunciante vê as próprias denúncias; **o usuário
  denunciado não consegue ver quem o denunciou**; admins veem todas;
  aprovação/rejeição só via RPC `admin_review_report` (auditada em
  `admin_actions`).
- **`admin_actions`** — leitura restrita a admins; escrita só pelas
  funções RPC.

---

## 7. Passo a passo para publicar

### 7.1 Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Anote a senha do banco e aguarde o provisionamento.
3. Vá em **Authentication → Providers**:
   - Habilite **Phone** (para OTP por SMS, configure um provedor como
     Twilio/MessageBird em **Authentication → Providers → Phone**).
   - Habilite **Email** com **"Confirm email" via OTP** (em
     **Authentication → Email Templates**, o template "Magic Link" também
     é usado para o código OTP de 6 dígitos).
4. Em **SQL Editor**, execute nesta ordem: `schema.sql` →
   `functions_triggers.sql` → `rls_policies.sql`.
5. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (uso interno, nunca
     exposta ao client)
6. Torne seu próprio usuário admin depois do primeiro login:
   ```sql
   update public.profiles set is_admin = true where phone = '+55SEUNUMERO';
   -- ou: where email = 'voce@email.com';
   ```

### 7.2 Rodar localmente

```bash
git clone <seu-repositorio>
cd perfumetrust
npm install
cp .env.example .env.local
# preencha .env.local com os valores do passo 7.1
npm run dev
```

Acesse `http://localhost:3000`.

### 7.3 Publicar na Vercel

1. Suba o projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe
   o repositório.
3. Framework Preset: **Next.js** (detectado automaticamente).
4. Em **Environment Variables**, adicione as mesmas variáveis do
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → a URL final do deploy (ex.:
     `https://perfumetrust.vercel.app`)
5. Clique em **Deploy**. Ao concluir, a Vercel fornece a URL de produção.
6. Volte ao Supabase em **Authentication → URL Configuration** e
   adicione a URL da Vercel em **Site URL** e **Redirect URLs**
   (necessário para os fluxos de e-mail funcionarem em produção).
7. Teste o fluxo completo em produção: cadastro por telefone/e-mail →
   registrar transação de teste com uma segunda conta → confirmar dos
   dois lados → avaliar → conferir que a nota e o score do perfil
   atualizaram → testar uma denúncia e aprová-la no `/admin/denuncias`.

### 7.4 Deploys futuros

Qualquer `git push` na branch conectada (ex.: `main`) gera um novo deploy
automático na Vercel. Alterações de schema devem ser aplicadas manualmente
no SQL Editor do Supabase (ou via [Supabase CLI](https://supabase.com/docs/guides/cli)
com migrations, recomendado à medida que o projeto crescer além do MVP).

---

## Próximos passos sugeridos (pós-MVP)

- Upload de foto de perfil/avatar via Supabase Storage.
- Notificações (e-mail/push) quando a outra parte confirma uma transação.
- Paginação e filtros avançados na busca.
- Rate limiting nas RPCs sensíveis (denúncias, criação de transação) para
  evitar abuso.
- Geração de tipos TypeScript automática via
  `npx supabase gen types typescript` para substituir `src/lib/types.ts`.
