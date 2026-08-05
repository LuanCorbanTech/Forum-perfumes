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
        <h1 className="font-serif text-2xl font-light text-ink-50">Transação</h1>
        <p className="text-sm text-ink-400">Registrada em {new Date(transaction.created_at).toLocaleDateString("pt-BR")}</p>
      </div>

      <div className="space-y-2 rounded-xl border border-ink-700 bg-ink-800/60 p-5">
        <Row label="Item">{transaction.item_description}</Row>
        <Row label="Valor">
          {transaction.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Row>
        <Row label="Comprador">
          <Link href={`/perfil/${buyer?.id}`} className="text-gold-300 hover:underline">
            {buyer?.full_name}
          </Link>
        </Row>
        <Row label="Vendedor">
          <Link href={`/perfil/${seller?.id}`} className="text-gold-300 hover:underline">
            {seller?.full_name}
          </Link>
        </Row>
        <Row label="Status">
          <span className="font-medium text-ink-50">{STATUS_LABELS[transaction.status]}</span>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-700 py-2 text-sm last:border-0">
      <span className="text-ink-400">{label}</span>
      <span className="text-right text-ink-100">{children}</span>
    </div>
  );
}
