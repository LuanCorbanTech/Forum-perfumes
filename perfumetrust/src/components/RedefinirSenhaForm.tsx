"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Tela final do fluxo "esqueci minha senha": a pessoa chega aqui já com uma
// sessão temporária (trocada em /auth/callback a partir do link do e-mail)
// e escolhe a senha nova via supabase.auth.updateUser().
export function RedefinirSenhaForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      if (/session|not authenticated|jwt/i.test(updateError.message)) {
        setError('Esse link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".');
      } else {
        setError(updateError.message);
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 2000);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-card border border-verde-tint-border bg-verde-tint p-6 text-center">
        <p className="text-[14.5px] font-medium text-verde">
          Senha alterada! Te levando pra página inicial...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md space-y-4 rounded-card border border-sand-300 bg-white p-6"
    >
      <div>
        <p className="font-serif text-2xl font-medium text-obsidian-900">Nova senha</p>
        <p className="mt-1.5 text-[13px] font-normal leading-relaxed text-[#5B6470]">
          Escolhe uma senha nova pra sua conta.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2.5 text-[12.5px] text-crimson">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Nova senha
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Confirmar senha
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-obsidian-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
      >
        {loading ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
