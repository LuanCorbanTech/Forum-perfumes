import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewList } from "@/components/ReviewList";
import { ReportForm } from "@/components/ReportForm";
import { RecommendButton } from "@/components/RecommendButton";
import { EditProfileForm } from "@/components/EditProfileForm";
import { Avatar } from "@/components/Avatar";
import { TagIcon, BagIcon, TrophyIcon } from "@/components/icons";
import { isVerifiedSeller, getTrustLevel, TRUST_LEVEL_SHORT } from "@/lib/trustScore";
import { normalizeProfile } from "@/lib/normalizeProfile";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Review } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PerfilPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single<Profile>();

  if (!profileRaw) notFound();
  const profile = normalizeProfile(profileRaw);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, reviewer:reviewer_id(id, full_name, avatar_url)")
    .eq("reviewed_id", id)
    .order("created_at", { ascending: false })
    .returns<Review[]>();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === id;
  const verified = isVerifiedSeller(profile);
  const memberSinceYear = new Date(profile.created_at).getFullYear();
  const trustLevel = getTrustLevel(profile.trust_score, profile.reviews_count);
  const starPct = Math.min(100, Math.max(0, (profile.average_rating / 5) * 100));

  let alreadyRecommended = false;
  if (user && !isOwnProfile) {
    const { data: existingRecommendation } = await supabase
      .from("recommendations")
      .select("id")
      .eq("recommender_id", user.id)
      .eq("recommended_id", id)
      .maybeSingle();
    alreadyRecommended = !!existingRecommendation;
  }

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 rounded-lg border border-sand-400 bg-white px-3.5 py-[9px] text-[11px] font-semibold uppercase tracking-[0.02em] text-[#5B6470] transition-colors hover:border-dourado hover:text-dourado"
      >
        ← Voltar ao diretório de membros
      </Link>

      <div className="mt-6">
        <div className="flex flex-wrap items-start gap-[18px]">
          <Avatar
            fullName={profile.full_name}
            avatarUrl={profile.avatar_url}
            size={84}
            variant="dark-square"
            borderClass={verified ? "border-2 border-verde" : "border border-obsidian-400"}
          />
          <div className="min-w-[220px] flex-1">
            <h1 className="font-serif text-4xl font-medium leading-none text-obsidian-900">
              {profile.full_name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2.5 text-[13px] font-normal text-[#5B6470]">
              {profile.city
                ? `${profile.city}${profile.state ? `, ${profile.state}` : ""}`
                : "Localização não informada"}
              <span className="rounded-full border border-sand-400 bg-white px-2.5 py-[3px] text-[10.5px] font-semibold uppercase tracking-[0.02em] text-[#5B6470]">
                Membro desde {memberSinceYear}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {verified && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-verde-dark-border bg-verde-dark py-[5px] pl-[5px] pr-3 text-[10.5px] font-semibold text-verde-light">
                  <span className="grid h-[15px] w-[15px] place-items-center rounded-full bg-verde text-[8px] font-bold leading-none text-white">
                    ✓
                  </span>
                  Vendedor verificado
                </span>
              )}
              {profile.is_banned && (
                <span className="rounded-full border border-crimson-tint-border bg-crimson-tint px-3 py-1 text-[10.5px] font-semibold text-crimson">
                  Usuário banido por violar as regras da comunidade
                </span>
              )}
            </div>
            {profile.bio && (
              <p className="mt-3.5 max-w-[58ch] text-[14.5px] font-normal leading-relaxed text-[#3C434C]">
                {profile.bio}
              </p>
            )}
            {(profile.brands.length > 0 || profile.item_types.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.brands.map((brand) => (
                  <span
                    key={brand}
                    className="rounded-full border border-sand-400 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.02em] text-[#5B6470]"
                  >
                    {brand}
                  </span>
                ))}
                {profile.item_types.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-dourado-tint-border bg-dourado-tint px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.02em] text-dourado-dark"
                  >
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>

          {!isOwnProfile && user && (
            <div className="flex min-w-[190px] flex-col gap-2">
              <a
                href={`/transacoes/nova?vendedor=${profile.id}`}
                className="rounded-lg bg-obsidian-900 px-[18px] py-3 text-center text-[11.5px] font-semibold uppercase tracking-[0.02em] text-white transition-colors hover:bg-dourado hover:text-obsidian-900"
              >
                Registrar transação
              </a>
              <RecommendButton
                recommendedId={profile.id}
                currentUserId={user.id}
                initiallyRecommended={alreadyRecommended}
              />
            </div>
          )}

          {isOwnProfile && <EditProfileForm profile={profile} />}
        </div>

        {/* Faixa clara: nota média + score */}
        <div className="mt-[34px] grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] rounded-card border border-sand-300 bg-white">
          <div className="border-r border-sand-200 p-5">
            <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
              Nota média
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-4xl font-semibold leading-none text-dourado">
                {profile.average_rating.toFixed(1).replace(".", ",")}
              </span>
              <span className="text-[11px] font-normal text-[#8A8F98]">
                {profile.reviews_count === 1 ? "1 avaliação" : `${profile.reviews_count} avaliações`}
              </span>
            </p>
          </div>
          <div className="p-5">
            <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
              Score de confiabilidade
            </p>
            <p className="flex items-baseline gap-2">
              <span className="text-[34px] font-semibold leading-none text-obsidian-900">
                {profile.trust_score}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  trustLevel === "alto"
                    ? "text-verde"
                    : trustLevel === "medio"
                      ? "text-dourado-dark"
                      : trustLevel === "baixo"
                        ? "text-crimson"
                        : "text-[#8A8F98]"
                }`}
              >
                {TRUST_LEVEL_SHORT[trustLevel]}
              </span>
            </p>
          </div>
        </div>

        {/* Três cards escuros */}
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
          <div className="rounded-card border border-obsidian-500 bg-obsidian-800 p-5">
            <span className="block text-dourado">
              <TagIcon />
            </span>
            <p className="mt-3.5 text-3xl font-semibold leading-none text-white">
              {profile.completed_sales_count}
            </p>
            <p className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-[#9AA1A9]">
              Vendas realizadas
            </p>
          </div>
          <div className="rounded-card border border-obsidian-500 bg-obsidian-800 p-5">
            <span className="block text-dourado">
              <BagIcon />
            </span>
            <p className="mt-3.5 text-3xl font-semibold leading-none text-white">
              {profile.completed_purchases_count}
            </p>
            <p className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-[#9AA1A9]">
              Compras realizadas
            </p>
          </div>
          <div className="rounded-card border border-obsidian-500 bg-obsidian-800 p-5">
            <span className="block text-dourado">
              <TrophyIcon />
            </span>
            <p className="mt-3.5 text-3xl font-semibold leading-none text-white">
              {profile.recommendations_count}
            </p>
            <p className="mt-2 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-[#9AA1A9]">
              Indicações recebidas
            </p>
          </div>
        </div>

        {/* Faixa de destaque da nota */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-[18px] rounded-card border border-dourado/40 bg-obsidian-900 px-[26px] py-[22px]">
          <span className="flex items-baseline gap-3">
            <span className="font-serif text-[48px] font-semibold leading-none text-dourado">
              {profile.average_rating.toFixed(1).replace(".", ",")}
            </span>
            <span className="text-[15px] font-medium text-[#6E757D]">/ 5,0</span>
          </span>
          <span className="min-w-[150px] flex-1">
            <span className="block text-[9.5px] font-semibold uppercase tracking-[0.02em] text-[#9AA1A9]">
              Nota média
            </span>
            <span className="mt-1.5 block text-[13px] font-normal text-[#C9CDD3]">
              {profile.reviews_count === 1 ? "1 avaliação recebida" : `${profile.reviews_count} avaliações recebidas`}
            </span>
          </span>
          <span className="relative inline-block w-max text-[19px] leading-none tracking-[0.02em]" aria-hidden="true">
            <span className="text-obsidian-500">★★★★★</span>
            <span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-dourado" style={{ width: `${starPct}%` }}>
              ★★★★★
            </span>
          </span>
        </div>

        <h2 className="mb-1.5 mt-11 text-xl font-bold text-obsidian-900">
          Histórico de transações e avaliações
        </h2>
        <p className="mb-6 text-[13px] font-normal text-[#8A8F98]">
          Só transações confirmadas pelas duas partes aparecem aqui.
        </p>
        <ReviewList reviews={reviews ?? []} />

        {!isOwnProfile && user && (
          <>
            <h2 className="mb-4 mt-11 text-xl font-bold text-obsidian-900">Algo errado?</h2>
            <ReportForm reportedId={profile.id} reportedName={profile.full_name} currentUserId={user.id} />
          </>
        )}
      </div>
    </div>
  );
}
