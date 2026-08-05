import { notFound } from "next/navigation";
import { StarRating } from "@/components/StarRating";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { ReviewList } from "@/components/ReviewList";
import { ReportForm } from "@/components/ReportForm";
import { RecommendButton } from "@/components/RecommendButton";
import { EditProfileForm } from "@/components/EditProfileForm";
import { memberSince } from "@/lib/dateFormat";
import { isVerifiedSeller } from "@/lib/trustScore";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Review } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PerfilPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single<Profile>();

  if (!profile) notFound();

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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-gold-400/15 bg-ink-800 p-6">
        <div className="bg-radial-fade pointer-events-none absolute inset-0 from-gold-500/10 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/15 text-2xl font-bold text-gold-300">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-light text-ink-50">{profile.full_name}</h1>
                {isVerifiedSeller(profile) && (
                  <span className="whitespace-nowrap border border-gold-500/50 bg-gold-500/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-gold-300">
                    ✓ verificado
                  </span>
                )}
              </div>
              {(profile.city || profile.state) && (
                <p className="text-sm text-ink-300">
                  {profile.city}
                  {profile.city && profile.state ? ", " : ""}
                  {profile.state}
                </p>
              )}
              {profile.is_banned && (
                <span className="mt-1 inline-block rounded bg-red-400/10 px-2 py-0.5 text-xs font-medium text-red-300">
                  Usuário banido por violar as regras da comunidade
                </span>
              )}
            </div>
          </div>

          {!isOwnProfile && user && (
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <a
                href={`/transacoes/nova?vendedor=${profile.id}`}
                className="inline-block bg-gold-500 px-4 py-2 text-center font-medium text-ink-950 transition hover:bg-gold-400"
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

        {profile.bio && <p className="relative mt-4 text-ink-200">{profile.bio}</p>}

        <p className="relative mt-3 text-sm text-ink-400">{memberSince(profile.created_at)}</p>

        {profile.brands.length > 0 && (
          <div className="relative mt-3 flex flex-wrap gap-2">
            {profile.brands.map((brand) => (
              <span
                key={brand}
                className="border border-ink-600 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-300"
              >
                {brand}
              </span>
            ))}
          </div>
        )}

        <div className="relative mt-6 grid grid-cols-2 gap-4 border-t border-ink-700 pt-6 sm:grid-cols-3">
          <Stat label="Nota média">
            <StarRating rating={profile.average_rating} reviewsCount={profile.reviews_count} />
          </Stat>
          <Stat label="Score de confiabilidade">
            <TrustScoreBadge score={profile.trust_score} reviewsCount={profile.reviews_count} />
          </Stat>
          <Stat label="Recomendações">
            <span className="text-xl font-bold text-ink-50">👍 {profile.recommendations_count}</span>
          </Stat>
          <Stat label="Vendas concluídas">
            <span className="text-xl font-bold text-ink-50">{profile.completed_sales_count}</span>
          </Stat>
          <Stat label="Compras concluídas">
            <span className="text-xl font-bold text-ink-50">{profile.completed_purchases_count}</span>
          </Stat>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-lg font-light text-ink-50">Histórico de avaliações</h2>
        <ReviewList reviews={reviews ?? []} />
      </section>

      {!isOwnProfile && user && (
        <section>
          <h2 className="mb-4 font-serif text-lg font-light text-ink-50">Algo errado?</h2>
          <ReportForm reportedId={profile.id} reportedName={profile.full_name} currentUserId={user.id} />
        </section>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-400">{label}</p>
      {children}
    </div>
  );
}
