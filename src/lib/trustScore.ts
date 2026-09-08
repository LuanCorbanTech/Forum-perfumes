// Helpers de apresentação do Score de Confiabilidade (0-100).
// O CÁLCULO oficial acontece no banco (public.calculate_trust_score, em
// supabase/functions_triggers.sql) — este arquivo só formata/classifica
// o valor já calculado para exibição na UI.

export type TrustLevel = "alto" | "medio" | "baixo" | "novo";

export function getTrustLevel(score: number, reviewsCount: number): TrustLevel {
  if (reviewsCount === 0) return "novo";
  if (score >= 75) return "alto";
  if (score >= 45) return "medio";
  return "baixo";
}

// Rótulo curto usado ao lado do número do score no perfil (ex.: "92 alta").
export const TRUST_LEVEL_SHORT: Record<TrustLevel, string> = {
  alto: "alta",
  medio: "média",
  baixo: "baixa",
  novo: "novo vendedor",
};

export const TRUST_LEVEL_COPY: Record<TrustLevel, { label: string; className: string }> = {
  alto: { label: "Alta confiabilidade", className: "bg-verde-tint text-verde border-verde-tint-border" },
  medio: { label: "Confiabilidade média", className: "bg-dourado-tint text-dourado-dark border-dourado-tint-border" },
  baixo: { label: "Baixa confiabilidade", className: "bg-crimson-tint text-crimson border-crimson-tint-border" },
  novo: { label: "Vendedor novo", className: "bg-sand-200 text-[#5B6470] border-sand-300" },
};

export function formatRating(rating: number): string {
  return rating.toFixed(1).replace(".", ",");
}

// Selo "✓ verificado" exibido nos cards: um jeito simples e honesto de
// destacar quem já tem um histórico real de vendas concluídas na
// plataforma — não é uma checagem de identidade nem do frasco em si.
const VERIFIED_MIN_SALES = 3;

export function isVerifiedSeller(profile: { completed_sales_count: number; is_banned: boolean }): boolean {
  return !profile.is_banned && profile.completed_sales_count >= VERIFIED_MIN_SALES;
}
