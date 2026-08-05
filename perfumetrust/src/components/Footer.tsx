import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-ink-700 bg-ink-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-4 py-11 sm:px-7">
        <span className="flex items-center gap-3.5">
          <Image src="/logo.png" alt="Cheiro Novo" width={36} height={36} className="rounded-xl" />
          <span className="font-serif text-xl text-ink-100">
            Cheiro Novo <span className="text-ink-500">·</span>{" "}
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
              desapego
            </span>
          </span>
        </span>
        <nav className="flex flex-wrap gap-6 text-sm text-ink-400">
          <Link href="/regras" className="hover:text-gold-400">
            Regras do fórum
          </Link>
          <Link href="/autenticidade" className="hover:text-gold-400">
            Como verificamos frascos
          </Link>
          <Link href="/busca" className="hover:text-gold-400">
            Denunciar anúncio
          </Link>
          <Link href="/contato" className="hover:text-gold-400">
            Contato
          </Link>
          <a
            href="https://www.youtube.com/@canalcheironovo/shorts"
            target="_blank"
            rel="noreferrer"
            className="text-gold-300 hover:text-gold-200"
          >
            Canal no YouTube ↗
          </a>
        </nav>
      </div>
    </footer>
  );
}
