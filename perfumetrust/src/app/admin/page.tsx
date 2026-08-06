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
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          administração
        </p>
        <h1 className="font-serif text-[32px] font-medium leading-none text-obsidian-900">Painel administrativo</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Denúncias pendentes" value={pendingReports ?? 0} highlight />
        <Metric label="Usuários" value={totalUsers ?? 0} />
        <Metric label="Usuários banidos" value={bannedUsers ?? 0} />
        <Metric label="Transações" value={totalTransactions ?? 0} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/denuncias"
          className="rounded-lg bg-obsidian-900 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-white transition-colors hover:bg-dourado hover:text-obsidian-900"
        >
          Revisar denúncias
        </Link>
        <Link
          href="/admin/usuarios"
          className="rounded-lg border border-sand-400 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#3C434C] transition-colors hover:border-obsidian-900 hover:text-obsidian-900"
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
      className={`rounded-card border p-4 ${
        highlight && value > 0 ? "border-crimson-tint-border bg-crimson-tint" : "border-sand-300 bg-white"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${highlight && value > 0 ? "text-crimson" : "text-obsidian-900"}`}>
        {value}
      </p>
    </div>
  );
}
