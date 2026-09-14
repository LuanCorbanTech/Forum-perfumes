import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

// "Minhas transações": antes desta página, quem registrava uma transação
// (o comprador, em NovaTransacaoForm.tsx) era levado direto pra
// /transacoes/[id] — mas a OUTRA parte (o vendedor recomendado) nunca
// tinha como saber que precisava confirmar, porque não existia nenhum
// lugar no site listando as transações de alguém. Esta tela resolve
// isso: lista tudo que o usuário logado participa (como comprador ou
// vendedor), destacando primeiro o que ainda espera a confirmação dele.
const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando confirmação de ambos",
  buyer_confirmed: "Comprador confirmou",
  seller_confirmed: "Vendedor confirmou",
  completed: "Concluída ✓",
  cancelled: "Cancelada",
  disputed: "Em disputa",
};

export default async function TransacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/transacoes");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<Transaction[]>();

  const otherIds = Array.from(
    new Set((transactions ?? []).map((t) => (t.buyer_id === user.id ? t.seller_id : t.buyer_id)))
  );

  const namesById = new Map<string, string>();
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", otherIds);
    profiles?.forEach((p) => namesById.set(p.id, p.full_name));
  }

  const enriched = (transactions ?? []).map((t) => {
    const isBuyer = t.buyer_id === user.id;
    const iConfirmed = isBuyer ? !!t.buyer_confirmed_at : !!t.seller_confirmed_at;
    const otherId = isBuyer ? t.seller_id : t.buyer_id;
    const needsMyAction = !iConfirmed && t.status !== "completed" && t.status !== "cancelled";
    return { t, isBuyer, otherName: namesById.get(otherId) ?? "—", needsMyAction };
  });

  const pendentes = enriched.filter((e) => e.needsMyAction);
  const resto = enriched.filter((e) => !e.needsMyAction);

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Transações</p>
          <h1 className="font-serif text-4xl font-medium leading-none text-obsidian-900">Minhas transações</h1>
        </div>
        <Link
          href="/transacoes/nova"
          className="whitespace-nowrap rounded-lg bg-obsidian-900 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.02em] text-white transition-colors hover:bg-dourado hover:text-obsidian-900"
        >
          Registrar nova
        </Link>
      </div>

      {pendentes.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-crimson">
            Aguardando sua confirmação ({pendentes.length})
          </p>
          <ul className="grid gap-3">
            {pendentes.map(({ t, isBuyer, otherName }) => (
              <TransactionRow key={t.id} t={t} isBuyer={isBuyer} otherName={otherName} highlight />
            ))}
          </ul>
        </div>
      )}

      {resto.length > 0 ? (
        <div>
          {pendentes.length > 0 && (
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
              Outras transações
            </p>
          )}
          <ul className="grid gap-3">
            {resto.map(({ t, isBuyer, otherName }) => (
              <TransactionRow key={t.id} t={t} isBuyer={isBuyer} otherName={otherName} />
            ))}
          </ul>
        </div>
      ) : (
        pendentes.length === 0 && (
          <p className="text-[#8A8F98]">
            Você ainda não tem nenhuma transação registrada.{" "}
            <Link href="/transacoes/nova" className="border-b border-dourado-tint-border text-dourado-dark">
              Registrar a primeira
            </Link>
            .
          </p>
        )
      )}
    </div>
  );
}

function TransactionRow({
  t,
  isBuyer,
  otherName,
  highlight,
}: {
  t: Transaction;
  isBuyer: boolean;
  otherName: string;
  highlight?: boolean;
}) {
  return (
    <li>
      <Link
        href={`/transacoes/${t.id}`}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-card border p-4 transition-colors hover:border-dourado ${
          highlight ? "border-dourado-tint-border bg-dourado-tint" : "border-sand-300 bg-white"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-obsidian-900">{t.item_description}</p>
          <p className="mt-0.5 text-[12.5px] font-normal text-[#8A8F98]">
            {isBuyer ? "Vendedor" : "Comprador"}: {otherName} ·{" "}
            {t.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full border border-sand-400 bg-sand px-2.5 py-1 text-[10.5px] font-medium text-[#5B6470]">
          {STATUS_LABELS[t.status] ?? t.status}
        </span>
      </Link>
    </li>
  );
}
