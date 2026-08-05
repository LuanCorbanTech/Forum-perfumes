import { notFound } from "next/navigation";
import { StarRating } from "@/components/StarRating";
import { TrustScoreBadge } from "@/components/TrustScoreBadge";
import { ReviewList } from "@/components/ReviewList";
import { ReportForm } from "@/components/ReportForm";
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

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
              {(profile.city || profile.state) && (
                <p className="text-sm text-gray-500">
                  {profile.city}
                  {profile.city && profile.state ? ", " : ""}
                  {profile.state}
                </p>
              )}
              {profile.is_banned && (
                <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  Usuário banido por violar as regras da comunidade
                </span>
              )}
            </div>
          </div>

          {!isOwnProfile && user && (
            <a
              href={`/transacoes/nova?vendedor=${profile.id}`}
              className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-center font-medium text-white hover:bg-brand-700"
            >
              Registrar transação
            </a>
          )}
        </div>

        {profile.bio && <p className="mt-4 text-gray-600">{profile.bio}</p>}

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-3">
          <Stat label="Nota média">
            <StarRating rating={profile.average_rating} reviewsCount={profile.reviews_count} />
          </Stat>
          <Stat label="Vendas concluídas">
            <span className="text-xl font-bold text-gray-900">{profile.completed_sales_count}</span>
          </Stat>
          <Stat label="Score de confiabilidade">
            <TrustScoreBadge score={profile.trust_score} reviewsCount={profile.reviews_count} />
          </Stat>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Histórico de avaliações</h2>
        <ReviewList reviews={reviews ?? []} />
      </section>

      {!isOwnProfile && user && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Algo errado?</h2>
          <ReportForm reportedId={profile.id} reportedName={profile.full_name} currentUserId={user.id} />
        </section>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{label}</p>
      {children}
    </div>
  );
}
