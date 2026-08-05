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
  alto: { label: "Alta confiabilidade", className: "bg-green-100 text-green-800 border-green-300" },
  medio: { label: "Confiabilidade média", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  baixo: { label: "Baixa confiabilidade", className: "bg-red-100 text-red-800 border-red-300" },
  novo: { label: "Vendedor novo", className: "bg-gray-100 text-gray-700 border-gray-300" },
};

export function formatRating(rating: number): string {
  return rating.toFixed(1).replace(".", ",");
}
