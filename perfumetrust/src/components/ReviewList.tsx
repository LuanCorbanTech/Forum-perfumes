import Image from "next/image";
import { Avatar } from "./Avatar";
import { timeAgo } from "@/lib/dateFormat";
import type { Review } from "@/lib/types";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-sand-400 p-6 text-center text-[#5B6470]">
        Este vendedor ainda não recebeu avaliações.
      </p>
    );
  }

  return (
    <div className="grid gap-0">
      {reviews.map((review, i) => {
        const isLast = i === reviews.length - 1;
        const starWidth = `${Math.min(100, Math.max(0, (review.rating / 5) * 100))}%`;
        return (
          <div key={review.id} className="relative grid grid-cols-[44px_1fr] gap-[18px] pb-[26px]">
            <span className="relative">
              <span className="relative z-[1] block">
                <Avatar fullName={review.reviewer?.full_name ?? "Usuário"} avatarUrl={review.reviewer?.avatar_url} size={44} />
              </span>
              {!isLast && (
                <span aria-hidden="true" className="absolute left-[21px] top-11 bottom-[-26px] w-px bg-sand-300" />
              )}
            </span>
            <div className="rounded-card border border-sand-300 bg-white px-5 py-[18px] transition-colors hover:border-dourado">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-[15px] font-semibold text-obsidian-900">
                  {review.reviewer?.full_name ?? "Usuário"}
                </span>
                <span className="relative inline-block w-max text-xs leading-none text-dourado" aria-hidden="true">
                  <span className="text-[#E2DCD1]">★★★★★</span>
                  <span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap" style={{ width: starWidth }}>
                    ★★★★★
                  </span>
                </span>
                <span className="ml-auto text-[11px] font-normal text-[#A0A5AC]">{timeAgo(review.created_at)}</span>
              </div>
              {review.comment && (
                <p className="mt-2.5 max-w-[62ch] text-[14.5px] font-normal leading-relaxed text-[#3C434C]">
                  {review.comment}
                </p>
              )}
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {/* Toda avaliação só existe depois de uma transação confirmada
                    pelas duas partes (regra já aplicada no banco) — por isso
                    o selo aparece sempre, sem precisar de um campo novo. */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-verde-tint-border bg-verde-tint px-2.5 py-1 text-[10.5px] font-semibold text-verde">
                  ✓ transação confirmada
                </span>
              </div>
              {review.photo_url && (
                <a
                  href={review.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3.5 block h-28 w-28 overflow-hidden rounded-lg border border-sand-300"
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
