import Image from "next/image";
import Link from "next/link";
import { formatDuration } from "@/lib/dateFormat";
import { initials } from "@/lib/initials";
import type { Profile } from "@/lib/types";

interface Testimonial {
  comment: string;
  reviewerName: string;
}

interface Recommender {
  id: string;
  full_name: string;
}

interface Props {
  profile: Profile;
  verified: boolean;
  testimonial?: Testimonial | null;
  recommenders?: Recommender[];
}

export function SellerCard({ profile, verified, testimonial }: Props) {
  const reviewsLabel =
    profile.reviews_count === 1 ? "1 avaliação" : `${profile.reviews_count} avaliações`;
  const starWidth = `${Math.min(100, Math.max(0, (profile.average_rating / 5) * 100))}%`;

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-sand-300 bg-white transition-[transform,border-color,box-shadow] duration-[250ms] ease-out hover:-translate-y-1 hover:border-dourado hover:shadow-[0_10px_26px_rgba(197,155,39,0.18)]">
      {/* Cabeçalho escuro */}
      <div className="flex items-start gap-3 bg-obsidian-900 px-[18px] py-4">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.full_name}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-lg border border-obsidian-400 object-cover"
          />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-obsidian-400 bg-obsidian-700 text-sm font-semibold text-white">
            {initials(profile.full_name)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold leading-[1.25] text-white">
            {profile.full_name}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            {verified && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-verde-dark-border bg-verde-dark py-[3px] pl-1 pr-2.5 text-[10.5px] font-semibold text-verde-light">
                <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-verde text-[8px] font-bold leading-none text-white">
                  ✓
                </span>
                verificado
              </span>
            )}
            <span className="text-[11.5px] font-normal text-[#9AA1A9]">
              {profile.city
                ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
                : `membro há ${formatDuration(profile.created_at)}`}
            </span>
          </span>
        </span>
      </div>

      {/* Bloco da nota */}
      <div className="flex items-end gap-3 border-b border-sand-200 px-[18px] py-4">
        <span className="font-serif text-[44px] font-semibold leading-[0.82] text-obsidian-900">
          {profile.average_rating.toFixed(1).replace(".", ",")}
        </span>
        <span className="pb-[3px]">
          <span className="relative inline-block w-max text-[13px] leading-none tracking-[0.02em]">
            <span className="text-[#E2DCD1]">★★★★★</span>
            <span
              className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-dourado"
              style={{ width: starWidth }}
            >
              ★★★★★
            </span>
          </span>
          <span className="mt-1.5 block text-[11px] font-normal text-[#8A8F98]">{reviewsLabel}</span>
        </span>
      </div>

      {/* Faixa de três métricas */}
      <div className="grid grid-cols-3 divide-x divide-sand-200 border-b border-sand-200">
        <Stat label="vendas" value={profile.completed_sales_count} />
        <Stat label="compras" value={profile.completed_purchases_count} />
        <Stat label="indicações" value={profile.recommendations_count} />
      </div>

      {/* Depoimento */}
      <div className="flex-1 px-[18px] py-4">
        {testimonial ? (
          <>
            <p className="text-[13px] font-normal leading-[1.6] text-[#374151]">“{testimonial.comment}”</p>
            <p className="mt-2 text-[11px] font-normal text-[#8A8F98]">{testimonial.reviewerName}</p>
          </>
        ) : (
          <p className="text-[13px] font-normal leading-[1.6] text-[#8A8F98]">
            Ainda não tem avaliações públicas.
          </p>
        )}
      </div>

      {/* Rodapé */}
      <Link
        href={`/perfil/${profile.id}`}
        className="border-t border-sand-200 p-3.5 text-center text-[11px] font-semibold uppercase tracking-[0.02em] text-obsidian-900 transition-colors hover:bg-sand hover:text-dourado"
      >
        Ver perfil completo
      </Link>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-[18px] py-3">
      <span className="block text-[19px] font-semibold leading-none text-obsidian-900">{value}</span>
      <span className="mt-1 block text-[9.5px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">
        {label}
      </span>
    </div>
  );
}
