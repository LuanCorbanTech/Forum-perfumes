import Link from "next/link";
import { StarRating } from "./StarRating";
import { TrustScoreBadge } from "./TrustScoreBadge";
import { memberSince } from "@/lib/dateFormat";
import type { Profile } from "@/lib/types";

export function SellerCard({ profile }: { profile: Profile }) {
  return (
    <Link
      href={`/perfil/${profile.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-brand-300"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900">{profile.full_name}</h3>
            {profile.is_banned && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Banido
              </span>
            )}
          </div>
          {profile.city && (
            <p className="text-sm text-gray-500">
              {profile.city}
              {profile.state ? `, ${profile.state}` : ""}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StarRating rating={profile.average_rating} reviewsCount={profile.reviews_count} size="sm" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TrustScoreBadge score={profile.trust_score} reviewsCount={profile.reviews_count} />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {profile.completed_sales_count} venda{profile.completed_sales_count === 1 ? "" : "s"} concluída
            {profile.completed_sales_count === 1 ? "" : "s"}
            {profile.recommendations_count > 0 && (
              <> · 👍 {profile.recommendations_count} recomenda{profile.recommendations_count === 1 ? "ção" : "ções"}</>
            )}
          </p>
          <p className="mt-1 text-xs text-gray-400">{memberSince(profile.created_at)}</p>
        </div>
      </div>
    </Link>
  );
}
