"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REASON_LABELS, type ApprovalStatus, type ReportReason } from "@/lib/types";
import { VerificationGate } from "@/components/VerificationGate";

interface Props {
  reportedId: string;
  reportedName: string;
  transactionId?: string;
  currentUserId: string;
  myApprovalStatus: ApprovalStatus;
}

// Print de conversa, foto do produto errado/falsificado recebido, etc. —
// prova opcional que deixa a análise do admin bem mais objetiva do que só
// a palavra de quem denunciou. Vai pro bucket privado "report-evidence"
// (migration_015): só o próprio denunciante e admins conseguem ver, nunca
// o denunciado (mesma regra de privacidade da denúncia em si).
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

export function ReportForm({ reportedId, reportedName, transactionId, currentUserId, myApprovalStatus }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [reason, setReason] = useState<ReportReason>("golpe");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoError(null);
    if (file && file.size > MAX_PHOTO_BYTES) {
      setPhotoError("A foto precisa ter até 5MB.");
      setPhoto(null);
      e.target.value = "";
      return;
    }
    setPhoto(file);
  }

  // O banco (migration_003) já recusa a inserção se o denunciante não
  // estiver aprovado — isso aqui só evita que a pessoa esbarre num erro
  // cru de RLS e mostra o motivo real, com um link pra resolver. Fica
  // depois dos hooks (nunca antes) pra não violar as Rules of Hooks.
  if (myApprovalStatus !== "approved") {
    return <VerificationGate status={myApprovalStatus} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError("Descreva com mais detalhes (mínimo 10 caracteres).");
      return;
    }
    setLoading(true);
    setError(null);

    let photoPath: string | null = null;
    if (photo) {
      const ext = photo.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${currentUserId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("report-evidence")
        .upload(path, photo, { contentType: photo.type || undefined });
      if (uploadError) {
        setLoading(false);
        setError(`Não foi possível enviar a foto: ${uploadError.message}`);
        return;
      }
      photoPath = path;
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      reported_id: reportedId,
      transaction_id: transactionId ?? null,
      reason,
      description: description.trim(),
      photo_path: photoPath,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (success) {
    return (
      <p className="rounded-card border border-verde-tint-border bg-verde-tint p-4 text-sm text-verde">
        Denúncia enviada. Nossa equipe irá analisar em breve.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[560px] space-y-4 rounded-card border border-sand-300 bg-white p-[22px]">
      <p className="text-[13px] font-normal text-[#5B6470]">
        Denunciar <span className="font-semibold text-obsidian-900">{reportedName}</span>
      </p>

      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-3 text-[12.5px] text-crimson">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Motivo
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        >
          {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-white text-obsidian-900">
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Descrição
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o que aconteceu, com datas e valores."
          className="w-full rounded-lg border border-sand-400 bg-white p-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          rows={4}
        />
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Foto (opcional)
        </label>
        <p className="mb-2 text-[12px] font-normal text-[#8A8F98]">
          Print da conversa, foto do produto errado/falsificado etc. — ajuda a moderação a decidir
          mais rápido. Só você e a equipe de moderação conseguem ver esta foto.
        </p>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="w-full rounded-lg border border-sand-400 bg-white p-2 text-xs text-[#5B6470] file:mr-3 file:rounded file:border-0 file:bg-dourado file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-obsidian-900"
        />
        {photoError && <p className="mt-1 text-xs text-crimson">{photoError}</p>}
        {photo && !photoError && <p className="mt-1 text-xs text-[#8A8F98]">Selecionado: {photo.name}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-obsidian-900 px-[22px] py-[13px] text-[11.5px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
      >
        Enviar denúncia
      </button>
    </form>
  );
}
