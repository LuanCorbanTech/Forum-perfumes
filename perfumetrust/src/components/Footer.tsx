import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const linkClass = "text-[#C9CDD3] transition-colors hover:text-dourado";

  return (
    <footer className="border-t border-obsidian-600 bg-obsidian-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-8 px-4 py-[52px] sm:px-7">
        <div>
          <span className="flex items-center gap-3">
            <Image src="/logo.png" alt="Cheiro Novo" width={34} height={34} className="rounded-md" />
            <span className="flex flex-col leading-none">
              <span className="font-serif text-[22px] font-semibold text-white">Cheiro Novo</span>
              <span className="mt-1 text-[8.5px] font-semibold uppercase tracking-[0.02em] text-dourado">
                by João Barbosa
              </span>
            </span>
          </span>
          <p className="mt-4 max-w-[34ch] text-[12.5px] font-normal leading-relaxed text-[#8A8F98]">
            Reputação pública para o grupo de desapego. Feito por quem compra e vende perfume de verdade.
          </p>
        </div>

        <nav className="grid grid-cols-[repeat(auto-fit,minmax(150px,auto))] gap-x-11 gap-y-3 text-[13px] font-normal">
          <Link href="/regras" className={linkClass}>
            Regras do fórum
          </Link>
          <Link href="/termos" className={linkClass}>
            Termos de uso
          </Link>
          <Link href="/autenticidade" className={linkClass}>
            Como verificamos frascos
          </Link>
          <Link href="/busca" className={linkClass}>
            Denunciar vendedor
          </Link>
          <Link href="/contato" className={linkClass}>
            Contato
          </Link>
          <a
            href="https://www.youtube.com/@canalcheironovo/shorts"
            target="_blank"
            rel="noreferrer"
            className="text-dourado transition-colors hover:text-white"
          >
            Canal no YouTube ↗
          </a>
        </nav>
      </div>

      <div className="border-t border-obsidian-600">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-8 gap-y-2.5 px-4 py-[18px] sm:px-7">
          <p className="max-w-[74ch] text-[11.5px] font-normal leading-relaxed text-[#6E757D]">
            O Cheiro Novo é uma ferramenta de consulta de reputação e verificação de identidade. Não
            intermediamos pagamentos nem possuímos responsabilidade financeira sobre as negociações.
          </p>
          <p className="whitespace-nowrap text-[11.5px] font-normal text-[#6E757D]">© 2026 Cheiro Novo</p>
        </div>
      </div>
    </footer>
  );
}
