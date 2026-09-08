// Edge Function: notify-signup-review
//
// Dispara um e-mail (via Brevo) avisando a pessoa que o cadastro dela foi
// aprovado ou recusado. É chamada por SignupReviewActions.tsx logo depois
// que a RPC admin_review_signup() (migration_007) já confirmou a decisão
// no banco — o e-mail é só um aviso "melhor esforço": se ele falhar por
// qualquer motivo, a aprovação/recusa em si já aconteceu normalmente,
// ninguém fica travado por causa disso.
//
// Variáveis de ambiente necessárias (configure com `supabase secrets set`,
// ver README.md nesta mesma pasta para o passo a passo completo):
//   BREVO_API_KEY      -> chave de API gerada em brevo.com (Settings > SMTP & API > API Keys)
//   BREVO_SENDER_EMAIL -> e-mail remetente, precisa estar verificado na Brevo
//   BREVO_SENDER_NAME  -> nome exibido como remetente (opcional, padrão "Cheiro Novo")
//
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm prontos automaticamente
// no ambiente de Edge Functions do Supabase, não precisa configurar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { userId, approved, notes } = await req.json();
    if (!userId || typeof approved !== "boolean") {
      return new Response(JSON.stringify({ error: "userId e approved são obrigatórios." }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") ?? "Cheiro Novo";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuração do Supabase ausente." }), { status: 500 });
    }

    if (!brevoApiKey || !senderEmail) {
      // Ainda não configurou a Brevo (ver README.md) — não trava a
      // aprovação/recusa por causa disso, só avisa que o e-mail não saiu.
      return new Response(
        JSON.stringify({ skipped: true, reason: "BREVO_API_KEY ou BREVO_SENDER_EMAIL não configurados." }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Pessoa não tem e-mail cadastrado." }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    const firstName = (profile.full_name ?? "").trim().split(" ")[0] || "";
    const greeting = firstName ? `Oi, ${firstName}!` : "Oi!";

    const subject = approved
      ? "Seu cadastro no Cheiro Novo foi aprovado"
      : "Sua verificação no Cheiro Novo precisa ser reenviada";

    const htmlContent = approved
      ? `<p>${greeting}</p>
         <p>Boa notícia: seu documento e sua selfie foram conferidos, e o seu cadastro no Cheiro Novo foi <strong>aprovado</strong>.</p>
         <p>Agora você já pode registrar transações, avaliar vendedores e denunciar problemas normalmente no site.</p>`
      : `<p>${greeting}</p>
         <p>Conferimos as fotos que você enviou e, por enquanto, não deu para aprovar seu cadastro no Cheiro Novo.</p>
         ${notes ? `<p><strong>Motivo:</strong> ${escapeHtml(String(notes))}</p>` : ""}
         <p>Entre no site e acesse "Verificação de identidade" para reenviar o documento e a selfie.</p>`;

    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: profile.email, name: profile.full_name || undefined }],
        subject,
        htmlContent,
      }),
    });

    if (!brevoResponse.ok) {
      const errText = await brevoResponse.text();
      return new Response(JSON.stringify({ error: `Brevo respondeu com erro: ${errText}` }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});

function escapeHtml(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c] ?? c);
}
