import { StarRating } from "./StarRating";
import type { Review } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months > 1 ? "es" : ""}`;
  const years = Math.floor(months / 12);
  return `há ${years} ano${years > 1 ? "s" : ""}`;
}

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
        Este vendedor ainda não recebeu avaliações.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">
              {review.reviewer?.full_name ?? "Usuário"}
            </span>
            <span className="text-xs text-gray-400">{timeAgo(review.created_at)}</span>
          </div>
          <div className="mt-1">
            <StarRating rating={review.rating} showNumber={false} size="sm" />
          </div>
          {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
