import Link from "next/link";
import { SellerCard } from "@/components/SellerCard";
import { BrandFilterTabs } from "@/components/BrandFilterTabs";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedSeller } from "@/lib/trustScore";
import { initials } from "@/lib/initials";
import type { Profile } from "@/lib/types";

interface Props {
  searchParams: Promise<{ marca?: string; sort?: string }>;
}

const SAFETY_TIPS = [
  "Peça foto do frasco ao lado de um papel com o nome do usuário e a data.",
  "Confira o lote no rótulo e na caixa — os dois têm que bater.",
  "O site não intermedeia pagamento: confira a reputação aqui antes de fechar lá fora.",
  "Vendedor novo? Comece com um decant antes do frasco cheio.",
];

export default async function HomePage({ searchParams }: Props) {
  const { marca, sort } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*", { count: "exact" }).eq("is_banned", false);
  if (marca) query = query.contains("brands", [marca]);
  query =
    sort === "recentes"
      ? query.order("created_at", { ascending: false })
      : query.order("trust_score", { ascending: false });

  const { data: sellers, count: filteredCount } = await query.limit(9).returns<Profile[]>();

  const sellerIds = (sellers ?? []).map((s) => s.id);

  const [{ data: reviewsRaw }, { data: recsRaw }, { count: totalProfiles }, { data: ratedProfiles }, { count: completedTx }] =
    await Promise.all([
      sellerIds.length
        ? supabase
            .from("reviews")
            .select("reviewed_id, comment, created_at, reviewer:reviewer_id(full_name)")
            .in("reviewed_id", sellerIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      sellerIds.length
        ? supabase
            .from("recommendations")
            .select("recommended_id, created_at, recommender:recommender_id(id, full_name)")
            .in("recommended_id", sellerIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", false),
      supabase.from("profiles").select("average_rating").gt("reviews_count", 0).limit(1000),
      supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    ]);

  const testimonialBySeller = new Map<string, { comment: string; reviewerName: string }>();
  for (const r of reviewsRaw ?? []) {
    if (!testimonialBySeller.has(r.reviewed_id) && r.comment) {
      testimonialBySeller.set(r.reviewed_id, {
        comment: r.comment,
        reviewerName: (r.reviewer as any)?.full_name ?? "Comprador",
      });
    }
  }

  const recommendersBySeller = new Map<string, { id: string; full_name: string }[]>();
  for (const r of recsRaw ?? []) {
    const list = recommendersBySeller.get(r.recommended_id) ?? [];
    if (list.length < 4 && r.recommender) list.push(r.recommender as any);
    recommendersBySeller.set(r.recommended_id, list);
  }

  const avgRating =
    ratedProfiles && ratedProfiles.length > 0
      ? ratedProfiles.reduce((sum, p) => sum + p.average_rating, 0) / ratedProfiles.length
      : null;

  const { data: highlighted } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_banned", false)
    .gt("reviews_count", 0)
    .order("trust_score", { ascending: false })
    .limit(4)
    .returns<Profile[]>();

  return (
    <div className="space-y-0 -mt-10 -mx-4 sm:-mx-7">
      <section className="border-b border-ink-700 bg-gradient-to-b from-ink-800 to-ink-900">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-7 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-end">
          <div>
            <p className="mb-5 font-mono text-[10.5px] uppercase tracking-[0.26em] text-gold-500">
              o feed de hoje
            </p>
            <h1 className="font-serif text-4xl font-light leading-[1.05] text-ink-50 sm:text-[3.4rem]">
              Alguém sempre está
              <br />
              <em className="italic text-gold-300">desapegando</em> do frasco
              <br />
              que você procura.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-ink-300">
              Frascos cheios, decants e restos de coleção anunciados por gente de verdade. Nível
              do frasco, histórico de vendas e reputação à mostra em cada perfil.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link
                href="/transacoes/nova"
                className="bg-gold-500 px-6 py-3.5 text-[12.5px] font-medium uppercase tracking-[0.08em] text-ink-950 transition hover:bg-gold-400"
              >
                Publicar um desapego
              </Link>
              <Link
                href="/busca"
                className="border border-ink-600 px-6 py-3.5 text-[12.5px] uppercase tracking-[0.08em] text-ink-100 transition hover:border-gold-500/50"
              >
                Ver discussões
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden border border-ink-700 bg-ink-700">
            <HeroStat value={(totalProfiles ?? 0).toLocaleString("pt-BR")} label="vendedores cadastrados" />
            <HeroStat value={avgRating !== null ? avgRating.toFixed(1).replace(".", ",") : "—"} label={"nota média\ndos vendedores"} gold />
            <HeroStat value={(completedTx ?? 0).toLocaleString("pt-BR")} label={"transações\nconcluídas"} />
          </div>
        </div>
      </section>

      <div className="border-b border-ink-700 bg-ink-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-7">
          <BrandFilterTabs />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-7">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-6 flex items-baseline justify-between">
              <h2 className="font-serif text-2xl text-ink-50">
                Vendedores verificados <span className="text-ink-500">{filteredCount ?? 0}</span>
              </h2>
              <div className="flex items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">
                <span>todas as marcas</span>
                <Link
                  href={sort === "recentes" ? "/" : "/?sort=recentes"}
                  className="text-gold-500 hover:text-gold-400"
                >
                  recentes ↓
                </Link>
              </div>
            </div>

            {sellers && sellers.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {sellers.map((profile) => (
                  <SellerCard
                    key={profile.id}
                    profile={profile}
                    verified={isVerifiedSeller(profile)}
                    testimonial={testimonialBySeller.get(profile.id) ?? null}
                    recommenders={recommendersBySeller.get(profile.id) ?? []}
                  />
                ))}
              </div>
            ) : (
              <p className="text-ink-400">
                {marca
                  ? `Ainda não há vendedores cadastrados para ${marca}.`
                  : "Ainda não há vendedores avaliados. Seja o primeiro a construir sua reputação!"}
              </p>
            )}
          </div>

          <aside className="space-y-5">
            <div className="border border-ink-700 bg-ink-800 p-5">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-500">
                como não tomar golpe
              </p>
              <div className="flex flex-col gap-3.5">
                {SAFETY_TIPS.map((tip, i) => (
                  <div key={tip} className="grid grid-cols-[20px_1fr] items-start gap-3">
                    <span className="font-mono text-[10px] text-ink-500">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[13.5px] leading-relaxed text-ink-300">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {highlighted && highlighted.length > 0 && (
              <div className="border border-ink-700 bg-ink-800 p-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-500">
                  gente boa da semana
                </p>
                <div className="flex flex-col gap-4">
                  {highlighted.map((p) => (
                    <Link key={p.id} href={`/perfil/${p.id}`} className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink-600 bg-ink-700 font-serif text-[13px] text-gold-500">
                        {initials(p.full_name)}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] text-ink-50">{p.full_name}</span>
                        <span className="font-mono text-[9.5px] text-ink-500">
                          ★ {p.average_rating.toFixed(1).replace(".", ",")} · {p.completed_sales_count} vendas
                        </span>
                      </span>
                      <span className="ml-auto whitespace-nowrap border border-ink-600 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wide text-ink-400">
                        {highlightBadge(p)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-gold-500/35 bg-gradient-to-b from-ink-700/50 to-ink-800 p-6">
              <p className="mb-2.5 font-serif text-xl leading-snug text-ink-50">
                Tem um frasco parado na gaveta?
              </p>
              <p className="mb-4 text-[13.5px] leading-relaxed text-ink-300">
                Publicar leva dois minutos. Só pedimos foto do nível e o lote do frasco.
              </p>
              <Link
                href="/transacoes/nova"
                className="block bg-gold-500 py-3 text-center text-[12px] font-medium uppercase tracking-[0.1em] text-ink-950 transition hover:bg-gold-400"
              >
                Criar anúncio
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <div className="bg-ink-800 px-5 py-6">
      <p className={`font-serif text-4xl leading-none ${gold ? "text-gold-300" : "text-ink-50"}`}>{value}</p>
      <p className="mt-3 whitespace-pre-line font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-ink-400">
        {label}
      </p>
    </div>
  );
}

function highlightBadge(p: Profile): string {
  if (p.average_rating >= 4.8 && p.reviews_count >= 5) return "nota 5";
  if (p.completed_sales_count >= 20) return "top vendas";
  if (p.recommendations_count >= 5) return "recomendado";
  return "confiável";
}
