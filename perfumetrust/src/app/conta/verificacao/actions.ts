"use server";

import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/getClientIp";
import { CURRENT_TERMS_VERSION } from "@/lib/legalVersion";

interface RecordConsentResult {
  ok: boolean;
  error?: string;
}

// VerificacaoForm.tsx (reenvio de documento/selfie após recusa) faz o
// upload e o upsert principal de profile_kyc direto do navegador (client
// Supabase) — não existia nenhuma Server Action pra essa tela. Só a parte
// do registro de consentimento (LGPD art. 8º) precisa passar pelo
// servidor, porque data/hora e IP confiáveis só dá pra capturar aqui (o
// navegador poderia mandar um relógio errado ou nenhum IP de verdade).
// Chamada logo depois do upsert principal (que já gravou o resto:
// document_type, caminhos das fotos etc.) — atualiza só ip_address e
// re-carimba terms_accepted_at com o horário do servidor.
export async function recordVerificationConsent(): Promise<RecordConsentResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login de novo." };

  const { error } = await supabase
    .from("profile_kyc")
    .update({
      terms_accepted_at: new Date().toISOString(),
      ip_address: await getClientIp(),
      terms_version: CURRENT_TERMS_VERSION,
    })
    .eq("profile_id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
