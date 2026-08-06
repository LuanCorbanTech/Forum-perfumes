import Link from "next/link";
import Image from "next/image";
import { SellerCard } from "@/components/SellerCard";
import { Avatar } from "@/components/Avatar";
import { SearchBar } from "@/components/SearchBar";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedSeller } from "@/lib/trustScore";
import { normalizeProfile } from "@/lib/normalizeProfile";
import type { Profile } from "@/lib/types";

interface Props {
  searchParams: Promise<{ filter?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("profiles").select("*", { count: "exact" }).eq("is_banned", false);
  query =
    filter === "vendedores"
      ? query.order("completed_sales_count", { ascending: false })
      : query.order("trust_score", { ascending: false });

  const { data: sellersRaw, count: filteredCount } = await query.limit(9).returns<Profile[]>();
  const sellers = (sellersRaw ?? []).map(normalizeProfile);

  const sellerIds = sellers.map((s) => s.id);

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

  const { data: highlightedRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("is_banned", false)
    .gt("reviews_count", 0)
    .order("trust_score", { ascending: false })
    .limit(4)
    .returns<Profile[]>();
  const highlighted = (highlightedRaw ?? []).map(normalizeProfile);

  const activeFilter = filter === "vendedores" ? "vendedores" : "todos";

  return (
    <div className="-mx-4 -mt-10 space-y-0 sm:-mx-7">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-sand-300">
        <span
          aria-hidden="true"
          className="hero-aura pointer-events-none absolute left-[-6%] top-[34%] z-0 h-[460px] w-[460px] rounded-full opacity-[0.15] blur-[140px]"
          style={{
            background: "radial-gradient(circle, #C59B27 0%, rgba(197,155,39,0) 70%)",
            animation: "auraA 10s ease-in-out infinite",
          }}
        />
        <span
          aria-hidden="true"
          className="hero-aura pointer-events-none absolute bottom-[-14%] left-[26%] z-0 h-[420px] w-[420px] rounded-full opacity-[0.12] blur-[140px]"
          style={{
            background: "radial-gradient(circle, #15803D 0%, rgba(21,128,61,0) 70%)",
            animation: "auraB 12s ease-in-out infinite",
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1] opacity-50 mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-[2] mx-auto max-w-6xl px-4 py-14 sm:px-7">
          <div className="grid grid-cols-1 items-start gap-9 min-[900px]:grid-cols-[1fr_372px] min-[900px]:items-center">
            <div>
              <p className="mb-[18px] text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
                Diretório de reputação · desde 2023
              </p>
              <h1 className="max-w-[15ch] font-serif text-[46px] font-medium leading-[1.04] text-obsidian-900">
                Saiba com quem você está negociando.
              </h1>
              <p className="mt-5 max-w-[52ch] text-[15px] font-normal leading-relaxed text-[#5B6470]">
                Histórico de transações, avaliações e reputação de compradores e vendedores do grupo de
                desapego, tudo à mostra antes do primeiro pix.
              </p>

              <div className="mt-8 max-w-[620px]">
                <SearchBar />
              </div>
            </div>

            <div className="justify-self-center">
              <TestimonialCarousel />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-7 rounded-card border border-dourado bg-obsidian-900 px-7 py-[26px]">
            <MetricStat value={(totalProfiles ?? 0).toLocaleString("pt-BR")} label="membros cadastrados" />
            <MetricStat
              value={avgRating !== null ? avgRating.toFixed(1).replace(".", ",") : "—"}
              label="nota média"
              gold
            />
            <MetricStat value={(completedTx ?? 0).toLocaleString("pt-BR")} label="transações concluídas" />
          </div>
        </div>
      </section>

      {/* ================= BANNER DO CANAL ================= */}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7">
        <a
          href="https://www.youtube.com/@canalcheironovo"
          target="_blank"
          rel="noreferrer"
          className="my-14 block overflow-hidden rounded-2xl border border-dourado/20 bg-obsidian-900"
        >
          <Image
            src="/banner-topo.png"
            alt="Canal Cheiro Novo — vídeos novos de seg a sáb às 20h15, shorts todos os dias às 19h, @canalcheironovo"
            width={1138}
            height={188}
            className="block h-auto w-full"
          />
        </a>
      </div>

      {/* ================= GRID DE MEMBROS ================= */}
      <div className="mx-auto max-w-6xl px-4 py-11 sm:px-7">
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-[26px] flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="text-xl font-bold text-obsidian-900">
                Membros avaliados <span className="text-[#B4AEA3]">{filteredCount ?? 0}</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                <FilterPill href="/" active={activeFilter === "todos"}>
                  Todos
                </FilterPill>
                <FilterPill href="/?filter=vendedores" active={activeFilter === "vendedores"}>
                  Top vendedores
                </FilterPill>
              </div>
            </div>

            {sellers && sellers.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
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
              <p className="text-[#8A8F98]">
                Ainda não há membros avaliados. Seja o primeiro a construir sua reputação!
              </p>
            )}
          </div>

          <aside className="space-y-5">
            {highlighted && highlighted.length > 0 && (
              <div className="rounded-card border border-sand-300 bg-white p-5">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
                  gente boa da semana
                </p>
                <div className="flex flex-col gap-4">
                  {highlighted.map((p) => (
                    <Link key={p.id} href={`/perfil/${p.id}`} className="flex items-center gap-3">
                      <Avatar fullName={p.full_name} avatarUrl={p.avatar_url} size={32} variant="light-circle" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-medium text-obsidian-900">{p.full_name}</span>
                        <span className="text-[11px] font-normal text-[#8A8F98]">
                          ★ {p.average_rating.toFixed(1).replace(".", ",")} · {p.completed_sales_count} vendas
                        </span>
                      </span>
                      <span className="ml-auto whitespace-nowrap rounded-full border border-sand-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.02em] text-[#5B6470]">
                        {highlightBadge(p)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function MetricStat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <div>
      <p className={`font-sans text-[30px] font-semibold leading-none ${gold ? "font-serif text-[34px] text-dourado" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.02em] text-[#9AA1A9]">{label}</p>
    </div>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-[7px] text-[11px] font-semibold uppercase tracking-[0.02em] transition-colors ${
        active
          ? "border border-obsidian-900 bg-obsidian-900 text-white"
          : "border border-sand-400 text-[#5B6470] hover:border-dourado hover:text-dourado"
      }`}
    >
      {children}
    </Link>
  );
}

function highlightBadge(p: Profile): string {
  if (p.average_rating >= 4.8 && p.reviews_count >= 5) return "nota 5";
  if (p.completed_sales_count >= 20) return "top vendas";
  if (p.recommendations_count >= 5) return "recomendado";
  return "confiável";
}
