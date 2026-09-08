import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fallback para fluxos de magic link por e-mail (caso habilitado no
// painel do Supabase além do código OTP de 6 dígitos usado em /login).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Atrás de um proxy reverso (ex.: DigitalOcean App Platform), o "origin"
  // derivado de request.url pode vir errado — aponta pro endereço interno
  // do container (ex.: "http://localhost:8080") em vez do domínio público
  // que a pessoa realmente está usando. Por isso preferimos a variável de
  // ambiente pública configurada no App (NEXT_PUBLIC_SITE_URL), caindo pro
  // "origin" só como reserva (ex.: rodando localmente, sem essa variável).
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/\/$/, "");

  return NextResponse.redirect(`${siteUrl}${next}`);
}
