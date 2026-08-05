import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Barra de topo com a arte do canal + uma faixa fina com números reais da
// comunidade. Aparece em todas as páginas, como no design do Cheiro Novo.
export async function TopBanner() {
  const supabase = await createClient();

  const [{ count: totalProfiles }, { data: reviews }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", false),
    supabase.from("reviews").select("rating"),
  ]);

  const totalReviews = reviews?.length ?? 0;
  const positivePct =
    totalReviews > 0
      ? Math.round((reviews!.filter((r) => r.rating >= 4).length / totalReviews) * 100)
      : null;

  return (
    <>
      <div className="bg-ink-950 border-b border-ink-700">
        <Image
          src="/banner-topo.png"
          alt="Canal Cheiro Novo — vídeos novos de seg a sáb às 20h15, shorts todos os dias às 19h, @canalcheironovo"
          width={1138}
          height={188}
          priority
          className="mx-auto block h-auto w-full max-w-6xl"
        />
      </div>
      <div className="border-b border-ink-700 bg-ink-950/60 py-1.5 font-mono text-[11px] tracking-wide text-ink-400">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-7">
          <span>
            {(totalProfiles ?? 0).toLocaleString("pt-BR")} vendedores cadastrados
            {positivePct !== null && (
              <>
                {" "}
                &nbsp;·&nbsp; {positivePct}% de avaliações positivas
              </>
            )}
          </span>
          <Link href="/regras" className="text-gold-500 hover:text-gold-400">
            → leia as regras antes de anunciar
          </Link>
        </div>
      </div>
    </>
  );
}
