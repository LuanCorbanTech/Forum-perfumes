import Image from "next/image";
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
          {review.photo_url && (
            <a
              href={review.photo_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block h-28 w-28 overflow-hidden rounded-lg border border-ink-600"
            >
              <Image
                src={review.photo_url}
                alt="Foto do perfume recebido, anexada pelo avaliador"
                width={112}
                height={112}
                className="h-full w-full object-cover transition hover:opacity-80"
              />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
