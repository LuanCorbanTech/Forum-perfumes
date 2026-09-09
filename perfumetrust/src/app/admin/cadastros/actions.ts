"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveContentType } from "@/lib/storageContentType";

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

interface RepairResult {
  ok: boolean;
  fixed?: number;
  checked?: number;
  error?: string;
}

// Corrige de uma vez as fotos já enviadas que ficaram com o Content-Type
// errado (ver src/lib/storageContentType.ts) — baixa cada arquivo e
// regrava no mesmo lugar (upsert), só trocando o tipo declarado. Os bytes
// não mudam, então isso é seguro de rodar quantas vezes quiser.
// Não é mais chamado de nenhum botão na UI (ver ensureCorrectContentType
// abaixo, que faz isso sozinho quando a página é aberta) — deixado aqui só
// como ferramenta de manutenção manual, caso um dia seja útil de novo.
export async function repairPhotoContentTypes(): Promise<RepairResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const adminClient = createAdminClient();

  const { data: rows, error: rowsError } = await adminClient
    .from("profile_kyc")
    .select("document_front_path, document_back_path, selfie_path");
  if (rowsError) return { ok: false, error: rowsError.message };

  const paths = new Set<string>();
  for (const row of rows ?? []) {
    for (const path of [row.document_front_path, row.document_back_path, row.selfie_path]) {
      if (path) paths.add(path);
    }
  }

  let fixed = 0;
  for (const path of paths) {
    const { data: fileBlob, error: downloadError } = await adminClient.storage
      .from("verification-docs")
      .download(path);
    if (downloadError || !fileBlob) continue;

    // Ignora fileBlob.type de propósito: é exatamente o tipo errado já
    // salvo (a causa do ícone quebrado) — a extensão do "path" (que a
    // gente mesmo define no upload original) é a fonte confiável aqui.
    const contentType = resolveContentType({ name: path, type: "" });
    const { error: uploadError } = await adminClient.storage
      .from("verification-docs")
      .upload(path, fileBlob, { contentType, upsert: true });
    if (!uploadError) fixed++;
  }

  return { ok: true, fixed, checked: paths.size };
}

// Versão automática/silenciosa do conserto acima: chamada pelas próprias
// páginas de admin (cadastros, usuários, reprovados) toda vez que elas vão
// mostrar documentos, ANTES de gerar o link assinado — assim ninguém
// precisa clicar em nada, a foto já aparece certa na primeira vez que
// alguém abre a tela. Rápida quando não tem nada errado: um list() por
// pasta só pra checar o tipo já salvo, e só baixa/regrava o arquivo se
// realmente estiver diferente do esperado.
export async function ensureCorrectContentType(paths: (string | null | undefined)[]): Promise<void> {
  const auth = await requireAdmin();
  if (!auth.ok) return;

  const validPaths = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (validPaths.length === 0) return;

  const adminClient = createAdminClient();

  // Agrupa por pasta ("<userId>/arquivo.ext") porque o list() da Storage
  // só lista o conteúdo de uma pasta de cada vez.
  const byFolder = new Map<string, string[]>();
  for (const path of validPaths) {
    const idx = path.lastIndexOf("/");
    const folder = idx === -1 ? "" : path.slice(0, idx);
    const name = idx === -1 ? path : path.slice(idx + 1);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(name);
  }

  for (const [folder, names] of byFolder) {
    const { data: entries } = await adminClient.storage.from("verification-docs").list(folder || undefined);
    if (!entries) continue;

    for (const name of names) {
      const path = folder ? `${folder}/${name}` : name;
      const expected = resolveContentType({ name: path, type: "" });
      const stored = entries.find((e) => e.name === name)?.metadata?.mimetype;
      if (stored === expected) continue; // já está certo, não mexe

      const { data: fileBlob, error: downloadError } = await adminClient.storage
        .from("verification-docs")
        .download(path);
      if (downloadError || !fileBlob) continue;

      await adminClient.storage.from("verification-docs").upload(path, fileBlob, { contentType: expected, upsert: true });
    }
  }
}

interface RejectResult {
  ok: boolean;
  error?: string;
  notice?: string;
}

// Recusa um cadastro: guarda uma cópia dos dados e documentos em
// "rejected_signups" (só consulta, pra você lembrar/explicar depois) e
// APAGA a conta ativa de verdade (auth.users, o que arrasta profiles e
// profile_kyc junto) — assim o CPF/telefone/e-mail/usuário ficam livres
// pra essa pessoa se cadastrar de novo do zero, sem esbarrar em nada.
export async function rejectSignup(userId: string, notes: string | null): Promise<RejectResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const adminClient = createAdminClient();

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (profileError || !profile) {
    return { ok: false, error: "Cadastro não encontrado (talvez já tenha sido removido)." };
  }

  const { data: kyc } = await adminClient
    .from("profile_kyc")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  const { error: archiveError } = await adminClient.from("rejected_signups").insert({
    original_profile_id: profile.id,
    full_name: profile.full_name,
    phone: profile.phone,
    email: profile.email,
    username: profile.username,
    cpf: kyc?.cpf ?? null,
    document_type: kyc?.document_type ?? null,
    document_front_path: kyc?.document_front_path ?? null,
    document_back_path: kyc?.document_back_path ?? null,
    selfie_path: kyc?.selfie_path ?? null,
    notes,
    rejected_by: auth.userId,
  });
  if (archiveError) {
    return { ok: false, error: `Não foi possível arquivar o cadastro (${archiveError.message}). Nada foi apagado.` };
  }

  // Aviso por e-mail é "melhor esforço", igual já era antes — chama ANTES
  // de apagar a conta porque a Edge Function ainda busca o e-mail/nome em
  // "profiles" (que só continua existindo até o deleteUser logo abaixo).
  let notice: string | undefined;
  try {
    const { data, error: notifyError } = await adminClient.functions.invoke("notify-signup-review", {
      body: { userId, approved: false, notes },
    });
    if (notifyError) {
      notice = "Cadastro recusado e arquivado, mas não deu pra confirmar o envio do e-mail de aviso.";
    } else if (data?.skipped) {
      notice = "Cadastro recusado e arquivado. E-mail de aviso não enviado: " + data.reason;
    }
  } catch {
    notice = "Cadastro recusado e arquivado, mas não deu pra confirmar o envio do e-mail de aviso.";
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return {
      ok: false,
      error: `O cadastro foi arquivado e o e-mail foi enviado, mas não foi possível apagar a conta ativa (${deleteError.message}). Me avise pra eu verificar manualmente.`,
    };
  }

  return { ok: true, notice };
}
