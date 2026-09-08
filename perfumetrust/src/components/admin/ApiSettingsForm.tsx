"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ADMIN_SETTING_KEYS } from "@/lib/types";

interface Props {
  initialApiKey: string;
  initialSenderEmail: string;
  initialSenderName: string;
}

// Tela onde o admin guarda a chave da Brevo direto pelo site, sem precisar
// de linha de comando (ver migration_008). A Edge Function
// notify-signup-review lê esses 3 valores do banco a cada envio, então
// salvar aqui já vale na próxima aprovação/recusa de cadastro.
export function ApiSettingsForm({ initialApiKey, initialSenderEmail, initialSenderName }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [apiKey, setApiKey] = useState(initialApiKey);
  const [senderEmail, setSenderEmail] = useState(initialSenderEmail);
  const [senderName, setSenderName] = useState(initialSenderName);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const rows = [
      { key: ADMIN_SETTING_KEYS.BREVO_API_KEY, value: apiKey.trim() || null },
      { key: ADMIN_SETTING_KEYS.BREVO_SENDER_EMAIL, value: senderEmail.trim() || null },
      { key: ADMIN_SETTING_KEYS.BREVO_SENDER_NAME, value: senderName.trim() || null },
    ].map((row) => ({ ...row, updated_at: new Date().toISOString(), updated_by: user?.id ?? null }));

    const { error } = await supabase.from("admin_settings").upsert(rows, { onConflict: "key" });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-card border border-sand-300 bg-white p-6">
      <div>
        <p className="text-sm font-semibold text-obsidian-900">Brevo (envio de e-mail)</p>
        <p className="mt-1 text-[12.5px] font-normal leading-relaxed text-[#8A8F98]">
          Usada pra avisar por e-mail quando você aprova ou recusa um cadastro em{" "}
          <span className="font-medium text-[#5B6470]">/admin/cadastros</span>. Pegue a chave em
          brevo.com, em Configurações {"->"} SMTP e API {"->"} Chaves de API.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2.5 text-[12.5px] text-crimson">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-verde-tint-border bg-verde-tint p-2.5 text-[12.5px] text-verde">
          Configurações salvas. Já valem no próximo envio.
        </p>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Chave de API da Brevo
        </label>
        <div className="flex gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="xkeysib-..."
            autoComplete="off"
            className="h-11 flex-1 rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="shrink-0 rounded-lg border border-sand-400 px-3 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#5B6470] transition-colors hover:border-obsidian-900 hover:text-obsidian-900"
          >
            {showKey ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          E-mail remetente (verificado na Brevo)
        </label>
        <input
          type="email"
          value={senderEmail}
          onChange={(e) => setSenderEmail(e.target.value)}
          placeholder="contato@cheironovo.com.br"
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Nome do remetente
        </label>
        <input
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          placeholder="Cheiro Novo"
          className="h-11 w-full rounded-lg border border-sand-400 bg-white px-3 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-obsidian-900 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
      >
        {loading ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}
