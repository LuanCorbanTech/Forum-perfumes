import type { RejectedSignup } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

// Arquivo só de consulta (migration_012): quando um cadastro é recusado,
// a conta ativa é apagada de verdade (pra liberar CPF/telefone/e-mail pra
// um cadastro novo) — o que fica aqui é só uma cópia dos dados e
// documentos enviados, pra você lembrar/explicar o motivo depois. Não dá
// pra aprovar ou reverter nada direto desta tela.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}

export default async function AdminReprovadosPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("rejected_signups")
    .select("*")
    .order("rejected_at", { ascending: false })
    .returns<RejectedSignup[]>();

  const entries = await Promise.all(
    (rows ?? []).map(async (row) => {
      const [frontUrl, backUrl, selfieUrl] = await Promise.all([
        signedUrl(supabase, row.document_front_path),
        signedUrl(supabase, row.document_back_path),
        signedUrl(supabase, row.selfie_path),
      ]);
      return { row, frontUrl, backUrl, selfieUrl };
    })
  );

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Administração</p>
      <h1 className="mb-2 font-serif text-4xl font-medium leading-none text-obsidian-900">Clientes reprovados</h1>
      <p className="mb-7 text-[13px] font-normal text-[#8A8F98]">
        Arquivo de consulta — a conta ativa de cada um já foi apagada, então essa pessoa pode se
        cadastrar de novo normalmente. Nada aqui pode ser aprovado ou revertido.
      </p>

      {entries.length > 0 ? (
        <ul className="grid gap-4">
          {entries.map(({ row, frontUrl, backUrl, selfieUrl }) => (
            <li key={row.id} className="rounded-card border border-sand-300 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-baseline gap-2 text-[13px] font-normal text-[#8A8F98]">
                  <span className="text-[15.5px] font-semibold text-obsidian-900">
                    {row.full_name || "Sem nome"}
                  </span>
                  {row.phone && (
                    <>
                      <span className="text-sand-400">|</span>
                      <span>{row.phone}</span>
                    </>
                  )}
                  {row.cpf && (
                    <>
                      <span className="text-sand-400">|</span>
                      <span>CPF {row.cpf}</span>
                    </>
                  )}
                </div>
                <span className="rounded-full border border-crimson-tint-border bg-crimson-tint px-2.5 py-1 text-[10.5px] font-medium text-crimson">
                  Recusado em {new Date(row.rejected_at).toLocaleDateString("pt-BR")}
                </span>
              </div>

              {(row.email || row.username) && (
                <p className="mt-1.5 text-[12.5px] font-normal text-[#8A8F98]">
                  {row.email}
                  {row.email && row.username && " · "}
                  {row.username && `@${row.username}`}
                </p>
              )}

              <div className={`mt-4 grid gap-3 ${row.document_type === "digital" ? "grid-cols-2" : "grid-cols-3"}`}>
                <PhotoSlot
                  label={row.document_type === "digital" ? "Documento (PDF/único)" : "Documento (frente)"}
                  url={frontUrl}
                />
                {row.document_type !== "digital" && <PhotoSlot label="Documento (verso)" url={backUrl} />}
                <PhotoSlot label="Selfie" url={selfieUrl} />
              </div>

              {row.notes && (
                <p className="mt-4 rounded-lg border border-sand-300 bg-sand p-3 text-[13px] font-normal text-[#3C434C]">
                  <span className="font-semibold text-obsidian-900">Motivo da recusa: </span>
                  {row.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[#8A8F98]">Nenhum cadastro recusado ainda.</p>
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
            className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-lg border border-sand-300 bg-sand text-[11px] font-medium text-[#5B6470] hover:border-dourado hover:text-dourado-dark"
          >
            <span className="text-xl">📄</span>
            Abrir PDF
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={label} className="h-28 w-full rounded-lg border border-sand-300 object-cover" />
          </a>
        )
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-sand-400 text-[10px] text-[#8A8F98]">
          Sem foto
        </div>
      )}
    </div>
  );
}
