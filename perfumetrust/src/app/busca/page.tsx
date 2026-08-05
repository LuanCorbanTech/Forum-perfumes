import { SearchBar } from "@/components/SearchBar";
import { SellerCard } from "@/components/SellerCard";
import { createClient } from "@/lib/supabase/server";
import { isVerifiedSeller } from "@/lib/trustScore";
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
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-light text-ink-50">Buscar membro</h1>
      <SearchBar />

      {q ? (
        results.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((profile) => (
              <SellerCard key={profile.id} profile={profile} verified={isVerifiedSeller(profile)} />
            ))}
          </div>
        ) : (
          <p className="text-ink-300">
            Nenhum membro encontrado para &quot;{q}&quot;. Verifique o nome ou telefone informado.
          </p>
        )
      ) : (
        <p className="text-ink-300">Digite um nome ou telefone para começar a busca.</p>
      )}
    </div>
  );
}
