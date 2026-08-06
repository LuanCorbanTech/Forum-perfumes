"use client";

import { useState } from "react";
import Link from "next/link";
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

  // Campos extras, só usados na tela de cadastro (ver isCadastro abaixo).
  // Guardados separados de "profiles" — vão para a tabela protegida
  // "profile_kyc" (migration_006), não para a leitura pública de perfis.
  const [cpf, setCpf] = useState("");
  const [inWhatsappGroup, setInWhatsappGroup] = useState<"" | "sim" | "nao">("");
  // E-mail de contato pedido no cadastro por telefone (quando o método de
  // verificação é "phone", o campo "email" acima não é preenchido — este
  // é um campo à parte só para guardar o e-mail de contato da pessoa).
  const [contactEmail, setContactEmail] = useState("");

  // O cadastro usa exatamente o mesmo fluxo de OTP do login (no primeiro
  // acesso o trigger `handle_new_user` já cria o profile) — só o texto muda
  // conforme a pessoa chegou por "Entrar" ou por "Cadastrar" no header.
  const isCadastro = searchParams.get("modo") === "cadastro";

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isCadastro) {
      if (!isValidCPF(cpf)) {
        setError("Digite um CPF válido.");
        return;
      }
      if (inWhatsappGroup === "") {
        setError('Selecione se você já participa do grupo de WhatsApp.');
        return;
      }
      if (method === "phone" && !isValidEmail(contactEmail)) {
        setError("Digite um e-mail válido.");
        return;
      }
    }

    setLoading(true);

    const cadastroData = isCadastro
      ? {
          cpf: cpf.replace(/\D/g, ""),
          in_whatsapp_group: inWhatsappGroup === "sim",
          // Quando o método é telefone, "email" (abaixo) fica vazio — o
          // e-mail de contato pedido no cadastro vem daqui.
          ...(method === "phone" ? { email: contactEmail.trim() } : {}),
        }
      : {};

    const next = searchParams.get("next") ?? "/";
    const options =
      method === "phone"
        ? { data: { full_name: fullName || undefined, ...cadastroData } }
        : {
            data: { full_name: fullName || undefined, ...cadastroData },
            // Sem isso, o Supabase usa a "Site URL" padrão como destino do
            // link do e-mail e ignora nossa rota /auth/callback — o clique
            // no link volta pro site, mas sem sessão criada.
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          };
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
    <div className="mx-auto max-w-[420px]">
      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
        {isCadastro ? "Cadastro" : "Acesso"}
      </p>
      <h1 className="mb-2 text-center font-serif text-4xl font-medium leading-none text-obsidian-900">
        {isCadastro ? "Criar conta no Cheiro Novo" : "Entrar no Cheiro Novo"}
      </h1>
      <p className="mb-2 text-center text-sm font-normal text-[#5B6470]">
        Use seu telefone ou e-mail. Enviaremos um código de confirmação.
      </p>
      <p className="mb-7 text-center text-[12.5px] font-normal text-[#8A8F98]">
        {isCadastro ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="border-b border-dourado-tint-border text-dourado-dark">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link href="/login?modo=cadastro" className="border-b border-dourado-tint-border text-dourado-dark">
              Cadastre-se
            </Link>
          </>
        )}
      </p>

      <div className="rounded-card border border-sand-300 bg-white p-[26px]">
        {step === "identify" && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-sand-300 p-1">
              <button
                type="button"
                onClick={() => setMethod("phone")}
                className={`rounded-md py-[9px] text-[13px] font-medium transition-colors ${
                  method === "phone" ? "bg-obsidian-900 text-white" : "text-[#5B6470]"
                }`}
              >
                Telefone
              </button>
              <button
                type="button"
                onClick={() => setMethod("email")}
                className={`rounded-md py-[9px] text-[13px] font-medium transition-colors ${
                  method === "email" ? "bg-obsidian-900 text-white" : "text-[#5B6470]"
                }`}
              >
                E-mail
              </button>
            </div>

            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                  Nome completo{" "}
                  <span className="font-normal normal-case tracking-normal text-[#B4AEA3]">(primeiro acesso)</span>
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como quer ser identificado no Cheiro Novo"
                  className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
                />
              </div>

              {method === "phone" ? (
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                    Telefone (com DDD)
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-8888"
                    required
                    className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    required
                    className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
                  />
                </div>
              )}

              {isCadastro && method === "phone" && (
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="voce@email.com"
                    required
                    className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
                  />
                </div>
              )}

              {isCadastro && (
                <>
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                      CPF
                    </label>
                    <input
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                      required
                      className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                      Já participa do grupo de WhatsApp?
                    </label>
                    <select
                      value={inWhatsappGroup}
                      onChange={(e) => setInWhatsappGroup(e.target.value as "" | "sim" | "nao")}
                      required
                      className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
                    >
                      <option value="" disabled>
                        Selecione uma opção
                      </option>
                      <option value="sim">Sim, já participo</option>
                      <option value="nao">Não, ainda não</option>
                    </select>
                  </div>
                </>
              )}

              {error && (
                <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2.5 text-[12.5px] text-crimson">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-obsidian-900 py-3.5 text-[11.5px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
              >
                {loading ? "Enviando..." : "Enviar código"}
              </button>

              <p className="text-center text-[11.5px] font-normal leading-relaxed text-[#8A8F98]">
                Ao continuar, você concorda com os{" "}
                <a
                  href="/termos"
                  target="_blank"
                  rel="noreferrer"
                  className="border-b border-dourado-tint-border text-dourado-dark"
                >
                  termos de uso
                </a>{" "}
                e as{" "}
                <a
                  href="/regras"
                  target="_blank"
                  rel="noreferrer"
                  className="border-b border-dourado-tint-border text-dourado-dark"
                >
                  regras do fórum
                </a>
                .
              </p>
            </form>
          </>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyCode} className="space-y-3.5">
            <p className="text-sm font-normal leading-relaxed text-[#3C434C]">
              Enviamos {method === "phone" ? "um código" : "um e-mail de confirmação"} para{" "}
              {method === "phone" ? normalizePhone(phone) : email}.
            </p>
            {method === "email" && (
              <p className="rounded-lg border border-dourado-tint-border bg-dourado-tint p-3 text-[12.5px] font-normal leading-relaxed text-[#5B6470]">
                Mais fácil: abra o e-mail e clique no link &ldquo;Entrar&rdquo;, isso já faz login
                direto, sem precisar digitar nada aqui. O campo abaixo só funciona se o código
                aparecer no corpo do e-mail.
              </p>
            )}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de 6 dígitos"
              required
              className="h-[52px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[17px] font-semibold tracking-[0.02em] text-obsidian-900 placeholder-[#A0A5AC] placeholder:text-[14px] placeholder:font-normal focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
            />
            {error && (
              <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2.5 text-[12.5px] text-crimson">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-obsidian-900 py-3.5 text-[11.5px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
            >
              {loading ? "Verificando..." : "Confirmar código"}
            </button>
            <button
              type="button"
              onClick={() => setStep("identify")}
              className="w-full text-center text-[12.5px] font-normal text-[#8A8F98] transition-colors hover:text-obsidian-900"
            >
              Voltar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  // assume Brasil se DDI não informado
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

function formatCPF(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let check1 = (sum * 10) % 11;
  if (check1 === 10) check1 = 0;
  if (check1 !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let check2 = (sum * 10) % 11;
  if (check2 === 10) check2 = 0;
  if (check2 !== parseInt(cpf[10], 10)) return false;

  return true;
}
