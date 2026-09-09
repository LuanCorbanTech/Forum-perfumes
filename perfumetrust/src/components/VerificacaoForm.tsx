"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveContentType } from "@/lib/storageContentType";
import { convertHeicIfNeeded } from "@/lib/convertHeic";
import { DocSlot } from "@/components/DocSlot";
import type { DocumentType } from "@/lib/types";

// Documentos/selfies costumam pesar mais que um avatar comum, então o
// limite aqui é um pouco mais generoso que o de EditProfileForm.tsx.
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB

type SlotKey = "front" | "back" | "selfie";

interface ExistingPhotos {
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
  selfieUrl: string | null;
  hasFront: boolean;
  hasBack: boolean;
  hasSelfie: boolean;
  documentType: DocumentType;
}

interface VerificacaoFormProps {
  userId: string;
  wasRejected: boolean;
  existing: ExistingPhotos;
}

// Diferente de "back" e "selfie" (sempre foto), o slot "front" muda de
// rótulo/dica conforme o tipo de documento escolhido — ver FRONT_LABELS.
const FRONT_LABELS: Record<DocumentType, { label: string; hint: string }> = {
  fisico: {
    label: "Documento (frente)",
    hint: "RG, CNH ou outro documento oficial com foto, lado da frente.",
  },
  digital: {
    label: "Documento (PDF ou foto única)",
    hint: 'Ex.: o PDF da "CNH Digital" ou da "Carteira de Identidade Nacional / RG Digital" (app Meu Governo/gov.br), ou outro documento que já vem com tudo numa página só.',
  },
};

