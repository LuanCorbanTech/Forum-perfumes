export default function ContatoPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">contato</p>
        <h1 className="font-serif text-[34px] font-medium leading-[1.1] text-obsidian-900">Fale com a gente</h1>
      </div>

      <p className="text-[14.5px] font-normal leading-relaxed text-[#3C434C]">
        Dúvidas, sugestões ou problemas com a plataforma? O jeito mais rápido de falar com o Cheiro Novo é
        pelo Instagram ou pelos comentários do canal no YouTube.
      </p>

      <div className="space-y-3">
        <a
          href="https://instagram.com/canalcheironovo"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-card border border-sand-300 bg-white p-4 transition-colors hover:border-dourado"
        >
          <span className="text-obsidian-900">Instagram</span>
          <span className="text-sm font-semibold text-dourado-dark">@canalcheironovo</span>
        </a>
        <a
          href="https://www.youtube.com/@canalcheironovo/shorts"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-card border border-sand-300 bg-white p-4 transition-colors hover:border-dourado"
        >
          <span className="text-obsidian-900">YouTube</span>
          <span className="text-sm font-semibold text-dourado-dark">Canal Cheiro Novo ↗</span>
        </a>
      </div>

      <p className="text-sm font-normal text-[#8A8F98]">
        Para denunciar um vendedor específico, use o botão de denúncia no perfil da pessoa em vez de
        entrar em contato por aqui assim nossa equipe consegue analisar mais rápido.
      </p>
    </div>
  );
}
