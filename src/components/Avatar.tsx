import Image from "next/image";
import { initials } from "@/lib/initials";

interface Props {
  fullName: string;
  avatarUrl?: string | null;
  size: number;
  /**
   * "dark-square" — caixa escura com cantos levemente arredondados (usada
   * no redesign "handoff": cabeçalho do card de membro, cabeçalho do
   * perfil). "light-circle" — círculo claro (linha do tempo de avaliações,
   * widget "gente boa da semana"). Continua sendo iniciais calculadas do
   * nome — nunca um placeholder fixo — até a pessoa enviar uma foto.
   */
  variant?: "dark-square" | "light-circle";
  /** Sobrescreve a borda padrão da variante (ex.: verde quando verificado). */
  borderClass?: string;
  className?: string;
}

export function Avatar({
  fullName,
  avatarUrl,
  size,
  variant = "light-circle",
  borderClass,
  className = "",
}: Props) {
  const isDark = variant === "dark-square";
  const shape = isDark ? "rounded-lg" : "rounded-full";
  const border = borderClass ?? (isDark ? "border border-obsidian-400" : "border border-sand-300");

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={fullName}
        width={size}
        height={size}
        className={`shrink-0 object-cover ${shape} ${border} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center font-sans font-semibold ${shape} ${border} ${
        isDark ? "bg-obsidian-700 text-white" : "bg-sand-100 text-[#5B6470]"
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials(fullName)}
    </span>
  );
}
