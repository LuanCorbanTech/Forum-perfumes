"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sessão expirada. Faça login de novo." };

  const { data: callerProfile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!callerProfile?.is_admin) return { ok: false as const, error: "Só administradores podem fazer isso." };

  return { ok: true as const, userId: user.id };
}

function isValidUsername(raw: string): boolean {
  return /^[a-zA-Z0-9_]{3,24}$/.test(raw.trim());
}

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

function friendlyDbError(message: string): string {
  if (/profiles_email_key/.test(message)) return "Esse e-mail já está em uso por outra conta.";
  if (/profiles_phone_key/.test(message)) return "Esse telefone já está cadastrado.";
  if (/idx_profiles_username_unique/.test(message)) return "Esse nome de usuário já está em uso.";
  if (/already registered|already exists|has already been registered/i.test(message)) {
    return "Esse e-mail já está em uso por outra conta.";
  }
  return message;
}

interface SimpleResult {
  ok: boolean;
  error?: string;
}

// Promove uma conta que a pessoa JÁ TEM (mesmo e-mail/senha que ela já usa
// pra logar) a administrador — ao contrário de "Criar administrador" (em
// /admin/administradores), isso não cria nenhuma conta nova, então não tem
// risco de duplicar e-mail nem de perder o histórico da conta (avaliações,
// vendas, nota de confiança etc.). Também libera o acesso (approval_status
// = "approved") caso a conta ainda estivesse pendente ou nunca tivesse
// passado pela verificação de identidade — admin não precisa disso.
export async function promoteToAdmin(userId: string): Promise<SimpleResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("profiles")
    .update({ is_admin: true, approval_status: "approved" })
    .eq("id", userId);

  if (error) {
    return { ok: false, error: friendlyDbError(error.message) };
  }

  return { ok: true };
}

// Corrige o e-mail e/ou nome de usuário de QUALQUER conta (cliente comum
// ou admin) — útil, por exemplo, quando uma conta de admin foi criada com
// um e-mail provisório e precisa ser trocada pelo definitivo depois, sem
// precisar apagar e recriar nada. Atualiza tanto o login (Supabase Auth)
// quanto a cópia em "profiles", checando duplicidade ANTES de mexer em
// qualquer um dos dois (pra nunca deixar e-mail e login dessincronizados
// no meio do caminho).
export async function updateUserCredentials(
  userId: string,
  newEmail: string,
  newUsername: string | null
): Promise<SimpleResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const email = newEmail.trim().toLowerCase();
  const username = newUsername?.trim() || null;

  if (!isValidEmail(email)) {
    return { ok: false, error: "E-mail inválido." };
  }
  if (username && !isValidUsername(username)) {
    return { ok: false, error: "Nome de usuário deve ter 3 a 24 letras, números ou _ (sem espaço/acento)." };
  }

  const adminClient = createAdminClient();

  const { data: emailConflict } = await adminClient
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .neq("id", userId)
    .maybeSingle();
  if (emailConflict) {
    return { ok: false, error: "Esse e-mail já está em uso por outra conta." };
  }

  if (username) {
    const { data: usernameConflict } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .neq("id", userId)
      .maybeSingle();
    if (usernameConflict) {
      return { ok: false, error: "Esse nome de usuário já está em uso por outra conta." };
    }
  }

  // email_confirm: true evita qualquer fluxo de "confirme seu novo e-mail"
  // do Supabase Auth (não usamos isso em lugar nenhum do site — o login já
  // fica liberado direto assim que o admin aprova, ver LoginForm.tsx).
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email,
    email_confirm: true,
  });
  if (authError) {
    return { ok: false, error: friendlyDbError(authError.message) };
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ email, username })
    .eq("id", userId);
  if (profileError) {
    return {
      ok: false,
      error: `O e-mail de login foi trocado, mas não deu pra atualizar o cadastro (${profileError.message}). Me avise pra corrigir manualmente.`,
    };
  }

  return { ok: true };
}
