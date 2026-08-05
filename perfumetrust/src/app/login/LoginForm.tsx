"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Method = "phone" | "email";
type Step = "identify" | "verify";

// Login/cadastro unificado por OTP (telefone via SMS ou e-mail via código).
// No primeiro acesso, o trigger `handle_new_user` cria o profile
// automaticamente usando o full_name enviado em options.data.
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [method, setMethod] = useState<Method>("phone");
  const [step, setStep] = useState<Step>("identify");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const options = { data: { full_name: fullName || undefined } };
    const { error } =
      method === "phone"
        ? await supabase.auth.signInWithOtp({ phone: normalizePhone(phone), options })
        : await supabase.auth.signInWithOtp({ email, options });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep("verify");
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } =
      method === "phone"
        ? await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token: code, type: "sms" })
        : await supabase.auth.verifyOtp({ email, token: code, type: "email" });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    router.push(searchParams.get("next") ?? "/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-ink-700 bg-ink-800/60 p-6 sm:p-8">
      <h1 className="mb-1 font-serif text-2xl font-light text-ink-50">Entrar no Cheiro Novo</h1>
      <p className="mb-6 text-sm text-ink-300">
        Use seu telefone ou e-mail. Enviaremos um código de confirmação.
      </p>

      {step === "identify" && (
        <>
          <div className="mb-4 flex rounded-lg border border-ink-600 p-1">
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                method === "phone" ? "bg-gold-500 text-ink-950" : "text-ink-300"
              }`}
            >
              Telefone
            </button>
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                method === "email" ? "bg-gold-500 text-ink-950" : "text-ink-300"
              }`}
            >
              E-mail
            </button>
          </div>

          <form onSubmit={handleSendCode} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-200">
                Nome completo <span className="text-ink-400">(primeiro acesso)</span>
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Como quer ser identificado no Cheiro Novo"
                className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
              />
            </div>

            {method === "phone" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-200">Telefone (com DDD)</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 11 99999-8888"
                  required
                  className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-200">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                  className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                />
              </div>
            )}

            {error && <p className="rounded bg-red-400/10 p-2 text-sm text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gold-500 py-2 font-medium text-ink-950 transition disabled:opacity-50 hover:bg-gold-400"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        </>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerifyCode} className="space-y-3">
          <p className="text-sm text-ink-300">
            Enviamos um código para {method === "phone" ? normalizePhone(phone) : email}.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código de 6 dígitos"
            required
            className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm tracking-widest text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
          />
          {error && <p className="rounded bg-red-400/10 p-2 text-sm text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-500 py-2 font-medium text-ink-950 transition disabled:opacity-50 hover:bg-gold-400"
          >
            {loading ? "Verificando..." : "Confirmar código"}
          </button>
          <button
            type="button"
            onClick={() => setStep("identify")}
            className="w-full text-sm text-ink-400 hover:text-ink-200"
          >
            Voltar
          </button>
        </form>
      )}
    </div>
  );
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  // assume Brasil se DDI não informado
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}
