import { ApiSettingsForm } from "@/components/admin/ApiSettingsForm";
import { ADMIN_SETTING_KEYS, type AdminSetting } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminConfiguracoesPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("admin_settings")
    .select("*")
    .in("key", Object.values(ADMIN_SETTING_KEYS))
    .returns<AdminSetting[]>();

  const byKey = new Map((rows ?? []).map((row) => [row.key, row.value ?? ""]));

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Administração</p>
      <h1 className="mb-2 font-serif text-4xl font-medium leading-none text-obsidian-900">Configurações</h1>
      <p className="mb-7 max-w-[62ch] text-[14.5px] font-normal leading-relaxed text-[#5B6470]">
        Chaves de integrações usadas pelo site. Ficam guardadas só pra admin (nenhum outro usuário
        consegue ler esta página nem esses valores).
      </p>

      <ApiSettingsForm
        initialApiKey={byKey.get(ADMIN_SETTING_KEYS.BREVO_API_KEY) ?? ""}
        initialSenderEmail={byKey.get(ADMIN_SETTING_KEYS.BREVO_SENDER_EMAIL) ?? ""}
        initialSenderName={byKey.get(ADMIN_SETTING_KEYS.BREVO_SENDER_NAME) ?? ""}
      />
    </div>
  );
}
