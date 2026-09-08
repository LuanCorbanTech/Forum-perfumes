import Link from "next/link";
import type { ApprovalStatus } from "@/lib/types";

// Mensagem amigável mostrada no lugar de um formulário (transação nova,
// avaliação, denúncia) quando quem está tentando agir ainda não teve o
// cadastro aprovado. Sem isso, a pessoa via um erro cru do Postgres
// ("new row violates row-level security policy...") — o bloqueio em si
// já existia no banco (migration_003/007), só faltava avisar direito.
export function VerificationGate({ status }: { status: ApprovalStatus }) {
  const isRejected = status === "rejected";

  return (
    <div
      className={`rounded-card border p-5 ${
        isRejected ? "border-crimson-tint-border bg-crimson-tint" : "border-dourado-tint-border bg-dourado-tint"
      }`}
    >
      <p className={`text-sm font-semibold ${isRejected ? "text-crimson" : "text-dourado-dark"}`}>
        {isRejected
          ? "Sua verificação de identidade foi recusada."
          : "Seu cadastro ainda está aguardando verificação de identidade."}
      </p>
      <p className={`mt-1.5 text-[13px] font-normal leading-relaxed ${isRejected ? "text-crimson" : "text-dourado-dark"}`}>
        Pra registrar transações, avaliar ou denunciar, primeiro envie (ou reenvie) uma foto do seu
        documento e uma selfie para um moderador conferir.
      </p>
      <Link
        href="/conta/verificacao"
        className={`mt-3.5 inline-block rounded-lg px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors ${
          isRejected ? "bg-crimson hover:bg-[#9c2530]" : "bg-obsidian-900 hover:bg-dourado hover:text-obsidian-900"
        }`}
      >
        {isRejected ? "Reenviar fotos" : "Enviar documento e selfie"}
      </Link>
    </div>
  );
}
