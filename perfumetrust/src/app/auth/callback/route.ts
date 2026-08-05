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

  return NextResponse.redirect(`${origin}${next}`);
}
