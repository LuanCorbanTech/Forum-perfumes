import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

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

  const navLinkClass = "text-[#C9CDD3] transition-colors hover:text-dourado";

  return (
    <header className="sticky top-0 z-40 h-[68px] border-b border-obsidian-600 bg-obsidian-900">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-5 px-4 sm:px-7">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image src="/logo.png" alt="Cheiro Novo" width={38} height={38} className="rounded-md" priority />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-2xl font-semibold tracking-[0.01em] text-white">Cheiro Novo</span>
            <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.02em] text-dourado">
              by João Barbosa
            </span>
          </span>
        </Link>

        <div className="hidden shrink-0 items-center gap-2.5 border-l border-white/10 pl-[18px] min-[720px]:flex">
          <a
            href="https://www.instagram.com/canalcheironovo/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram do Cheiro Novo"
            className="grid h-9 w-9 place-items-center rounded-full border border-dourado/30 bg-obsidian-800 text-dourado transition-colors hover:border-dourado hover:bg-dourado hover:text-obsidian-900"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
          </a>
          <a
            href="https://www.youtube.com/@canalcheironovo"
            target="_blank"
            rel="noreferrer"
            aria-label="Canal no YouTube"
            className="grid h-9 w-9 place-items-center rounded-full border border-dourado/30 bg-obsidian-800 text-dourado transition-colors hover:border-dourado hover:bg-dourado hover:text-obsidian-900"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
              <path d="M10.2 9.4l4.6 2.6-4.6 2.6z" />
            </svg>
          </a>
        </div>

        <nav className="ml-auto flex shrink-0 items-center gap-[22px] text-[13px] font-normal">
          <Link href="/busca" className={`hidden min-[880px]:inline ${navLinkClass}`}>
            Buscar
          </Link>
          {user && (
            <Link href={`/perfil/${user.id}`} className={`hidden min-[880px]:inline ${navLinkClass}`}>
              Perfil
            </Link>
          )}
          <Link href="/autenticidade" className={`hidden min-[880px]:inline ${navLinkClass}`}>
            Autenticidade
          </Link>
          <Link
            href="/busca"
            aria-label="Buscar"
            className="inline-flex min-[880px]:hidden"
            style={{ color: "#C9CDD3", fontSize: 17, lineHeight: 1 }}
          >
            ⌕
          </Link>
          {profile?.is_admin && (
            <Link href="/admin" className="hidden text-dourado transition-colors hover:text-dourado-hover min-[880px]:inline">
              Admin
            </Link>
          )}
          {user ? (
            <form action="/auth/sair" method="post">
              <button className="text-[13px] font-normal text-[#9AA1A9] transition-colors hover:text-crimson">
                Sair
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-dourado px-4 py-[9px] text-[11px] font-semibold uppercase tracking-[0.02em] text-obsidian-900 transition-colors hover:bg-dourado-hover"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
