"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminAccount } from "@/app/admin/administradores/actions";

// Gera uma senha aleatória só no navegador do admin (nunca sai da tela até
// ele apertar "Criar administrador" — não é logada nem guardada em lugar
// nenhum além do hash que o Supabase Auth grava).
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export function CreateAdminForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleGeneratePassword() {
    setPassword(generatePassword());
    setShowPassword(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await createAdminAccount({ fullName, email, username, password });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível criar a conta.");
      return;
    }

    setSuccess(true);
    setFullName("");
    setEmail("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-4 rounded-card border border-sand-300 bg-white p-6"
    >
      <div>
        <p className="text-sm font-semibold text-obsidian-900">Criar novo administrador</p>
        <p className="mt-1 text-[12.5px] font-normal leading-relaxed text-[#8A8F98]">
          A conta já entra ativa e aprovada — não passa por cadastro nem verificação de
          identidade. Anote a senha e passe pra pessoa por um canal seguro antes de sair da tela.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2.5 text-[12.5px] text-crimson">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-verde-tint-border bg-verde-tint p-2.5 text-[12.5px] text-verde">
          Admin criado. Passa o e-mail (ou usuário) e a senha pra pessoa conseguir entrar.
        </p>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Nome completo
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          E-mail
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Nome de usuário (opcional)
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ex.: joaoadmin"
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Senha
        </label>
        <div className="flex gap-2">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 flex-1 rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="shrink-0 rounded-lg border border-sand-400 px-3 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#5B6470] transition-colors hover:border-obsidian-900 hover:text-obsidian-900"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="shrink-0 rounded-lg border border-sand-400 px-3 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#5B6470] transition-colors hover:border-obsidian-900 hover:text-obsidian-900"
          >
            Gerar senha
          </button>
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#8A8F98]">Mínimo de 8 caracteres.</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-obsidian-900 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
      >
        {loading ? "Criando..." : "Criar administrador"}
      </button>
    </form>
  );
}
