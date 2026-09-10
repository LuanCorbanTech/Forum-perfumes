import Link from "next/link";
import { notFound } from "next/navigation";
import type { Profile, ProfileKyc } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { PhotoSlot } from "@/components/admin/PhotoSlot";
import { PromoteAdminButton } from "@/components/admin/PromoteAdminButton";
import { EditCredentialsForm } from "@/components/admin/EditCredentialsForm";

// Documento e selfie continuam guardados mesmo depois do cadastro
// aprovado (nunca são apagados) — esta tela existe justamente pra dar ao
// admin um jeito de ver isso de novo mais tarde, por exemplo se precisar
// levar à polícia por causa de uma fraude. Antes desta página, os
// documentos só apareciam em /admin/cadastros, que some da lista assim
// que o cadastro é aprovado.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
};

export default async function AdminUsuarioDocumentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single<Profile>();
  if (!profile) notFound();

  const { data: kyc } = await supabase
    .from("profile_kyc")
    .select("*")
    .eq("profile_id", id)
    .maybeSingle<ProfileKyc>();

  const [frontUrl, backUrl, selfieUrl] = await Promise.all([
    signedUrl(supabase, kyc?.document_front_path ?? null),
    signedUrl(supabase, kyc?.document_back_path ?? null),
    signedUrl(supabase, kyc?.selfie_path ?? null),
  ]);

  const isDigital = kyc?.document_type === "digital";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/usuarios" className="text-[12.5px] font-medium text-dourado-dark">
          ← Voltar pra Usuários
        </Link>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Administração</p>
        <h1 className="mb-2 font-serif text-4xl font-medium leading-none text-obsidian-900">
          {profile.full_name}
        </h1>
        <p className="text-[13px] font-normal text-[#8A8F98]">
          {profile.phone && <>{profile.phone} · </>}
          {profile.email && <>{profile.email} · </>}
          {kyc?.cpf && <>CPF {kyc.cpf} · </>}
          Status: {STATUS_LABELS[profile.approval_status] ?? profile.approval_status}
          {profile.is_admin && <> · Administrador</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {!profile.is_admin && <PromoteAdminButton userId={profile.id} fullName={profile.full_name} />}
        <EditCredentialsForm
          userId={profile.id}
          currentEmail={profile.email}
          currentUsername={profile.username}
        />
      </div>

      {kyc ? (
        <div className={`grid gap-3 ${isDigital ? "grid-cols-2" : "grid-cols-3"} max-w-2xl`}>
          <PhotoSlot
            label={isDigital ? "Documento (PDF/único)" : "Documento (frente)"}
            url={frontUrl}
            heightClassName="h-32"
          />
          {!isDigital && <PhotoSlot label="Documento (verso)" url={backUrl} heightClassName="h-32" />}
          <PhotoSlot label="Selfie" url={selfieUrl} heightClassName="h-32" />
        </div>
      ) : (
        <p className="text-[13px] font-normal italic text-[#8A8F98]">
          Essa pessoa ainda não enviou documento nem selfie.
        </p>
      )}
    </div>
  );
}
