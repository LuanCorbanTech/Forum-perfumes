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

export const TRUST_LEVEL_COPY: Record<TrustLevel, { label: string; className: string }> = {
  alto: { label: "Alta confiabilidade", className: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30" },
  medio: { label: "Confiabilidade média", className: "bg-gold-400/10 text-gold-300 border-gold-400/30" },
  baixo: { label: "Baixa confiabilidade", className: "bg-red-400/10 text-red-300 border-red-400/30" },
  novo: { label: "Vendedor novo", className: "bg-ink-500/20 text-ink-200 border-ink-400/30" },
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
