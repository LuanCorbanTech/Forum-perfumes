import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// O middleware (src/middleware.ts) já garante que só admins chegam aqui.
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [{ count: pendingReports }, { count: totalUsers }, { count: bannedUsers }, { count: totalTransactions }] =
    await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
      supabase.from("transactions").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl font-light text-ink-50">Painel administrativo</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Denúncias pendentes" value={pendingReports ?? 0} highlight />
        <Metric label="Usuários" value={totalUsers ?? 0} />
        <Metric label="Usuários banidos" value={bannedUsers ?? 0} />
        <Metric label="Transações" value={totalTransactions ?? 0} />
      </div>

      <div className="flex gap-4">
        <Link
          href="/admin/denuncias"
          className="rounded-lg bg-gold-500 px-4 py-2 font-medium text-ink-950 transition hover:bg-gold-400"
        >
          Revisar denúncias
        </Link>
        <Link
          href="/admin/usuarios"
          className="rounded-lg border border-ink-600 px-4 py-2 font-medium text-ink-200 transition hover:bg-ink-800"
        >
          Gerenciar usuários
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight && value > 0 ? "border-red-400/30 bg-red-400/10" : "border-ink-700 bg-ink-800/60"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight && value > 0 ? "text-red-300" : "text-ink-50"}`}>{value}</p>
    </div>
  );
}
