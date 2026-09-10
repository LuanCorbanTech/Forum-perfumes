"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserCredentials } from "@/app/admin/usuarios/actions";

// Corrige o e-mail e/ou nome de usuário de login de QUALQUER conta (comum
// ou admin) depois de já criada — por exemplo quando uma conta de admin
// foi criada com um e-mail provisório e precisa ser trocado pelo
// definitivo. Não mexe na senha (a pessoa continua usando a mesma senha
// que já tinha).
export function EditCredentialsForm({
  userId,
  currentEmail,
  currentUsername,
}: {
  userId: string;
  currentEmail: string | null;
  currentUsername: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(currentEmail ?? "");
  const [username, setUsername] = useState(currentUsername ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    const result = await updateUserCredentials(userId, email, username || null);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível salvar as alterações.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setEditing(true);
          setError(null);
          setSuccess(false);
        }}
        className="rounded-lg border border-sand-400 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-obsidian-900 transition-colors hover:border-dourado hover:text-dourado-dark"
      >
        Editar e-mail / usuário
      </button>
    );
  }

  return (
    <div className="max-w-sm space-y-3 rounded-lg border border-sand-300 bg-white p-3.5">
      <p className="text-[12.5px] font-medium text-obsidian-900">Editar e-mail / usuário de login</p>
      <p className="text-[11.5px] text-[#8A8F98]">
        Isso muda só o e-mail e/ou nome de usuário usados pra entrar no site. A senha continua a mesma que a
        pessoa já tem.
      </p>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full rounded-lg border border-sand-400 bg-white p-2 text-[13px] text-obsidian-900 focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">
          Nome de usuário
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          placeholder="opcional"
          className="w-full rounded-lg border border-sand-400 bg-white p-2 text-[13px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      {error && <p className="text-[12px] text-crimson">{error}</p>}
      {success && <p className="text-[12px] text-verde">Alterado com sucesso.</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-obsidian-900 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
            setEmail(currentEmail ?? "");
            setUsername(currentUsername ?? "");
          }}
          disabled={loading}
          className="rounded-lg border border-sand-400 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#5B6470] transition-colors hover:bg-sand"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
