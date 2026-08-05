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
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={toggleBan}
        disabled={loading}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
          isBanned ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"
        }`}
      >
        {isBanned ? "Desbanir" : "Banir usuário"}
      </button>
    </div>
  );
}
