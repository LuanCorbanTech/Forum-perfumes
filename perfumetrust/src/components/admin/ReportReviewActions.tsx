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
    <div className="mt-4 space-y-3 border-t border-sand-200 pt-4">
      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2 text-xs text-crimson">
          {error}
        </p>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas internas (opcional)"
        className="w-full rounded-lg border border-sand-400 bg-white p-2.5 text-[13px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        rows={2}
      />
      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-normal text-[#5B6470]">
        <input
          type="checkbox"
          checked={banUser}
          onChange={(e) => setBanUser(e.target.checked)}
          className="h-[15px] w-[15px] accent-dourado"
        />
        Banir usuário denunciado se procedente
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleReview(true)}
          disabled={loading}
          className="rounded-lg bg-verde px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-[#116430]"
        >
          Aprovar (procedente)
        </button>
        <button
          onClick={() => handleReview(false)}
          disabled={loading}
          className="rounded-lg border border-sand-400 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#3C434C] transition-colors disabled:opacity-50 hover:border-obsidian-900 hover:text-obsidian-900"
        >
          Rejeitar (improcedente)
        </button>
      </div>
    </div>
  );
}
