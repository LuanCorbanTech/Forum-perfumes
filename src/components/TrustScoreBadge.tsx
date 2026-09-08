import { getTrustLevel, TRUST_LEVEL_COPY } from "@/lib/trustScore";

interface TrustScoreBadgeProps {
  score: number;
  reviewsCount: number;
}

export function TrustScoreBadge({ score, reviewsCount }: TrustScoreBadgeProps) {
  const level = getTrustLevel(score, reviewsCount);
  const copy = TRUST_LEVEL_COPY[level];

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${copy.className}`}
      >
        {copy.label}
      </span>
      <span className="text-sm text-[#8A8F98]">
        Score: <span className="font-sans font-semibold text-obsidian-900">{score}</span>/100
      </span>
    </div>
  );
}
