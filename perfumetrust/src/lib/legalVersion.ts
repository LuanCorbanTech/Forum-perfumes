// Versão atual dos Termos de Uso + Política de Privacidade (o texto de
// PrivacyPolicyContent.tsx e TermsOfUseContent.tsx). Gravada junto com
// terms_accepted_at/ip_address (migration_013/016/017) toda vez que
// alguém marca "Li e concordo..." — serve pra saber, no futuro, qual
// versão do texto cada pessoa realmente aceitou, caso o conteúdo mude.
//
// Quando o texto dos Termos ou da Política mudar de um jeito relevante
// (não é preciso incrementar por causa de correção de digitação/typo),
// aumente este número. Não precisa mexer em mais nada — os dois pontos
// que gravam consentimento (src/app/login/actions.ts e
// src/app/conta/verificacao/actions.ts) já leem esta constante.
export const CURRENT_TERMS_VERSION = 1;
