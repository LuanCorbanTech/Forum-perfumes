"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REPORT_REASON_LABELS, type ReportReason } from "@/lib/types";

interface Props {
  reportedId: string;
  reportedName: string;
  transactionId?: string;
  currentUserId: string;
}

export function ReportForm({ reportedId, reportedName, transactionId, currentUserId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [reason, setReason] = useState<ReportReason>("golpe");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError("Descreva com mais detalhes (mínimo 10 caracteres).");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      reported_id: reportedId,
      transaction_id: transactionId ?? null,
      reason,
      description: description.trim(),
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
      <p className="rounded-lg bg-emerald-400/10 p-4 text-sm text-emerald-300">
        Denúncia enviada. Nossa equipe irá analisar em breve.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-ink-700 bg-ink-800/60 p-4">
      <p className="font-medium text-ink-100">Denunciar {reportedName}</p>

      {error && <p className="rounded bg-red-400/10 p-2 text-sm text-red-300">{error}</p>}

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-200">Motivo</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
        >
          {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value} className="bg-ink-800 text-ink-50">
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-200">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o que aconteceu com o máximo de detalhes possível..."
          className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
          rows={4}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-red-500/90 px-4 py-2 font-medium text-white transition disabled:opacity-50 hover:bg-red-500"
      >
        Enviar denúncia
      </button>
    </form>
  );
}
