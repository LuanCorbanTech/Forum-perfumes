"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
}

interface VerificacaoFormProps {
  userId: string;
  wasRejected: boolean;
  existing: ExistingPhotos;
}

const SLOT_CONFIG: Record<
  SlotKey,
  {
    label: string;
    hint: string;
    capture: "environment" | "user";
    dbColumn: "document_front_path" | "document_back_path" | "selfie_path";
  }
> = {
  front: {
    label: "Documento (frente)",
    hint: "RG, CNH ou outro documento oficial com foto, lado da frente.",
    capture: "environment",
    dbColumn: "document_front_path",
  },
  back: {
    label: "Documento (verso)",
    hint: "O mesmo documento, lado de trás.",
    capture: "environment",
    dbColumn: "document_back_path",
  },
  selfie: {
    label: "Selfie",
    hint: "Uma foto sua, de rosto, tirada na hora (abra a câmera frontal).",
    capture: "user",
    dbColumn: "selfie_path",
  },
};

export function VerificacaoForm({ userId, wasRejected, existing }: VerificacaoFormProps) {
  const router = useRouter();
  const supabase = createClient();

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

  const hasAll = {
    front: !!(files.front || existing.hasFront),
    back: !!(files.back || existing.hasBack),
    selfie: !!(files.selfie || existing.hasSelfie),
  };

  function handleFileChange(slot: SlotKey, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSuccess(false);
    setFieldErrors((prev) => ({ ...prev, [slot]: null }));
    if (file && file.size > MAX_PHOTO_BYTES) {
      setFieldErrors((prev) => ({ ...prev, [slot]: "A foto precisa ter até 8MB." }));
      setFiles((prev) => ({ ...prev, [slot]: null }));
      e.target.value = "";
      return;
    }
    setFiles((prev) => ({ ...prev, [slot]: file }));
    if (file) setPreviews((prev) => ({ ...prev, [slot]: URL.createObjectURL(file) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!hasAll.front || !hasAll.back || !hasAll.selfie) {
      setError("Envie as 3 fotos (documento frente, documento verso e selfie) para continuar.");
      return;
    }

    setLoading(true);
    try {
      const updates: Record<string, string> = {};

      for (const slot of Object.keys(SLOT_CONFIG) as SlotKey[]) {
        const file = files[slot];
        if (!file) continue; // nada novo selecionado nesse slot, mantém o caminho já enviado antes
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        // Caminho fixo por usuário/slot (não usa timestamp): reenviar uma
        // foto sempre sobrescreve a anterior no mesmo lugar (upsert: true).
        const path = `${userId}/${slot}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-docs")
          .upload(path, file, { contentType: file.type || undefined, upsert: true });
        if (uploadError) {
          throw new Error(`Não foi possível enviar "${SLOT_CONFIG[slot].label}": ${uploadError.message}`);
        }
        updates[SLOT_CONFIG[slot].dbColumn] = path;
      }

      const { error: upsertError } = await supabase.from("profile_kyc").upsert(
        {
          profile_id: userId,
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
      setError(err instanceof Error ? err.message : "Não foi possível enviar suas fotos. Tente novamente.");
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
          Fotos enviadas. Um moderador vai analisar em breve.
        </p>
      )}

      {(Object.keys(SLOT_CONFIG) as SlotKey[]).map((slot) => {
        const config = SLOT_CONFIG[slot];
        return (
          <div key={slot}>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
              {config.label} <span className="text-dourado-dark">(obrigatória)</span>
            </label>
            <p className="mb-2 text-[12.5px] text-[#8A8F98]">{config.hint}</p>
            <div className="flex items-center gap-3">
              {previews[slot] ? (
                <img
                  src={previews[slot] ?? undefined}
                  alt={config.label}
                  className="h-20 w-20 rounded-lg border border-sand-300 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-sand-400 text-center text-[10px] text-[#8A8F98]">
                  Sem foto
                </div>
              )}
              <label className="cursor-pointer rounded-lg border border-sand-400 px-3 py-2 text-xs font-semibold text-obsidian-900 transition-colors hover:border-dourado hover:text-dourado">
                {previews[slot] ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/*"
                  capture={config.capture}
                  onChange={(e) => handleFileChange(slot, e)}
                  className="hidden"
                />
              </label>
            </div>
            {fieldErrors[slot] && <p className="mt-1.5 text-xs text-crimson">{fieldErrors[slot]}</p>}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-obsidian-900 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
      >
        {loading ? "Enviando..." : wasRejected ? "Reenviar fotos" : "Enviar fotos para análise"}
      </button>
    </form>
  );
}
