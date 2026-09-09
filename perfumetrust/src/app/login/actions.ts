"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveContentType } from "@/lib/storageContentType";
import type { DocumentType } from "@/lib/types";

interface SignUpResult {
  ok: boolean;
  error?: string;
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

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

// Traduz os erros mais comuns de dado duplicado (CPF/telefone/usuário já
// cadastrados) pra uma mensagem que a pessoa entende, em vez do genérico
// "Database error saving new user" que o Supabase mostra por padrão.
function friendlyDbError(message: string): string {
  if (/idx_profile_kyc_cpf_unique/.test(message)) return "Esse CPF já está cadastrado.";
  if (/profiles_phone_key/.test(message)) return "Esse telefone já está cadastrado.";
  if (/idx_profiles_username_unique/.test(message)) return "Esse nome de usuário já está em uso.";
  if (/already registered|already exists/i.test(message)) return "Já existe uma conta com esse e-mail.";
  return message;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB, igual VerificacaoForm.tsx

export async function signUpComDocumentos(formData: FormData): Promise<SignUpResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const cpfRaw = String(formData.get("cpf") ?? "").trim();
  const inWhatsappGroup = formData.get("inWhatsappGroup") === "sim";
  const password = String(formData.get("password") ?? "");
  const documentType = (String(formData.get("documentType") ?? "fisico")) as DocumentType;

  const frontFile = formData.get("front");
  const backFile = formData.get("back");
  const selfieFile = formData.get("selfie");

  if (!fullName) return { ok: false, error: "Preenche o nome completo." };
  if (username && !isValidUsername(username)) {
    return { ok: false, error: "Nome de usuário deve ter 3 a 24 letras, números ou _ (sem espaço/acento)." };
  }
  if (!isValidEmail(email)) return { ok: false, error: "Digite um e-mail válido." };
  if (!phoneRaw) return { ok: false, error: "Digite seu telefone (WhatsApp)." };
  if (!isValidCPF(cpfRaw)) return { ok: false, error: "Digite um CPF válido." };
  if (password.length < 8) return { ok: false, error: "A senha precisa ter pelo menos 8 caracteres." };
  if (documentType !== "fisico" && documentType !== "digital") {
    return { ok: false, error: "Tipo de documento inválido." };
  }
  if (!(frontFile instanceof File) || frontFile.size === 0) {
    return { ok: false, error: "Envie o documento (frente)." };
  }
  if (documentType === "fisico" && (!(backFile instanceof File) || backFile.size === 0)) {
    return { ok: false, error: "Envie o documento (verso)." };
  }
  if (!(selfieFile instanceof File) || selfieFile.size === 0) {
    return { ok: false, error: "Envie a selfie." };
  }
  for (const f of [frontFile, backFile, selfieFile]) {
    if (f instanceof File && f.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: "Cada arquivo precisa ter até 8MB." };
    }
  }

  const phone = normalizePhone(phoneRaw);
  const cpf = cpfRaw.replace(/\D/g, "");

  const adminClient = createAdminClient();

  // Confere ANTES de criar a conta no Auth — sem isso, um dado duplicado
  // só falharia depois de já ter criado a conta, deixando pra trás um
  // usuário "pela metade" (existe no Auth, mas sem perfil completo).
  if (username) {
    const { data: existingUsername } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (existingUsername) return { ok: false, error: "Esse nome de usuário já está em uso." };
  }

  const { data: existingPhone } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existingPhone) return { ok: false, error: "Esse telefone já está cadastrado." };

  const { data: existingCpf } = await adminClient
    .from("profile_kyc")
    .select("profile_id")
    .eq("cpf", cpf)
    .maybeSingle();
  if (existingCpf) return { ok: false, error: "Esse CPF já está cadastrado." };

  // Cria a conta já "confirmada" (sem link de e-mail pra clicar) — o
  // acesso de verdade só libera quando um admin aprovar o cadastro
  // (ver profiles.approval_status, checado no login e no middleware).
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      username: username || undefined,
      phone,
      cpf,
      in_whatsapp_group: inWhatsappGroup,
    },
  });

  if (createError || !created?.user) {
    return { ok: false, error: friendlyDbError(createError?.message ?? "Não foi possível criar a conta.") };
  }

  const userId = created.user.id;

  // handle_new_user (trigger em auth.users) já criou "profiles" e
  // "profile_kyc" (com o cpf) a partir do user_metadata acima. Agora só
  // falta subir os arquivos e completar o profile_kyc com os caminhos.
  async function uploadSlot(file: File, slot: "front" | "back" | "selfie"): Promise<string | null> {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${slot}.${ext}`;
    const { error: uploadError } = await adminClient.storage
      .from("verification-docs")
      .upload(path, file, { contentType: resolveContentType(file), upsert: true });
    if (uploadError) return null;
    return path;
  }

  const frontPath = await uploadSlot(frontFile, "front");
  const backPath =
    documentType === "fisico" && backFile instanceof File ? await uploadSlot(backFile, "back") : null;
  const selfiePath = selfieFile instanceof File ? await uploadSlot(selfieFile, "selfie") : null;

  if (!frontPath || !selfiePath || (documentType === "fisico" && !backPath)) {
    // Não deixa pra trás uma conta sem documento nenhum — desfaz tudo e
    // pede pra tentar de novo (o CPF/telefone/e-mail voltam a ficar livres).
    await adminClient.auth.admin.deleteUser(userId);
    return { ok: false, error: "Não foi possível enviar os arquivos. Tente novamente." };
  }

  const { error: kycError } = await adminClient.from("profile_kyc").upsert(
    {
      profile_id: userId,
      cpf,
      in_whatsapp_group: inWhatsappGroup,
      document_type: documentType,
      document_front_path: frontPath,
      document_back_path: backPath,
      selfie_path: selfiePath,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  if (kycError) {
    await adminClient.auth.admin.deleteUser(userId);
    return { ok: false, error: friendlyDbError(kycError.message) };
  }

  return { ok: true };
}
