import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Middleware: mantém a sessão do Supabase sincronizada em cada request
// e protege rotas que exigem login (admin, transações, denúncias).
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Atrás de um proxy reverso (ex.: DigitalOcean App Platform), a origem
  // derivada de request.url/request.nextUrl pode vir errada — aponta pro
  // endereço interno do container (ex.: "http://localhost:8080") em vez do
  // domínio público que a pessoa realmente está usando (mesmo problema já
  // corrigido em src/app/auth/callback/route.ts e src/app/auth/sair/route.ts).
  // Por isso preferimos a variável de ambiente pública configurada no App
  // (NEXT_PUBLIC_SITE_URL), caindo pra origem da requisição só como reserva
  // (ex.: rodando localmente, sem essa variável).
  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin).replace(/\/$/, "");

  // Compara por segmento de rota (não por substring): "/conta" deve
  // proteger "/conta" e "/conta/x", mas não páginas como "/contato".
  const protectedPrefixes = ["/transacoes", "/denuncias", "/admin", "/conta"];
  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", siteOrigin);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL("/", siteOrigin));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
