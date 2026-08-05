import type { Profile } from "./types";

// Blinda a UI contra colunas de reputação que, por algum motivo (migração
// não aplicada no banco, cache do PostgREST desatualizado etc.), venham
// undefined/null da consulta — evita mostrar "undefined" em métricas como
// "Perfumes comprados" no card do vendedor.
export function normalizeProfile<T extends Partial<Profile>>(profile: T): T {
  return {
    ...profile,
    brands: profile.brands ?? [],
    item_types: profile.item_types ?? [],
    average_rating: profile.average_rating ?? 0,
    reviews_count: profile.reviews_count ?? 0,
    completed_sales_count: profile.completed_sales_count ?? 0,
    completed_purchases_count: profile.completed_purchases_count ?? 0,
    recommendations_count: profile.recommendations_count ?? 0,
    trust_score: profile.trust_score ?? 50,
  };
}
