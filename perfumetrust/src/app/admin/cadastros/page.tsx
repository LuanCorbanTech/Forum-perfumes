import Link from "next/link";
import { SignupReviewActions } from "@/components/admin/SignupReviewActions";
import { PhotoSlot } from "@/components/admin/PhotoSlot";
import { ensureCorrectContentType } from "./actions";
import type { Profile, ProfileKyc } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-dourado-tint border-dourado-tint-border text-dourado-dark",
  rejected: "bg-crimson-tint border-crimson-tint-border text-crimson",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  rejected: "Recusado",
};

// Assina uma URL temporária pro admin ver a foto enviada — o bucket
// "verification-docs" é privado (ver migration_007), então getPublicUrl
// não funciona aqui. O ARQUIVO em si nunca expira nem some do bucket;
// só o LINK de visualização tem validade, e ela é gerada de novo (com
// mais tempo) toda vez que esta página é aberta ou atualizada, então o
// admin nunca fica sem conseguir ver a foto por ter demorado a revisar.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export default async function AdminCadastrosPage() {
  const supabase = await createClient();

  // Reaparece aqui tanto quem nunca foi revisado (pending) quanto quem foi
  // recusado e reenviou as fotos (rejected) — ninguém precisa de um status
  // novo pra isso, só não filtramos por "approved".
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .neq("approval_status", "approved")
    .order("approval_status", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<Profile[]>();

  const kycByProfile = new Map<string, ProfileKyc>();
  if (profiles && profiles.length > 0) {
    const { data: kycRows } = await supabase
      .from("profile_kyc")
      .select("*")
      .in(
        "profile_id",
        profiles.map((p) => p.id)
      )
      .returns<ProfileKyc[]>();
    kycRows?.forEach((row) => kycByProfile.set(row.profile_id, row));
  }

  const candidates = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const kyc = kycByProfile.get(profile.id) ?? null;
      const documentType = kyc?.document_type ?? "fisico";

      // Corrige sozinho qualquer foto com Content-Type errado (ícone
      // quebrado) antes de gerar os links — sem precisar de botão manual.
      await ensureCorrectContentType([
        kyc?.document_front_path ?? null,
        kyc?.document_back_path ?? null,
        kyc?.selfie_path ?? null,
      ]);

      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        signedUrl(supabase, kyc?.document_front_path ?? null),
        signedUrl(supabase, kyc?.document_back_path ?? null),
        signedUrl(supabase, kyc?.selfie_path ?? null),
      ]);
      return {
        profile,
        documentType,
        frontUrl,
        backUrl,
        selfieUrl,
        submitted: !!(
          kyc?.document_front_path &&
          kyc?.selfie_path &&
          (documentType === "digital" || kyc?.document_back_path)
        ),
      };
    })
  );

  const pendentes = candidates.filter((c) => c.profile.approval_status === "pending").length;
  const semFotos = candidates.filter((c) => !c.submitted).length;

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Administração</p>
      <h1 className="mb-7 font-serif text-4xl font-medium leading-none text-obsidian-900">Cadastros</h1>

      <div className="mb-8 flex flex-wrap gap-8">
        <Counter value={pendentes} label="aguardando análise" />
        <Counter value={semFotos} label="sem fotos enviadas" />
      </div>

      {candidates.length > 0 ? (
        <ul className="grid gap-4">
          {candidates.map(({ profile, submitted, documentType, frontUrl, backUrl, selfieUrl }) => (
            <li key={profile.id} className="rounded-card border border-sand-300 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-baseline gap-2 text-[13px] font-normal text-[#8A8F98]">
                  <Link
                    href={`/perfil/${profile.id}`}
                    className="border-b border-dourado-tint-border text-[15.5px] font-semibold text-obsidian-900"
                  >
                    {profile.full_name}
                  </Link>
                  {profile.phone && (
                    <>
                      <span className="text-sand-400">|</span>
                      <span>{profile.phone}</span>
                    </>
                  )}
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium ${
                    STATUS_STYLE[profile.approval_status] ?? STATUS_STYLE.pending
                  }`}
                >
                  {STATUS_LABELS[profile.approval_status] ?? "Pendente"}
                </span>
              </div>

              {submitted ? (
                <div className={`mt-4 grid gap-3 ${documentType === "digital" ? "grid-cols-2" : "grid-cols-3"}`}>
                  <PhotoSlot
                    label={documentType === "digital" ? "Documento (PDF/único)" : "Documento (frente)"}
                    url={frontUrl}
                  />
                  {documentType === "fisico" && <PhotoSlot label="Documento (verso)" url={backUrl} />}
                  <PhotoSlot label="Selfie" url={selfieUrl} />
                </div>
              ) : (
                <p className="mt-4 text-[13px] font-normal italic text-[#8A8F98]">
                  Ainda não enviou o(s) documento(s) e a selfie de verificação.
                </p>
              )}

              <SignupReviewActions userId={profile.id} canApprove={submitted} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[#8A8F98]">Nenhum cadastro aguardando revisão.</p>
      )}
    </div>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className={`text-[28px] font-semibold leading-none ${value > 0 ? "text-crimson" : "text-obsidian-900"}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[9.5px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">{label}</p>
    </div>
  );
}

