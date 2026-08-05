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
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-light text-ink-50">Usuários</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou telefone..."
          className="flex-1 rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
        />
        <button className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-gold-400">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-800/60">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-700 bg-ink-900/40 text-left text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Vendas</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className="border-b border-ink-700/60 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/perfil/${user.id}`} className="font-medium text-gold-300 hover:underline">
                    {user.full_name}
                  </Link>
                  {user.is_admin && (
                    <span className="ml-2 rounded bg-gold-400/10 px-1.5 py-0.5 text-xs text-gold-300">admin</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-400">{user.phone ?? "—"}</td>
                <td className="px-4 py-3 text-ink-100">{user.trust_score}</td>
                <td className="px-4 py-3 text-ink-100">{user.completed_sales_count}</td>
                <td className="px-4 py-3">
                  {user.is_banned ? (
                    <span className="rounded bg-red-400/10 px-2 py-0.5 text-xs font-medium text-red-300">Banido</span>
                  ) : (
                    <span className="rounded bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">Ativo</span>
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
