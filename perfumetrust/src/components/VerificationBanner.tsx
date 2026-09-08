"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ApprovalStatus } from "@/lib/types";

// Lembrete que aparece em qualquer página do site (renderizado logo abaixo
// do header, ver Navbar.tsx) enquanto o cadastro está pendente/recusado.
// Sem isso, quem saía de /conta/verificacao sem enviar as fotos não via
// mais nenhum aviso até tentar registrar transação/avaliar/denunciar e
// esbarrar no bloqueio (ver VerificationGate.tsx).
export function VerificationBanner({ status }: { status: Extract<ApprovalStatus, "pending" | "rejected"> }) {
  const pathname = usePathname();

  // Já mostra o próprio status em detalhe ali, não precisa duplicar a faixa.
  if (pathname?.startsWith("/conta/verificacao")) return null;

  const isRejected = status === "rejected";

  return (
    <div
      className={`w-full border-b px-4 py-2.5 text-center text-[12.5px] font-medium sm:px-7 ${
        isRejected
          ? "border-crimson-tint-border bg-crimson-tint text-crimson"
          : "border-dourado-tint-border bg-dourado-tint text-dourado-dark"
      }`}
    >
      {isRejected
        ? "Sua verificação de identidade foi recusada."
        : "Seu cadastro está aguardando verificação de identidade (documento + selfie)."}{" "}
      <Link href="/conta/verificacao" className="underline underline-offset-2">
        {isRejected ? "Reenviar fotos" : "Enviar agora"}
      </Link>
    </div>
  );
}
