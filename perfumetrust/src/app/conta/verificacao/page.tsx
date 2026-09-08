import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerificacaoForm } from "@/components/VerificacaoForm";
import type { Profile, ProfileKyc } from "@/lib/types";

// Assina uma URL temporária pro dono ver a própria foto já enviada — o
// bucket "verification-docs" é privado, então getPublicUrl não funciona
// aqui (ver migration_007). O ARQUIVO em si nunca expira; só o link de
// visualização tem validade, renovada a cada vez que a página é aberta.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export default async function VerificacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/conta/verificacao");

  const [{ data: profile }, { data: kyc }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.from("profile_kyc").select("*").eq("profile_id", user.id).maybeSingle<ProfileKyc>(),
  ]);

  let rejectionReason: string | null = null;
  if (profile?.approval_status === "rejected") {
    const { data: lastAction } = await supabase
      .from("admin_actions")
      .select("notes")
      .eq("target_user_id", user.id)
      .eq("action_type", "signup_rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    rejectionReason = lastAction?.notes ?? null;
  }

  const [frontUrl, backUrl, selfieUrl] = await Promise.all([
    signedUrl(supabase, kyc?.document_front_path ?? null),
    signedUrl(supabase, kyc?.document_back_path ?? null),
    signedUrl(supabase, kyc?.selfie_path ?? null),
  ]);

  const alreadySubmitted = !!(kyc?.document_front_path && kyc?.document_back_path && kyc?.selfie_path);

  return (
    <div className="mx-auto max-w-xl space-y-7">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          Verificação de identidade
        </p>
        <h1 className="font-serif text-[32px] font-medium leading-none text-obsidian-900">
          Confirme quem você é
        </h1>
        <p className="mt-3 text-[14.5px] font-normal leading-relaxed text-[#5B6470]">
          Pra liberar seu cadastro (registrar transação, avaliar e denunciar), pedimos uma foto do
          seu documento (frente e verso) e uma selfie. Um moderador confere manualmente e libera seu
          acesso — não usamos reconhecimento facial automático nem guardamos isso em nenhum lugar
          público: só você e um admin conseguem ver essas fotos.
        </p>
      </div>

      {profile?.approval_status === "approved" && (
        <p className="rounded-lg border border-verde-tint-border bg-verde-tint p-4 text-sm text-verde">
          Sua verificação já foi aprovada. Você já pode registrar transações, avaliar e denunciar
          normalmente.
        </p>
      )}

      {profile?.approval_status === "rejected" && (
        <div className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-4">
          <p className="text-sm font-semibold text-crimson">Sua verificação anterior foi recusada.</p>
          {rejectionReason && (
            <p className="mt-1.5 text-[13px] font-normal text-crimson">Motivo: {rejectionReason}</p>
          )}
          <p className="mt-1.5 text-[13px] font-normal text-crimson">
            Envie as fotos novamente abaixo para uma nova análise.
          </p>
        </div>
      )}

      {profile?.approval_status === "pending" && alreadySubmitted && (
        <p className="rounded-lg border border-dourado-tint-border bg-dourado-tint p-4 text-sm text-dourado-dark">
          Recebemos suas fotos e estão aguardando análise de um moderador. Você pode reenviar
          abaixo se quiser trocar alguma foto.
        </p>
      )}

      <VerificacaoForm
        userId={user.id}
        wasRejected={profile?.approval_status === "rejected"}
        existing={{
          documentFrontUrl: frontUrl,
          documentBackUrl: backUrl,
          selfieUrl: selfieUrl,
          hasFront: !!kyc?.document_front_path,
          hasBack: !!kyc?.document_back_path,
          hasSelfie: !!kyc?.selfie_path,
        }}
      />
    </div>
  );
}