export function VerificacaoForm({ userId, wasRejected, existing }: VerificacaoFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [documentType, setDocumentType] = useState<DocumentType>(existing.documentType);
  const [files, setFiles] = useState<Record<SlotKey, File | null>>({
    front: null,
    back: null,
    selfie: null,
  });
  const [previews, setPreviews] = useState<Record<SlotKey, string | null>>({
    front: existing.documentFrontUrl,
    back: existing.documentBackUrl,
    selfie: existing.selfieUrl,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<SlotKey, string | null>>({
    front: null,
    back: null,
    selfie: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isDigital = documentType === "digital";

  const hasAll = {
    front: !!(files.front || existing.hasFront),
    back: isDigital ? true : !!(files.back || existing.hasBack),
    selfie: !!(files.selfie || existing.hasSelfie),
  };

  function handleDocumentTypeChange(next: DocumentType) {
    setDocumentType(next);
    setSuccess(false);
    setError(null);
  }

  async function handleFileChange(slot: SlotKey, e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0] ?? null;
    setSuccess(false);
    setFieldErrors((prev) => ({ ...prev, [slot]: null }));
    if (rawFile && rawFile.size > MAX_PHOTO_BYTES) {
      setFieldErrors((prev) => ({ ...prev, [slot]: "O arquivo precisa ter até 8MB." }));
      setFiles((prev) => ({ ...prev, [slot]: null }));
      e.target.value = "";
      return;
    }
    // Converte HEIC/HEIF (padrão do iPhone) pra JPEG aqui mesmo, antes de
    // guardar o arquivo — assim a pré-visualização e o envio já usam algo
    // que qualquer navegador consegue exibir.
    const file = rawFile ? await convertHeicIfNeeded(rawFile) : null;
    setFiles((prev) => ({ ...prev, [slot]: file }));
    if (file) setPreviews((prev) => ({ ...prev, [slot]: URL.createObjectURL(file) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!hasAll.front || !hasAll.selfie || (!isDigital && !hasAll.back)) {
      setError(
        isDigital
          ? "Envie o documento e a selfie para continuar."
          : "Envie as 3 fotos (documento frente, documento verso e selfie) para continuar."
      );
      return;
    }

    setLoading(true);
    try {
      const slotsToUpload: SlotKey[] = isDigital ? ["front", "selfie"] : ["front", "back", "selfie"];
      const updates: Record<string, string | null> = {};

      for (const slot of slotsToUpload) {
        const file = files[slot];
        if (!file) continue; // nada novo selecionado nesse slot, mantém o caminho já enviado antes
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        // Caminho fixo por usuário/slot (não usa timestamp): reenviar um
        // arquivo sempre sobrescreve o anterior no mesmo lugar (upsert: true).
        const path = `${userId}/${slot}.${ext}`;
        const dbColumn = slot === "front" ? "document_front_path" : slot === "back" ? "document_back_path" : "selfie_path";
        const { error: uploadError } = await supabase.storage
          .from("verification-docs")
          .upload(path, file, { contentType: resolveContentType(file), upsert: true });
        if (uploadError) {
          const label = slot === "front" ? "documento" : slot === "back" ? "verso do documento" : "selfie";
          throw new Error(`Não foi possível enviar "${label}": ${uploadError.message}`);
        }
        updates[dbColumn] = path;
      }

      // Trocou pra "digital" agora (ou já estava): não faz sentido manter um
      // verso antigo de uma tentativa anterior em "fisico" — limpa o campo
      // pra não aparecer nada errado na revisão do admin.
      if (isDigital) {
        updates.document_back_path = null;
      }

      const { error: upsertError } = await supabase.from("profile_kyc").upsert(
        {
          profile_id: userId,
          document_type: documentType,
          ...updates,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      );
      if (upsertError) throw new Error(upsertError.message);

      setSuccess(true);
      setFiles({ front: null, back: null, selfie: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar seus arquivos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-card border border-sand-300 bg-white p-5">
      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-3 text-sm text-crimson">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-verde-tint-border bg-verde-tint p-3 text-sm text-verde">
          Enviado. Um moderador vai analisar em breve.
        </p>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Tipo de documento
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleDocumentTypeChange("fisico")}
            className={`rounded-lg border px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${
              !isDigital
                ? "border-dourado bg-dourado-tint text-dourado-dark"
                : "border-sand-400 text-[#5B6470] hover:border-obsidian-900 hover:text-obsidian-900"
            }`}
          >
            Documento físico (frente e verso)
          </button>
          <button
            type="button"
            onClick={() => handleDocumentTypeChange("digital")}
            className={`rounded-lg border px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${
              isDigital
                ? "border-dourado bg-dourado-tint text-dourado-dark"
                : "border-sand-400 text-[#5B6470] hover:border-obsidian-900 hover:text-obsidian-900"
            }`}
          >
            CNH Digital, RG Digital ou documento único (PDF)
          </button>
        </div>
        <p className="mt-2 text-[12px] font-normal text-[#8A8F98]">
          Se o seu documento já vem como um PDF ou uma imagem única com tudo (ex.: CNH Digital ou
          RG Digital), escolha a segunda opção — não precisa separar frente e verso.
        </p>
      </div>

      <DocSlot
        slotKey="front"
        label={FRONT_LABELS[documentType].label}
        hint={FRONT_LABELS[documentType].hint}
        accept={isDigital ? "image/*,application/pdf" : "image/*"}
        capture={isDigital ? undefined : "environment"}
        file={files.front}
        previewUrl={previews.front}
        error={fieldErrors.front}
        onChange={(e) => handleFileChange("front", e)}
      />

      {!isDigital && (
        <DocSlot
          slotKey="back"
          label="Documento (verso)"
          hint="O mesmo documento, lado de trás."
          accept="image/*"
          capture="environment"
          file={files.back}
          previewUrl={previews.back}
          error={fieldErrors.back}
          onChange={(e) => handleFileChange("back", e)}
        />
      )}

      <DocSlot
        slotKey="selfie"
        label="Selfie"
        hint="Uma foto sua, de rosto, tirada na hora (abra a câmera frontal)."
        accept="image/*"
        capture="user"
        file={files.selfie}
        previewUrl={previews.selfie}
        error={fieldErrors.selfie}
        onChange={(e) => handleFileChange("selfie", e)}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-obsidian-900 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
      >
        {loading ? "Enviando..." : wasRejected ? "Reenviar" : "Enviar para análise"}
      </button>
    </form>
  );
}
