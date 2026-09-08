// Helpers de formatação de tempo decorrido, em português, reutilizados
// no histórico de avaliações e no "membro há X tempo" do perfil.

/** Retorna só a duração, ex: "hoje", "3 dias", "2 meses", "1 ano". */
export function formatDuration(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 1) return "hoje";
  if (days === 1) return "1 dia";
  if (days < 30) return `${days} dias`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "mês" : "meses"}`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}

/** Ex: "há 3 dias" — usado no histórico de avaliações. */
export function timeAgo(dateStr: string): string {
  const duration = formatDuration(dateStr);
  return duration === "hoje" ? "hoje" : `há ${duration}`;
}

/** Ex: "Membro há 3 meses" — usado no perfil público. */
export function memberSince(dateStr: string): string {
  const duration = formatDuration(dateStr);
  return duration === "hoje" ? "Membro desde hoje" : `Membro há ${duration}`;
}
