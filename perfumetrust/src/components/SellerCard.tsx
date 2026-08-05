import Link from "next/link";
import { StarRating } from "./StarRating";
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

export function SellerCard({ profile, verified, testimonial, recommenders = [] }: Props) {
  const extraRecommenders = Math.max(0, profile.recommendations_count - recommenders.length);

  return (
    <article className="flex flex-col border border-ink-700 bg-ink-800 transition hover:border-gold-500/40">
      <div className="flex items-center gap-3.5 border-b border-ink-700 p-5 pb-4">
        <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border border-ink-600 bg-ink-700 font-serif text-lg text-gold-500">
          {initials(profile.full_name)}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-serif text-xl text-ink-50">{profile.full_name}</span>
          <span className="truncate font-mono text-[9.5px] tracking-wide text-ink-400">
            {profile.city
              ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
              : `membro há ${formatDuration(profile.created_at)}`}
          </span>
        </span>
        {verified && (
          <span className="ml-auto whitespace-nowrap border border-gold-500/50 bg-gold-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gold-300">
            ✓ verificado
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px bg-ink-700">
        <Stat label="Tempo no grupo" value={formatDuration(profile.created_at)} />
        <div className="bg-ink-800 px-5 py-4">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
            Avaliação
          </span>
          <span className="flex items-baseline gap-2">
            <span className="font-serif text-2xl leading-none text-gold-300">
              {profile.average_rating.toFixed(1).replace(".", ",")}
            </span>
            <StarRating rating={profile.average_rating} size="sm" showNumber={false} />
          </span>
        </div>
        <Stat label="Perfumes vendidos" value={String(profile.completed_sales_count)} />
        <Stat label="Perfumes comprados" value={String(profile.completed_purchases_count)} />
      </div>

      <div className="flex-1 border-t border-ink-700 p-5">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
          Indicações · {profile.recommendations_count}
        </p>
        {testimonial ? (
          <>
            <p className="text-[13.5px] leading-relaxed text-ink-300">“{testimonial.comment}”</p>
            <p className="mt-2.5 font-mono text-[9.5px] tracking-wide text-ink-500">
              — {testimonial.reviewerName}
            </p>
          </>
        ) : (
          <p className="text-[13.5px] leading-relaxed text-ink-500">Ainda não tem avaliações públicas.</p>
        )}
        {recommenders.length > 0 && (
          <div className="mt-4 flex items-center gap-1.5">
            {recommenders.map((r) => (
              <span
                key={r.id}
                title={r.full_name}
                className="grid h-6 w-6 place-items-center rounded-full border border-ink-600 bg-ink-700 font-mono text-[8.5px] text-ink-300"
              >
                {initials(r.full_name)}
              </span>
            ))}
            {extraRecommenders > 0 && (
              <span className="font-mono text-[10px] text-ink-500">+{extraRecommenders}</span>
            )}
          </div>
        )}
      </div>

      <Link
        href={`/perfil/${profile.id}`}
        className="border-t border-ink-700 p-3.5 text-center font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink-200 transition hover:bg-ink-700 hover:text-gold-300"
      >
        Ver perfil completo
      </Link>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-800 px-5 py-4">
      <span className="mb-2 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">
        {label}
      </span>
      <span className="block font-serif text-2xl leading-none text-ink-50">{value}</span>
    </div>
  );
}
