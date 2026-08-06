"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UserBanActions({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleBan() {
    const reason = isBanned ? null : window.prompt("Motivo do banimento:") ?? "";
    if (!isBanned && reason === "") return; // cancelou o prompt

    setLoading(true);
    setError(null);
    const { error } = await supabase.rpc("admin_set_ban", {
      p_user_id: userId,
      p_banned: !isBanned,
      p_reason: reason,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-xs text-crimson">{error}</p>}
      <button
        onClick={toggleBan}
        disabled={loading}
        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 ${
          isBanned ? "bg-verde hover:bg-[#116430]" : "bg-crimson hover:bg-[#8f1c12]"
        }`}
      >
        {isBanned ? "Desbanir" : "Banir usuário"}
      </button>
    </div>
  );
}
