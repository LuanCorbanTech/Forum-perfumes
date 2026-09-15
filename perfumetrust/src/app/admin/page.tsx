import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// O middleware (src/middleware.ts) já garante que só admins chegam aqui.
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: pendingReports },
    { count: pendingSignups },
    { count: totalUsers },
    { count: bannedUsers },
    { count: totalTransactions },
    { data: openTx },
  ] = await Promise.all([
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_banned", true),
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    // Transações que ainda esperam confirmação de pelo menos um dos lados
    // — dá pra ver de relance se tem muita coisa travada, sem precisar
    // abrir usuário por usuário.
    supabase
      .from("transactions")
      .select("buyer_confirmed_at, seller_confirmed_at")
      .not("status", "in", "(completed,cancelled)"),
  ]);

  const pendingConfirmations = (openTx ?? []).filter(
    (t) => !t.buyer_confirmed_at || !t.seller_confirmed_at
  ).length;

  return (
    <div className="space-y-9">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          Administração
        </p>
        <h1 className="font-serif text-[32px] font-medium leading-none text-obsidian-900">Painel administrativo</h1>
        <p className="mt-2.5 text-[13px] font-normal text-[#8A8F98]">
          Visão geral do que precisa da sua atenção agora e um atalho pra cada área do site.
        </p>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Precisa da sua atenção
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <AttentionCard
            icon="🚩"
            label="Denúncias pendentes"
            value={pendingReports ?? 0}
            href="/admin/denuncias"
            cta="Revisar denúncias"
          />
          <AttentionCard
            icon="🪪"
            label="Cadastros aguardando análise"
            value={pendingSignups ?? 0}
            href="/admin/cadastros"
            cta="Revisar cadastros"
          />
          <AttentionCard
            icon="🔄"
            label="Transações aguardando confirmação"
            value={pendingConfirmations}
            cta="Ainda sem tela dedicada — dá pra ver cada uma em /transacoes/[id]"
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Visão geral
        </p>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
          <OverviewCard icon="👥" label="Usuários" value={totalUsers ?? 0} />
          <OverviewCard icon="🚫" label="Usuários banidos/suspensos" value={bannedUsers ?? 0} />
          <OverviewCard icon="🧾" label="Transações registradas" value={totalTransactions ?? 0} />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Atalhos
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <ShortcutCard
            icon="🚩"
            title="Denúncias"
            description="Analisar denúncias abertas e decidir se são procedentes."
            href="/admin/denuncias"
          />
          <ShortcutCard
            icon="🪪"
            title="Cadastros"
            description="Aprovar ou recusar documento e selfie de quem se cadastrou."
            href="/admin/cadastros"
          />
          <ShortcutCard
            icon="🗂️"
            title="Clientes reprovados"
            description="Consultar cadastros recusados anteriormente (só leitura)."
            href="/admin/reprovados"
          />
          <ShortcutCard
            icon="👥"
            title="Usuários"
            description="Buscar, banir/desbanir e ver documentos de qualquer conta."
            href="/admin/usuarios"
          />
          <ShortcutCard
            icon="🛡️"
            title="Administradores"
            description="Promover uma conta a admin e editar credenciais."
            href="/admin/administradores"
          />
          <ShortcutCard
            icon="⚙️"
            title="Configurações (APIs)"
            description="Chave da Brevo, e-mail remetente e aparência dos e-mails."
            href="/admin/configuracoes"
          />
        </div>
      </div>
    </div>
  );
}

function AttentionCard({
  icon,
  label,
  value,
  href,
  cta,
}: {
  icon: string;
  label: string;
  value: number;
  href?: string;
  cta: string;
}) {
  const active = value > 0;
  const cardClass = `block rounded-card border p-4 transition-colors ${
    active
      ? "border-crimson-tint-border bg-crimson-tint" + (href ? " hover:border-crimson" : "")
      : "border-sand-300 bg-white" + (href ? " hover:border-dourado" : "")
  }`;

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xl" aria-hidden="true">
          {icon}
        </span>
        <span className={`text-[26px] font-semibold leading-none ${active ? "text-crimson" : "text-obsidian-900"}`}>
          {value}
        </span>
      </div>
      <p className="mt-2.5 text-[12px] font-medium text-[#3C434C]">{label}</p>
      <p
        className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.02em] ${
          href ? (active ? "text-crimson" : "text-dourado-dark") : "text-[#8A8F98] normal-case tracking-normal"
        }`}
      >
        {href ? `${cta} →` : cta}
      </p>
    </>
  );

  if (!href) {
    return <div className={cardClass}>{inner}</div>;
  }

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

function OverviewCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-card border border-sand-300 bg-white p-4">
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      <p className="mt-2.5 text-2xl font-semibold leading-none text-obsidian-900">{value}</p>
      <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">{label}</p>
    </div>
  );
}

function ShortcutCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-card border border-sand-300 bg-white p-4 transition-colors hover:border-dourado hover:bg-dourado-tint/40"
    >
      <span className="mt-0.5 text-xl" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-obsidian-900">{title}</span>
        <span className="mt-1 block text-[12px] font-normal leading-relaxed text-[#8A8F98]">{description}</span>
      </span>
    </Link>
  );
}
