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
      <h1 className="text-2xl font-bold">Usuários</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou telefone..."
          className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
        />
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-500">
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
              <tr key={user.id} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/perfil/${user.id}`} className="font-medium text-brand-700 hover:underline">
                    {user.full_name}
                  </Link>
                  {user.is_admin && (
                    <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-xs text-brand-700">admin</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{user.phone ?? "—"}</td>
                <td className="px-4 py-3">{user.trust_score}</td>
                <td className="px-4 py-3">{user.completed_sales_count}</td>
                <td className="px-4 py-3">
                  {user.is_banned ? (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Banido</span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Ativo</span>
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
