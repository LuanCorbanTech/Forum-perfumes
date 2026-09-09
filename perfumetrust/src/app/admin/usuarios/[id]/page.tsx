import Link from "next/link";
import { notFound } from "next/navigation";
import type { Profile, ProfileKyc } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

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
        </p>
      </div>

      {kyc ? (
        <div className={`grid gap-3 ${isDigital ? "grid-cols-2" : "grid-cols-3"} max-w-2xl`}>
          <PhotoSlot label={isDigital ? "Documento (PDF/único)" : "Documento (frente)"} url={frontUrl} />
          {!isDigital && <PhotoSlot label="Documento (verso)" url={backUrl} />}
          <PhotoSlot label="Selfie" url={selfieUrl} />
        </div>
      ) : (
        <p className="text-[13px] font-normal italic text-[#8A8F98]">
          Essa pessoa ainda não enviou documento nem selfie.
        </p>
      )}
    </div>
  );
}

function PhotoSlot({ label, url }: { label: string; url: string | null }) {
  const isPdf = !!url && url.split("?")[0].toLowerCase().endsWith(".pdf");

  return (
    <div>
      <p className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">{label}</p>
      {url ? (
        isPdf ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border border-sand-300 bg-sand text-[11px] font-medium text-[#5B6470] hover:border-dourado hover:text-dourado-dark"
          >
            <span className="text-xl">📄</span>
            Abrir PDF
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={label} className="h-32 w-full rounded-lg border border-sand-300 object-cover" />
          </a>
        )
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-sand-400 text-[10px] text-[#8A8F98]">
          Sem foto
        </div>
      )}
    </div>
  );
}
