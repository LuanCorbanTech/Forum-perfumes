# Aviso por e-mail de aprovação/recusa de cadastro (Brevo)

Diferente das migrações `.sql` (que você só cola no SQL Editor do Supabase),
esta função precisa ser publicada via linha de comando, uma única vez.
Sem esse passo a passo, a aprovação/recusa de cadastro continua funcionando
normalmente, ela só não vai mandar o e-mail.

## 1) Crie sua conta na Brevo e pegue a chave de API

1. Crie a conta em https://www.brevo.com (o plano grátis cobre até 300
   e-mails/dia, mais do que suficiente aqui).
2. Verifique um remetente: em **Settings > Senders & IP > Senders**,
   adicione e confirme o e-mail que vai aparecer como remetente (ex.:
   `contato@cheironovo.com.br` ou o e-mail que você já usa no site).
3. Pegue a chave de API em **Settings > SMTP & API > API Keys > Generate
   a new API key**.

## 2) Instale e conecte a CLI do Supabase (só na primeira vez)

```bash
npm install -g supabase
supabase login
```

Isso abre o navegador para você autorizar a CLI na sua conta Supabase.

## 3) Conecte a CLI ao SEU projeto

Na raiz do projeto (pasta `perfumetrust`), rode:

```bash
supabase link --project-ref SEU_PROJECT_REF
```

`SEU_PROJECT_REF` é o identificador do projeto, você encontra na URL do
painel do Supabase (`https://supabase.com/dashboard/project/SEU_PROJECT_REF`)
ou em **Project Settings > General**.

## 4) Configure os segredos (a chave da Brevo nunca fica no código)

```bash
supabase secrets set BREVO_API_KEY=cole_sua_chave_aqui
supabase secrets set BREVO_SENDER_EMAIL=o_email_verificado@seudominio.com
supabase secrets set BREVO_SENDER_NAME="Cheiro Novo"
```

## 5) Publique a função

```bash
supabase functions deploy notify-signup-review
```

Pronto. A partir daqui, toda vez que você aprovar ou recusar um cadastro em
`/admin/cadastros`, a pessoa recebe um e-mail automático avisando (e, se for
recusa, com o motivo que você escreveu no campo de notas).

## Se algo der errado

Isso é só um aviso de "melhor esforço": se a Brevo estiver mal configurada,
ou você ainda não tiver rodado os passos acima, a aprovação/recusa em si
continua acontecendo normalmente — a pessoa só não recebe o e-mail. Você
pode ver o motivo do erro (chave inválida, remetente não verificado, etc)
rodando:

```bash
supabase functions logs notify-signup-review
```
