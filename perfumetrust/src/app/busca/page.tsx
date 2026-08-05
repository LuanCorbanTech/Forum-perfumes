import { SearchBar } from "@/components/SearchBar";
import { SellerCard } from "@/components/SellerCard";
import { createClient } from "@/lib/supabase/server";
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

    results = data ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buscar vendedor</h1>
      <SearchBar />

      {q ? (
        results.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((profile) => (
              <SellerCard key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Nenhum vendedor encontrado para &quot;{q}&quot;. Verifique o nome ou telefone informado.
          </p>
        )
      ) : (
        <p className="text-gray-500">Digite um nome ou telefone para começar a busca.</p>
      )}
    </div>
  );
}
