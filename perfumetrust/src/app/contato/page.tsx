export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.26em] text-gold-500">contato</p>
        <h1 className="font-serif text-3xl font-light text-ink-50">Fale com a gente</h1>
      </div>

      <p className="text-[14.5px] leading-relaxed text-ink-300">
        Dúvidas, sugestões ou problemas com a plataforma? O jeito mais rápido de falar com o Cheiro Novo é
        pelo Instagram ou pelos comentários do canal no YouTube.
      </p>

      <div className="space-y-3">
        <a
          href="https://instagram.com/canalcheironovo"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between border border-ink-700 bg-ink-800 p-4 transition hover:border-gold-500/40"
        >
          <span className="text-ink-100">Instagram</span>
          <span className="font-mono text-sm text-gold-300">@canalcheironovo</span>
        </a>
        <a
          href="https://www.youtube.com/@canalcheironovo/shorts"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between border border-ink-700 bg-ink-800 p-4 transition hover:border-gold-500/40"
        >
          <span className="text-ink-100">YouTube</span>
          <span className="font-mono text-sm text-gold-300">Canal Cheiro Novo ↗</span>
        </a>
      </div>

      <p className="text-sm text-ink-500">
        Para denunciar um vendedor específico, use o botão de denúncia no perfil da pessoa em vez de
        entrar em contato por aqui — assim nossa equipe consegue analisar mais rápido.
      </p>
    </div>
  );
}
