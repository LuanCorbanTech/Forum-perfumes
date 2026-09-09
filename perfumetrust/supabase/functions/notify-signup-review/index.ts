// Edge Function: notify-signup-review
//
// Dispara um e-mail (via Brevo) avisando a pessoa que o cadastro dela foi
// aprovado ou recusado. É chamada por SignupReviewActions.tsx logo depois
// que a RPC admin_review_signup() (migration_007) já confirmou a decisão
// no banco — o e-mail é só um aviso "melhor esforço": se ele falhar por
// qualquer motivo, a aprovação/recusa em si já aconteceu normalmente,
// ninguém fica travado por causa disso.
//
// A chave da Brevo e o remetente NÃO ficam mais em variável de ambiente:
// desde a migration_008, o admin configura os valores abaixo direto pela
// tela /admin/configuracoes (aba "APIs") do site, e ficam guardados na
// tabela admin_settings (só admin lê/escreve lá, via RLS). Esta função lê
// o valor mais recente a cada chamada, então trocar qualquer um deles
// pela tela já vale na hora, sem precisar reimplantar (redeploy) nada:
//   brevo_api_key
//   brevo_sender_email
//   brevo_sender_name
//   email_logo_url    (opcional — logo mostrado no topo do e-mail)
//   email_site_url    (opcional — usado no botão "Ir para o site")
//
// Como fallback (só pra quem preferir configurar por variável de
// ambiente em vez da tela), se uma dessas chaves não estiver na tabela,
// a função tenta o `Deno.env.get` de mesmo nome em maiúsculas.
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

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuração do Supabase ausente." }), { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Lê a chave/remetente configurados em /admin/configuracoes (tabela
    // admin_settings, migration_008) — com fallback pra variável de
    // ambiente pra quem preferir configurar assim.
    const { data: settingsRows } = await admin
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "brevo_api_key",
        "brevo_sender_email",
        "brevo_sender_name",
        "email_logo_url",
        "email_site_url",
      ]);
    const settings = new Map((settingsRows ?? []).map((r: { key: string; value: string | null }) => [r.key, r.value]));

    const brevoApiKey = settings.get("brevo_api_key") || Deno.env.get("BREVO_API_KEY");
    const senderEmail = settings.get("brevo_sender_email") || Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = settings.get("brevo_sender_name") || Deno.env.get("BREVO_SENDER_NAME") || "Cheiro Novo";
    const logoUrl = settings.get("email_logo_url") || Deno.env.get("EMAIL_LOGO_URL") || "";
    const siteUrl = (settings.get("email_site_url") || Deno.env.get("EMAIL_SITE_URL") || "").replace(/\/$/, "");

    if (!brevoApiKey || !senderEmail) {
      // Ainda não configurou a Brevo em /admin/configuracoes — não trava
      // a aprovação/recusa por causa disso, só avisa que o e-mail não saiu.
      return new Response(
        JSON.stringify({ skipped: true, reason: "Chave da Brevo ou e-mail remetente não configurados em /admin/configuracoes." }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

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
    const greeting = firstName ? `Oi, ${escapeHtml(firstName)}!` : "Oi!";

    const subject = approved
      ? "Seu cadastro no Cheiro Novo foi aprovado"
      : "Seu cadastro no Cheiro Novo não foi aprovado";

    const bodyHtml = approved
      ? `<p style="margin:0 0 16px;">${greeting}</p>
         <p style="margin:0 0 16px;">Boa notícia: seu documento e sua selfie foram conferidos, e o seu cadastro no Cheiro Novo foi <strong>aprovado</strong>.</p>
         <p style="margin:0;">Você já pode entrar no site com o e-mail (ou nome de usuário) e a senha que cadastrou, e registrar transações, avaliar vendedores e denunciar problemas normalmente.</p>`
      : `<p style="margin:0 0 16px;">${greeting}</p>
         <p style="margin:0 0 16px;">Conferimos os arquivos que você enviou e, por enquanto, não deu para aprovar seu cadastro no Cheiro Novo.</p>
         ${notes ? `<p style="margin:0 0 16px;"><strong>Motivo:</strong> ${escapeHtml(String(notes))}</p>` : ""}
         <p style="margin:0;">Você pode se cadastrar de novo a qualquer momento (por exemplo, com fotos melhores do documento ou da selfie), ou falar com a gente se preferir entender melhor o motivo.</p>`;

    const htmlContent = buildEmailHtml({
      title: approved ? "Cadastro aprovado" : "Cadastro não aprovado",
      bodyHtml,
      ctaLabel: approved ? "Entrar no site" : "Fazer novo cadastro",
      ctaPath: approved ? "/login" : "/login?modo=cadastro",
      logoUrl,
      siteUrl,
      senderName,
      accent: approved ? "#c59b27" : "#b42318",
    });

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

// Monta o e-mail com a cara do site: cabeçalho escuro com o logo (se
// configurado em /admin/configuracoes), um cartão claro com o conteúdo e um
// botão levando de volta pro site (se a URL do site estiver configurada).
// Tudo com CSS inline propositalmente — é o único jeito que funciona de
// forma consistente nos clientes de e-mail (Gmail, Outlook etc.), que
// ignoram <style> no <head> na maioria das vezes.
function buildEmailHtml({
  title,
  bodyHtml,
  ctaLabel,
  ctaPath,
  logoUrl,
  siteUrl,
  senderName,
  accent,
}: {
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaPath: string;
  logoUrl: string;
  siteUrl: string;
  senderName: string;
  accent: string;
}): string {
  const ctaUrl = siteUrl ? `${siteUrl}${ctaPath}` : "";

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(senderName)}" height="36" style="height:36px;width:auto;display:block;margin:0 auto;" />`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#f4e9cf;letter-spacing:0.02em;">${escapeHtml(senderName)}</span>`;

  const ctaBlock = ctaUrl
    ? `<tr>
         <td align="center" style="padding:28px 32px 8px;">
           <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#12161a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;padding:13px 28px;border-radius:8px;">
             ${escapeHtml(ctaLabel)}
           </a>
         </td>
       </tr>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#faf8f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e1d8;">
            <tr>
              <td align="center" style="background:#12161a;padding:26px 24px;">
                ${logoBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0 0 18px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${accent};">
                  ${escapeHtml(title)}
                </p>
                <div style="font-size:14.5px;line-height:1.6;color:#3c434c;">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            ${ctaBlock}
            <tr>
              <td style="padding:24px 32px 28px;">
                <p style="margin:0;font-size:11.5px;color:#8a8f98;border-top:1px solid #efebe3;padding-top:16px;">
                  ${escapeHtml(senderName)} — este é um e-mail automático, não precisa responder.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
