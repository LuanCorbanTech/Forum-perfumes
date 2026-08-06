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

  let query = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (q && q.trim()) {
    const digits = q.replace(/\D/g, "");
    query = query.or(
      digits.length >= 4 ? `full_name.ilike.%${q}%,phone.ilike.%${digits}%` : `full_name.ilike.%${q}%`
    );
  }

  const { data: users } = await query.returns<Profile[]>();

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
                  {!user.is_admin && <UserBanActions userId={user.id} isBanned={user.is_banned} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
