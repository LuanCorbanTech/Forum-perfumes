import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Atrás de um proxy reverso (ex.: DigitalOcean App Platform), o "origin"
  // derivado de request.url pode vir errado — aponta pro endereço interno
  // do container (ex.: "http://localhost:8080") em vez do domínio público
  // que a pessoa realmente está usando (mesmo problema já corrigido em
  // src/app/auth/callback/route.ts). Por isso preferimos a variável de
  // ambiente pública configurada no App (NEXT_PUBLIC_SITE_URL), caindo pro
  // "origin" só como reserva (ex.: rodando localmente, sem essa variável).
  const { origin } = new URL(request.url);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/\/$/, "");

  return NextResponse.redirect(`${siteUrl}/`);
}
