# Aviso por e-mail de aprovação/recusa de cadastro (Brevo)

A chave da Brevo e o e-mail remetente **não ficam mais em variável de
ambiente/linha de comando** — desde a migração 008, você configura os
dois direto pelo site, na aba **Configurações (APIs)** dentro do painel
`/admin`. Publicar (fazer o deploy d)esta função continua sendo um passo
único, feito uma vez só — e dá pra fazer sem instalar nada, direto pelo
site do Supabase.

## 1) Rode a migração 008

Antes de tudo, cole `supabase/migration_008_configuracoes_admin.sql` no
SQL Editor do Supabase e rode (se ainda não rodou). É ela que cria a
tabela onde a chave da Brevo fica guardada com segurança (só admin lê).

## 2) Publique esta função (só precisa fazer uma vez)

### Opção A — pelo próprio site do Supabase, sem instalar nada

1. Entre no painel do seu projeto em supabase.com e abra **Edge
   Functions** no menu lateral.
2. Clique em **Deploy a new function > Via Editor**.
3. Apague o conteúdo de exemplo e cole todo o conteúdo do arquivo
   `index.ts` desta mesma pasta.
4. Dê o nome **notify-signup-review** pra função (tem que ser esse nome
   exato) e clique em **Deploy function**.

### Opção B — pela linha de comando (CLI), se preferir

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy notify-signup-review
```

`SEU_PROJECT_REF` é o identificador do projeto, você encontra na URL do
painel (`https://supabase.com/dashboard/project/SEU_PROJECT_REF`) ou em
**Project Settings > General**.

## 3) Configure a Brevo pelo próprio site

Depois de publicada a função (passo 2), entre no seu site, vá em
**Admin > Configurações (APIs)** e preencha:

- **Chave de API da Brevo** — gerada em brevo.com, em Configurações >
  SMTP e API > Chaves de API.
- **E-mail remetente** — o e-mail que você verificou na Brevo (em
  Configurações > Remetentes e IP > Remetentes).
- **Nome do remetente** — o que aparece pra quem recebe o e-mail (ex.:
  "Cheiro Novo").

Pronto. A partir daqui, toda vez que você aprovar ou recusar um cadastro
em `/admin/cadastros`, a pessoa recebe um e-mail automático avisando (e,
se for recusa, com o motivo que você escreveu no campo de notas). Se um
dia quiser trocar a chave, é só voltar nessa mesma tela, não precisa
mexer na função de novo.

## Se algo der errado

Isso é só um aviso de "melhor esforço": se a Brevo estiver mal
configurada, a aprovação/recusa em si continua acontecendo normalmente,
a pessoa só não recebe o e-mail (e você vê um aviso discreto na tela).
Pra investigar o motivo exato do erro (chave inválida, remetente não
verificado, etc), veja os logs da função em **Edge Functions >
notify-signup-review > Logs** no painel do Supabase.
