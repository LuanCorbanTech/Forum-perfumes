-- =====================================================================
-- Cheiro Novo — Migração 017: versão dos Termos aceitos (LGPD)
-- =====================================================================
-- Complementa terms_accepted_at (migration_013) e ip_address
-- (migration_016): agora também guardamos QUAL VERSÃO do texto dos
-- Termos de Uso / Política de Privacidade a pessoa aceitou naquele
-- momento (ver src/lib/legalVersion.ts). Isso importa porque, se o texto
-- mudar no futuro (ex.: por exigência da ANPD ou mudança de processo),
-- dá pra saber exatamente qual versão cada usuário concordou — sem isso,
-- só teríamos a data, sem saber se o texto de então era o mesmo de hoje.
--
-- Como usar: cole todo este arquivo no SQL Editor do Supabase e rode.
-- É seguro rodar mais de uma vez. Rode depois da migração 016.
-- =====================================================================

alter table public.profile_kyc
  add column if not exists terms_version integer;

comment on column public.profile_kyc.terms_version is
  'Número da versão dos Termos de Uso/Política de Privacidade (ver '
  'CURRENT_TERMS_VERSION em src/lib/legalVersion.ts) vigente no momento '
  'em que a pessoa marcou o aceite — comprovação de consentimento (LGPD '
  'art. 8º), junto com terms_accepted_at (migration_013) e ip_address '
  '(migration_016).';
