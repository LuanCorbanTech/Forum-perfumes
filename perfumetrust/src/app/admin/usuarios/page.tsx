import Link from "next/link";
import { UserBanActions } from "@/components/admin/UserBanActions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsuariosPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let users: Profile[] = [];

  if (q && q.trim()) {
    // Duas buscas separadas (em vez de um único .or() com o texto digitado
    // interpolado cru) porque a sintaxe de filtro do PostgREST usa vírgula
    // pra separar condições e parênteses pra agrupar — se o admin digitar
    // um telefone com pontuação (ex.: "(11) 99999-8888" ou colar algo com
    // vírgula), o filtro combinado quebrava e a busca voltava vazia sem
    // erro nenhum aparecendo. Telefone é sempre guardado em E.164
    // (+55DDDNNNNNNNNN), então comparamos só os dígitos.
    const digits = q.replace(/\D/g, "");

    const [byName, byPhone] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .ilike("full_name", `%${q.trim()}%`)
        .order("created_at", { ascending: false })
        .limit(50)
        .returns<Profile[]>(),
      digits.length >= 4
        ? supabase
            .from("profiles")
            .select("*")
            .ilike("phone", `%${digits}%`)
            .order("created_at", { ascending: false })
            .limit(50)
            .returns<Profile[]>()
        : Promise.resolve({ data: [] as Profile[] }),
    ]);

    const merged = new Map<string, Profile>();
    for (const u of byName.data ?? []) merged.set(u.id, u);
    for (const u of byPhone.data ?? []) merged.set(u.id, u);
    users = Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } else {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Profile[]>();
    users = data ?? [];
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          administração
        </p>
        <h1 className="font-serif text-[32px] font-medium leading-none text-obsidian-900">Usuários</h1>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou telefone..."
          className="flex-1 rounded-lg border border-sand-400 bg-white p-2.5 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
        <button className="rounded-lg bg-obsidian-900 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-white transition-colors hover:bg-dourado hover:text-obsidian-900">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-card border border-sand-300 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-sand-300 bg-sand text-left text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Vendas</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {(users ?? []).map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <Link href={`/perfil/${user.id}`} className="border-b border-dourado-tint-border font-medium text-dourado-dark">
                    {user.full_name}
                  </Link>
                  {user.is_admin && (
                    <span className="ml-2 rounded-full border border-dourado-tint-border bg-dourado-tint px-1.5 py-0.5 text-[10px] font-medium text-dourado-dark">
                      admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#8A8F98]">{user.phone ?? "—"}</td>
                <td className="px-4 py-3 text-[#3C434C]">{user.trust_score}</td>
                <td className="px-4 py-3 text-[#3C434C]">{user.completed_sales_count}</td>
                <td className="px-4 py-3">
                  {user.is_banned ? (
                    <span className="rounded-full border border-crimson-tint-border bg-crimson-tint px-2 py-0.5 text-[11px] font-medium text-crimson">
                      Banido
                    </span>
                  ) : (
                    <span className="rounded-full border border-verde-tint-border bg-verde-tint px-2 py-0.5 text-[11px] font-medium text-verde">
                      Ativo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/admin/usuarios/${user.id}`}
                      className="whitespace-nowrap text-[12px] font-medium text-dourado-dark"
                    >
                      Ver documentos
                    </Link>
                    {!user.is_admin && <UserBanActions userId={user.id} isBanned={user.is_banned} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
