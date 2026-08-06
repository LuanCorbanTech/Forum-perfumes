import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { TransactionActions } from "@/components/TransactionActions";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Transaction } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando confirmação de ambos",
  buyer_confirmed: "Comprador confirmou — falta o vendedor",
  seller_confirmed: "Vendedor confirmou — falta o comprador",
  completed: "Concluída ✓",
  cancelled: "Cancelada",
  disputed: "Em disputa",
};

export default async function TransacaoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/transacoes/${id}`);

  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single<Transaction>();

  if (!transaction) notFound();

  const isParticipant = user.id === transaction.buyer_id || user.id === transaction.seller_id;
  if (!isParticipant) notFound();

  const [{ data: buyer }, { data: seller }, { data: myReview }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", transaction.buyer_id).single<Profile>(),
    supabase.from("profiles").select("id, full_name").eq("id", transaction.seller_id).single<Profile>(),
    supabase
      .from("reviews")
      .select("id")
      .eq("transaction_id", transaction.id)
      .eq("reviewer_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Transação</p>
        <h1 className="font-serif text-3xl font-medium leading-none text-obsidian-900">Detalhes</h1>
        <p className="mt-2 text-[13px] font-normal text-[#8A8F98]">
          Registrada em {new Date(transaction.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="rounded-card border border-sand-300 bg-white p-5">
        <Row label="Item">{transaction.item_description}</Row>
        <Row label="Valor">
          {transaction.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Row>
        <Row label="Comprador">
          <Link href={`/perfil/${buyer?.id}`} className="border-b border-dourado-tint-border text-dourado-dark">
            {buyer?.full_name}
          </Link>
        </Row>
        <Row label="Vendedor">
          <Link href={`/perfil/${seller?.id}`} className="border-b border-dourado-tint-border text-dourado-dark">
            {seller?.full_name}
          </Link>
        </Row>
        <Row label="Status" last>
          <span className="font-semibold text-obsidian-900">{STATUS_LABELS[transaction.status]}</span>
        </Row>
      </div>

      <TransactionActions
        transaction={transaction}
        currentUserId={user.id}
        myReviewAlreadyExists={!!myReview}
      />
    </div>
  );
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-2.5 text-sm ${last ? "" : "border-b border-sand-200"}`}>
      <span className="text-[#8A8F98]">{label}</span>
      <span className="text-right text-obsidian-900">{children}</span>
    </div>
  );
}
