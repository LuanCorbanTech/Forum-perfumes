import { formatRating } from "@/lib/trustScore";

interface StarRatingProps {
  rating: number; // 0 a 5, aceita casas decimais
  reviewsCount?: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
}

const SIZE_PX = {
  sm: 12,
  md: 14,
  lg: 19,
};

export function StarRating({ rating, reviewsCount, size = "md", showNumber = true }: StarRatingProps) {
  const starWidth = `${Math.min(100, Math.max(0, (rating / 5) * 100))}%`;

  return (
    <div className="flex items-center gap-2" aria-label={`Nota ${rating} de 5`}>
      <span
        className="relative inline-block w-max leading-none tracking-[0.02em]"
        style={{ fontSize: SIZE_PX[size] }}
        aria-hidden="true"
      >
        <span className="text-[#E2DCD1]">★★★★★</span>
        <span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-dourado" style={{ width: starWidth }}>
          ★★★★★
        </span>
      </span>
      {showNumber && (
        <span className="font-sans text-sm font-medium text-navy-600">
          {formatRating(rating)}
          {typeof reviewsCount === "number" && (
            <span className="font-normal text-navy-400"> ({reviewsCount})</span>
          )}
        </span>
      )}
    </div>
  );
}
