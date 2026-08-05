"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ReportReviewActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [notes, setNotes] = useState("");
  const [banUser, setBanUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(approve: boolean) {
    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("admin_review_report", {
      p_report_id: reportId,
      p_approve: approve,
      p_notes: notes.trim() || null,
      p_ban_user: approve && banUser,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2 border-t border-ink-700 pt-3">
      {error && <p className="rounded bg-red-400/10 p-2 text-xs text-red-300">{error}</p>}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas internas (opcional)"
        className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-xs text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
        rows={2}
      />
      <label className="flex items-center gap-2 text-xs text-ink-300">
        <input type="checkbox" checked={banUser} onChange={(e) => setBanUser(e.target.checked)} />
        Banir usuário denunciado se procedente
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => handleReview(true)}
          disabled={loading}
          className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50 hover:bg-emerald-500"
        >
          Aprovar (procedente)
        </button>
        <button
          onClick={() => handleReview(false)}
          disabled={loading}
          className="rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-1.5 text-xs font-medium text-ink-200 transition disabled:opacity-50 hover:bg-ink-800"
        >
          Rejeitar (improcedente)
        </button>
      </div>
    </div>
  );
}
