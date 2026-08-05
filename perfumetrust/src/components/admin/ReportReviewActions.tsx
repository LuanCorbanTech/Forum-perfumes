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
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      {error && <p className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas internas (opcional)"
        className="w-full rounded-lg border border-gray-300 p-2 text-xs"
        rows={2}
      />
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={banUser} onChange={(e) => setBanUser(e.target.checked)} />
        Banir usuário denunciado se procedente
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => handleReview(true)}
          disabled={loading}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:bg-green-700"
        >
          Aprovar (procedente)
        </button>
        <button
          onClick={() => handleReview(false)}
          disabled={loading}
          className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50 hover:bg-gray-300"
        >
          Rejeitar (improcedente)
        </button>
      </div>
    </div>
  );
}
