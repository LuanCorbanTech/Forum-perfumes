"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type View = "login" | "cadastro" | "esqueci-senha";

// Login/cadastro por e-mail (ou nome de usuário) + senha (migration_009).
// Antes disso o site usava código por e-mail/SMS (OTP) — trocado porque
// gerava fricção (limite de e-mails do Supabase, gente perdendo o código
// etc). No primeiro acesso o trigger `handle_new_user` já cria o profile
// automaticamente usando os metadados enviados em options.data.
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isCadastroParam = searchParams.get("modo") === "cadastro";
  const [view, setView] = useState<View>(isCadastroParam ? "cadastro" : "login");

  // Campos de login.
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Campos de cadastro.
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [inWhatsappGroup, setInWhatsappGroup] = useState<"" | "sim" | "nao">("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // "Esqueci minha senha".
  const [forgotId, setForgotId] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cadastroFeito, setCadastroFeito] = useState(false);

  async function resolveEmail(loginInput: string): Promise<string | null> {
    const { data, error: rpcError } = await supabase.rpc("resolve_login_email", {
      p_login: loginInput,
    });
    if (rpcError) return null;
    return (data as string | null) ?? null;
  }

  function friendlyAuthError(message: string): string {
    if (/invalid login credentials/i.test(message)) {
      return "E-mail/usuário ou senha inválidos.";
    }
    if (/email not confirmed/i.test(message)) {
      return "Você ainda não confirmou seu e-mail. Confira sua caixa de entrada (e o spam) e clique no link de confirmação.";
    }
    if (/user already registered/i.test(message)) {
      return "Já existe uma conta com esse e-mail. Tenta entrar em vez de cadastrar.";
    }
    return message;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!loginId.trim() || !loginPassword) {
      setError("Preenche o e-mail (ou usuário) e a senha.");
      return;
    }

    setLoading(true);
    const resolvedEmail = await resolveEmail(loginId);
    if (!resolvedEmail) {
      setLoading(false);
      setError("E-mail/usuário ou senha inválidos.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: loginPassword,
    });

    setLoading(false);
    if (signInError) {
      setError(friendlyAuthError(signInError.message));
      return;
    }

    const next = searchParams.get("next") ?? "/";
    router.push(next);
    router.refresh();
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Digite seu nome completo.");
      return;
    }
    if (username.trim() && !isValidUsername(username)) {
      setError("Nome de usuário só pode ter letras, números e _ (mínimo 3 caracteres).");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Digite um e-mail válido.");
      return;
    }
    if (!phone.trim()) {
      setError("Digite seu telefone (WhatsApp).");
      return;
    }
    if (!isValidCPF(cpf)) {
      setError("Digite um CPF válido.");
      return;
    }
    if (inWhatsappGroup === "") {
      setError("Selecione se você já participa do grupo de WhatsApp.");
      return;
    }
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName || undefined,
          username: username.trim() || undefined,
          phone: normalizePhone(phone),
          cpf: cpf.replace(/\D/g, ""),
          in_whatsapp_group: inWhatsappGroup === "sim",
        },
        // Sem isso, o Supabase usa a "Site URL" padrão como destino do
        // link do e-mail e ignora nossa rota /auth/callback.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/conta/verificacao")}`,
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(friendlyAuthError(signUpError.message));
      return;
    }

    // Se a confirmação de e-mail estiver desativada no projeto, o
    // signUp já devolve uma sessão pronta — nesse caso pode entrar direto.
    if (data.session) {
      router.push("/conta/verificacao");
      router.refresh();
      return;
    }

    setCadastroFeito(true);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!forgotId.trim()) {
      setError("Digite seu e-mail (ou usuário).");
      return;
    }

    setLoading(true);
    const resolvedEmail = await resolveEmail(forgotId);
    if (!resolvedEmail) {
      setLoading(false);
      // Não revela se o e-mail/usuário existe ou não, por segurança.
      setForgotSent(true);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resolvedEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/redefinir-senha")}`,
    });

    setLoading(false);
    if (resetError) {
      setError(friendlyAuthError(resetError.message));
      return;
    }
    setForgotSent(true);
  }

  if (cadastroFeito) {
    return (
      <div className="mx-auto max-w-[420px]">
        <div className="rounded-card border border-sand-300 bg-white p-[26px] text-center">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Cadastro</p>
          <h1 className="mb-3 font-serif text-3xl font-medium leading-none text-obsidian-900">
            Confirme seu e-mail
          </h1>
          <p className="text-sm font-normal leading-relaxed text-[#5B6470]">
            Mandamos um link de confirmação para <strong>{email}</strong>. Abre o e-mail e clica no
            link — assim que confirmar, você já pode enviar seu documento e selfie para verificação.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block border-b border-dourado-tint-border text-[13px] font-medium text-dourado-dark"
          >
            Voltar pro login
          </Link>
        </div>
      </div>
    );
  }

  if (view === "esqueci-senha") {
    return (
      <div className="mx-auto max-w-[420px]">
        <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          Acesso
        </p>
        <h1 className="mb-2 text-center font-serif text-4xl font-medium leading-none text-obsidian-900">
          Esqueci minha senha
        </h1>
        <p className="mb-7 text-center text-sm font-normal text-[#5B6470]">
          Digite seu e-mail ou nome de usuário — mandamos um link pra você escolher uma senha nova.
        </p>

        <div className="rounded-card border border-sand-300 bg-white p-[26px]">
          {forgotSent ? (
            <p className="text-center text-sm font-normal leading-relaxed text-[#3C434C]">
              Se esse e-mail/usuário existir na nossa base, um link de redefinição foi enviado.
              Confere sua caixa de entrada (e o spam).
            </p>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                  E-mail ou nome de usuário
                </label>
                <input
                  value={forgotId}
                  onChange={(e) => setForgotId(e.target.value)}
                  placeholder="voce@email.com ou seu_usuario"
                  required
                  className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
                />
              </div>
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
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => {
              setView("login");
              setError(null);
              setForgotSent(false);
            }}
            className="mt-4 w-full text-center text-[12.5px] font-normal text-[#8A8F98] transition-colors hover:text-obsidian-900"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const isCadastro = view === "cadastro";

  return (
    <div className="mx-auto max-w-[420px]">
      <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
        {isCadastro ? "Cadastro" : "Acesso"}
      </p>
      <h1 className="mb-2 text-center font-serif text-4xl font-medium leading-none text-obsidian-900">
        {isCadastro ? "Criar conta no Cheiro Novo" : "Entrar no Cheiro Novo"}
      </h1>
      <p className="mb-2 text-center text-sm font-normal text-[#5B6470]">
        {isCadastro
          ? "Preenche seus dados e escolhe uma senha."
          : "Use seu e-mail (ou nome de usuário) e sua senha."}
      </p>
      <p className="mb-7 text-center text-[12.5px] font-normal text-[#8A8F98]">
        {isCadastro ? (
          <>
            Já tem conta?{" "}
            <Link
              href="/login"
              onClick={() => setView("login")}
              className="border-b border-dourado-tint-border text-dourado-dark"
            >
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link
              href="/login?modo=cadastro"
              onClick={() => setView("cadastro")}
              className="border-b border-dourado-tint-border text-dourado-dark"
            >
              Cadastre-se
            </Link>
          </>
        )}
      </p>

      <div className="rounded-card border border-sand-300 bg-white p-[26px]">
        {isCadastro ? (
          <form onSubmit={handleCadastro} className="space-y-4">
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                Nome completo
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Como quer ser identificado no Cheiro Novo"
                required
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                Nome de usuário{" "}
                <span className="font-normal normal-case tracking-normal text-[#B4AEA3]">(opcional)</span>
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                placeholder="ex: joao_perfumes"
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
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
                placeholder="voce@email.com"
                required
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
              />
            </div>

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
                Telefone (WhatsApp)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99999-8888"
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

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
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
                placeholder="Repete a senha"
                required
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
              />
            </div>

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
              {loading ? "Criando conta..." : "Criar conta"}
            </button>

            <p className="text-center text-[11.5px] font-normal leading-relaxed text-[#8A8F98]">
              Ao continuar, você concorda com os{" "}
              <a href="/termos" target="_blank" rel="noreferrer" className="border-b border-dourado-tint-border text-dourado-dark">
                termos de uso
              </a>{" "}
              e as{" "}
              <a href="/regras" target="_blank" rel="noreferrer" className="border-b border-dourado-tint-border text-dourado-dark">
                regras do fórum
              </a>
              .
            </p>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                E-mail ou nome de usuário
              </label>
              <input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="voce@email.com ou seu_usuario"
                required
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                Senha
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Sua senha"
                required
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-[14.5px] text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
              />
            </div>

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
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <button
              type="button"
              onClick={() => {
                setView("esqueci-senha");
                setError(null);
              }}
              className="w-full text-center text-[12.5px] font-normal text-[#8A8F98] transition-colors hover:text-obsidian-900"
            >
              Esqueci minha senha
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

function isValidUsername(raw: string): boolean {
  return /^[a-zA-Z0-9_]{3,24}$/.test(raw.trim());
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
