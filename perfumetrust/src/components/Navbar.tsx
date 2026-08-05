import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "./SearchBar";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string; is_admin: boolean } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-900/95 backdrop-blur supports-[backdrop-filter]:bg-ink-900/85">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3.5 sm:px-7 lg:flex-nowrap">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/logo.png" alt="Cheiro Novo" width={38} height={38} className="rounded-lg" priority />
          <span className="leading-tight">
            <span className="block font-serif text-lg text-ink-50">Cheiro Novo</span>
            <span className="block font-mono text-[9.5px] uppercase tracking-[0.24em] text-ink-400">
              Desapego
            </span>
          </span>
        </Link>

        <div className="order-3 w-full lg:order-none lg:w-auto lg:flex-1">
          <SearchBar compact />
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-5 font-mono text-[12.5px] tracking-wide">
          <Link href="/" className="text-ink-200 transition hover:text-gold-400">
            Feed
          </Link>
          {user ? (
            <>
              <Link href={`/perfil/${user.id}`} className="text-ink-200 transition hover:text-gold-400">
                Perfil
              </Link>
              <Link href="/autenticidade" className="text-ink-200 transition hover:text-gold-400">
                Autenticidade
              </Link>
              {profile?.is_admin && (
                <Link href="/admin" className="text-gold-400 transition hover:text-gold-300">
                  Admin
                </Link>
              )}
              <form action="/auth/sair" method="post">
                <button className="text-ink-400 transition hover:text-red-400">Sair</button>
              </form>
              <Link
                href="/transacoes/nova"
                className="bg-gold-500 px-4 py-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-950 transition hover:bg-gold-400"
              >
                Anunciar
              </Link>
            </>
          ) : (
            <>
              <Link href="/autenticidade" className="text-ink-200 transition hover:text-gold-400">
                Autenticidade
              </Link>
              <Link href="/login" className="text-ink-200 transition hover:text-gold-400">
                Entrar
              </Link>
              <Link
                href="/login"
                className="bg-gold-500 px-4 py-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-950 transition hover:bg-gold-400"
              >
                Anunciar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
