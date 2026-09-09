"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface CreateAdminInput {
  fullName: string;
  email: string;
  username: string;
  password: string;
}

interface CreateAdminResult {
  ok: boolean;
  error?: string;
}

function isValidUsername(raw: string): boolean {
  return /^[a-zA-Z0-9_]{3,24}$/.test(raw.trim());
}

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

// Cria uma conta de admin direto no Supabase Auth, sem passar pelo cadastro
// público (sem verificação de identidade, sem aprovação manual — o próprio
// admin que está chamando isso já decidiu confiar na pessoa). Só quem já é
// admin consegue chamar (checado abaixo, além da proteção do middleware).
export async function createAdminAccount(input: CreateAdminInput): Promise<CreateAdminResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada. Faça login de novo." };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return { ok: false, error: "Só administradores podem criar outras contas de admin." };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const password = input.password;

  if (!fullName) {
    return { ok: false, error: "Preenche o nome completo." };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "E-mail inválido." };
  }
  if (username && !isValidUsername(username)) {
    return { ok: false, error: "Nome de usuário deve ter 3 a 24 letras, números ou _ (sem espaço/acento)." };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: "A senha precisa ter pelo menos 8 caracteres." };
  }

  const adminClient = createAdminClient();

  // Confere ANTES de criar a conta no Auth — sem isso, um nome de usuário
  // já em uso só falharia depois (no update() logo abaixo), deixando pra
  // trás uma conta criada no Auth mas nunca promovida a admin.
  if (username) {
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: "Esse nome de usuário já está em uso por outra conta." };
    }
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      username: username || undefined,
    },
  });

  if (createError || !created?.user) {
    const message = createError?.message ?? "";
    if (/already registered|already exists/i.test(message)) {
      return { ok: false, error: "Já existe uma conta com esse e-mail." };
    }
    return { ok: false, error: message || "Não foi possível criar a conta." };
  }

  // O gatilho handle_new_user já criou a linha em "profiles" a partir do
  // user_metadata acima. Aqui só promovemos a conta pra admin já aprovada —
  // o trigger protect_profile_columns libera essas colunas porque estamos
  // usando a service-role key (ver migration_003/migration_009).
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      is_admin: true,
      approval_status: "approved",
      username: username || null,
    })
    .eq("id", created.user.id);

  if (updateError) {
    // Desfaz a criação no Auth pra não deixar pra trás uma conta "pela
    // metade" (existe no Auth, mas nunca virou admin de verdade) — melhor
    // a pessoa tentar de novo do zero com um nome de usuário diferente.
    await adminClient.auth.admin.deleteUser(created.user.id);
    return {
      ok: false,
      error: `Não foi possível marcar a conta como admin (${updateError.message}). Nada foi criado — tenta de novo.`,
    };
  }

  return { ok: true };
}
