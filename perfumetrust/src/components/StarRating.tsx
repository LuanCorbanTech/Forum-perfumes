import { formatRating } from "@/lib/trustScore";

interface StarRatingProps {
  rating: number; // 0 a 5, aceita casas decimais
  reviewsCount?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
}

const SIZE_CLASS = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
};

export function StarRating({ rating, reviewsCount, size = "md", showNumber = true }: StarRatingProps) {
  const rounded = Math.round(rating * 2) / 2; // arredonda para 0.5 mais próximo

  return (
    <div className={`flex items-center gap-1 ${SIZE_CLASS[size]}`} aria-label={`Nota ${rating} de 5`}>
      <div className="flex text-gold-400" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= rounded;
          const half = !filled && i + 0.5 === rounded;
          return (
            <span key={i} className={`relative ${!filled && !half ? "text-ink-500" : ""}`}>
              {half ? "★" : filled ? "★" : "☆"}
            </span>
          );
        })}
      </div>
      {showNumber && (
        <span className="font-medium text-ink-100">
          {formatRating(rating)}
          {typeof reviewsCount === "number" && (
            <span className="font-normal text-ink-400"> ({reviewsCount})</span>
          )}
        </span>
      )}
    </div>
  );
}
