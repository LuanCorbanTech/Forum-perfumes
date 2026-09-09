"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DocSlot } from "@/components/DocSlot";
import { convertHeicIfNeeded } from "@/lib/convertHeic";
import { signUpComDocumentos } from "./actions";
import type { DocumentType } from "@/lib/types";

type View = "login" | "cadastro" | "esqueci-senha";

type DocSlotKey = "front" | "back" | "selfie";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB

const FRONT_LABELS: Record<DocumentType, { label: string; hint: string }> = {
  fisico: {
    label: "Documento (frente)",
    hint: "RG, CNH ou outro documento oficial com foto, lado da frente.",
  },
  digital: {
    label: "Documento (PDF ou foto única)",
    hint: 'Ex.: o PDF da "CNH Digital" ou da "Carteira de Identidade Nacional / RG Digital" (app Meu Governo/gov.br), ou outro documento que já vem com tudo numa página só.',
  },
};

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

  // Documento + selfie já na tela de cadastro (antes só vinham depois,
  // em /conta/verificacao) — ver src/app/login/actions.ts.
  const [documentType, setDocumentType] = useState<DocumentType>("fisico");
  const [docFiles, setDocFiles] = useState<Record<DocSlotKey, File | null>>({
    front: null,
    back: null,
    selfie: null,
  });
  const [docPreviews, setDocPreviews] = useState<Record<DocSlotKey, string | null>>({
    front: null,
    back: null,
    selfie: null,
  });
  const [docErrors, setDocErrors] = useState<Record<DocSlotKey, string | null>>({
    front: null,
    back: null,
    selfie: null,
  });

  // "Esqueci minha senha".
  const [forgotId, setForgotId] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [loading, setLoading] = useState(false);
  // "?erro=pendente" vem do middleware (src/middleware.ts), quando uma
  // sessão antiga de alguém ainda não aprovado tenta usar uma rota
  // protegida — mostra o mesmo aviso que já aparece ao tentar logar.
  const [error, setError] = useState<string | null>(
    searchParams.get("erro") === "pendente"
      ? "Seu cadastro ainda está em análise (ou não foi aprovado). Você vai receber um e-mail assim que houver uma decisão."
      : null
  );
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

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password: loginPassword,
    });

    if (signInError) {
      setLoading(false);
      setError(friendlyAuthError(signInError.message));
      return;
    }

    // O acesso só libera depois que um admin aprova o cadastro (dados +
    // documento + selfie, enviados juntos em /login?modo=cadastro) — a
    // senha pode estar certinha, mas sem aprovação a pessoa não entra.
    const uid = signInData.user?.id;
    const { data: profile } = uid
      ? await supabase.from("profiles").select("approval_status").eq("id", uid).single()
      : { data: null };

    if (profile?.approval_status !== "approved") {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        profile?.approval_status === "rejected"
          ? "Seu cadastro não foi aprovado. Você pode se cadastrar novamente ou falar com a gente."
          : "Seu cadastro ainda está em análise. Você vai receber um e-mail assim que for aprovado."
      );
      return;
    }

    setLoading(false);
    const next = searchParams.get("next") ?? "/";
    router.push(next);
    router.refresh();
  }

  async function handleDocFileChange(slot: DocSlotKey, e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0] ?? null;
    setDocErrors((prev) => ({ ...prev, [slot]: null }));
    if (rawFile && rawFile.size > MAX_PHOTO_BYTES) {
      setDocErrors((prev) => ({ ...prev, [slot]: "O arquivo precisa ter até 8MB." }));
      setDocFiles((prev) => ({ ...prev, [slot]: null }));
      e.target.value = "";
      return;
    }
    // Converte HEIC/HEIF (padrão do iPhone) pra JPEG aqui mesmo, antes de
    // guardar o arquivo — assim a pré-visualização e o envio já usam algo
    // que qualquer navegador consegue exibir.
    const file = rawFile ? await convertHeicIfNeeded(rawFile) : null;
    setDocFiles((prev) => ({ ...prev, [slot]: file }));
    setDocPreviews((prev) => ({ ...prev, [slot]: file ? URL.createObjectURL(file) : null }));
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
    const isDigital = documentType === "digital";
    if (!docFiles.front) {
      setError(isDigital ? "Envie o documento." : "Envie o documento (frente).");
      return;
    }
    if (!isDigital && !docFiles.back) {
      setError("Envie o documento (verso).");
      return;
    }
    if (!docFiles.selfie) {
      setError("Envie a selfie.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("username", username.trim());
    formData.set("email", email.trim());
    formData.set("phone", normalizePhone(phone));
    formData.set("cpf", cpf.replace(/\D/g, ""));
    formData.set("inWhatsappGroup", inWhatsappGroup);
    formData.set("password", password);
    formData.set("documentType", documentType);
    formData.set("front", docFiles.front);
    if (docFiles.back) formData.set("back", docFiles.back);
    formData.set("selfie", docFiles.selfie);

    const result = await signUpComDocumentos(formData);

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível concluir o cadastro. Tente novamente.");
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
            Cadastro enviado
          </h1>
          <p className="text-sm font-normal leading-relaxed text-[#5B6470]">
            Recebemos seus dados, documento e selfie. Um administrador vai analisar tudo em breve —
            você recebe um e-mail em <strong>{email}</strong> assim que seu cadastro for aprovado
            (e já pode fazer login normalmente).
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

            <div className="border-t border-sand-200 pt-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
                Verificação de identidade
              </p>
              <p className="mb-3 text-[12.5px] font-normal text-[#8A8F98]">
                Envie seu documento e uma selfie já aqui — um admin analisa tudo antes de liberar seu
                acesso.
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDocumentType("fisico")}
                  className={`rounded-lg border px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${
                    documentType === "fisico"
                      ? "border-dourado bg-dourado-tint text-dourado-dark"
                      : "border-sand-400 text-[#5B6470] hover:border-obsidian-900 hover:text-obsidian-900"
                  }`}
                >
                  Documento físico (frente e verso)
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentType("digital")}
                  className={`rounded-lg border px-3.5 py-2.5 text-[12.5px] font-semibold transition-colors ${
                    documentType === "digital"
                      ? "border-dourado bg-dourado-tint text-dourado-dark"
                      : "border-sand-400 text-[#5B6470] hover:border-obsidian-900 hover:text-obsidian-900"
                  }`}
                >
                  CNH Digital, RG Digital ou documento único (PDF)
                </button>
              </div>

              <div className="space-y-4">
                <DocSlot
                  slotKey="front"
                  label={FRONT_LABELS[documentType].label}
                  hint={FRONT_LABELS[documentType].hint}
                  accept={documentType === "digital" ? "image/*,application/pdf" : "image/*"}
                  capture={documentType === "digital" ? undefined : "environment"}
                  file={docFiles.front}
                  previewUrl={docPreviews.front}
                  error={docErrors.front}
                  onChange={(e) => handleDocFileChange("front", e)}
                />

                {documentType === "fisico" && (
                  <DocSlot
                    slotKey="back"
                    label="Documento (verso)"
                    hint="O mesmo documento, lado de trás."
                    accept="image/*"
                    capture="environment"
                    file={docFiles.back}
                    previewUrl={docPreviews.back}
                    error={docErrors.back}
                    onChange={(e) => handleDocFileChange("back", e)}
                  />
                )}

                <DocSlot
                  slotKey="selfie"
                  label="Selfie"
                  hint="Uma foto sua, de rosto, tirada na hora (abra a câmera frontal)."
                  accept="image/*"
                  capture="user"
                  file={docFiles.selfie}
                  previewUrl={docPreviews.selfie}
                  error={docErrors.selfie}
                  onChange={(e) => handleDocFileChange("selfie", e)}
                />
              </div>
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
