import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/server";
import { normalizeProfile } from "@/lib/normalizeProfile";
import type { Profile } from "@/lib/types";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function BuscaPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let results: Profile[] = [];
  if (q && q.trim()) {
    const term = q.trim();
    // Busca por nome (ilike) ou telefone (contém dígitos informados)
    const digits = term.replace(/\D/g, "");
    const orFilter = digits.length >= 4
      ? `full_name.ilike.%${term}%,phone.ilike.%${digits}%`
      : `full_name.ilike.%${term}%`;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(orFilter)
      .order("trust_score", { ascending: false })
      .limit(30)
      .returns<Profile[]>();

    results = (data ?? []).map(normalizeProfile);
  }

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Busca</p>
      <h1 className="mb-6 font-serif text-4xl font-medium leading-none text-obsidian-900">
        Procurar um membro
      </h1>
      <SearchBar />

      {q ? (
        results.length > 0 ? (
          <>
            <p className="mb-5 mt-7 text-xs font-normal text-[#5B6470]">
              {results.length === 1 ? "1 resultado" : `${results.length} resultados`} para{" "}
              <span className="font-medium text-obsidian-900">&ldquo;{q}&rdquo;</span>
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((profile) => {
                const starPct = Math.min(100, Math.max(0, (profile.average_rating / 5) * 100));
                return (
                  <Link
                    key={profile.id}
                    href={`/perfil/${profile.id}`}
                    className="flex items-start gap-3.5 rounded-card border border-sand-300 bg-white p-[18px] transition-colors hover:border-dourado"
                  >
                    <Avatar fullName={profile.full_name} avatarUrl={profile.avatar_url} size={44} variant="dark-square" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15.5px] font-semibold leading-tight text-obsidian-900">
                        {profile.full_name}
                      </span>
                      <span className="mt-1 block text-[11px] font-normal text-[#8A8F98]">
                        {profile.city ?? "Local não informado"} ·{" "}
                        {profile.reviews_count === 1 ? "1 avaliação" : `${profile.reviews_count} avaliações`}
                      </span>
                      <span className="mt-2.5 flex items-center gap-2.5">
                        <span className="font-serif text-2xl font-semibold leading-none text-dourado">
                          {profile.average_rating.toFixed(1).replace(".", ",")}
                        </span>
                        <span className="relative inline-block w-max text-xs leading-none tracking-[0.02em]" aria-hidden="true">
                          <span className="text-[#E2DCD1]">★★★★★</span>
                          <span
                            className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-dourado"
                            style={{ width: `${starPct}%` }}
                          >
                            ★★★★★
                          </span>
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <p className="mt-7 text-[#5B6470]">
            Nenhum membro encontrado para &ldquo;{q}&rdquo;. Verifique o nome ou telefone informado.
          </p>
        )
      ) : (
        <p className="mt-7 text-[#5B6470]">Digite um nome ou telefone para começar a busca.</p>
      )}
    </div>
  );
}
