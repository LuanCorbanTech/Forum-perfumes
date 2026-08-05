import { StarRating } from "./StarRating";
import { timeAgo } from "@/lib/dateFormat";
import type { Review } from "@/lib/types";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ink-600 p-6 text-center text-ink-300">
        Este vendedor ainda não recebeu avaliações.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border border-ink-700 bg-ink-800/60 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink-50">
              {review.reviewer?.full_name ?? "Usuário"}
            </span>
            <span className="text-xs text-ink-400">{timeAgo(review.created_at)}</span>
          </div>
          <div className="mt-1">
            <StarRating rating={review.rating} showNumber={false} size="sm" />
          </div>
          {review.comment && <p className="mt-2 text-sm text-ink-200">{review.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
