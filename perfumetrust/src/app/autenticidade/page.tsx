export default function AutenticidadePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.26em] text-gold-500">
          como funciona a verificação
        </p>
        <h1 className="font-serif text-3xl font-light text-ink-50">
          O que o Cheiro Novo verifica — e o que não verifica
        </h1>
      </div>

      <div className="border border-gold-500/30 bg-gold-500/5 p-5">
        <p className="text-[14px] leading-relaxed text-ink-200">
          Importante: nós <strong className="text-gold-300">não verificamos fisicamente</strong> se um
          frasco é original ou o nível real do líquido. O que fazemos é reunir o{" "}
          <strong className="text-gold-300">histórico e a reputação</strong> de cada vendedor dentro da
          comunidade, para que você tenha mais informação antes de negociar em outro lugar (Facebook,
          WhatsApp, etc).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-ink-50">O que é o selo &ldquo;✓ verificado&rdquo;</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          Aparece automaticamente no perfil de quem já concluiu pelo menos 3 vendas na plataforma, com
          confirmação dupla de comprador e vendedor. Não é uma checagem de identidade nem de documentos —
          é um indicador de que essa pessoa já negociou várias vezes por aqui e tem histórico registrado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-ink-50">Como o score de confiabilidade é calculado</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          O score de 0 a 100 combina a nota média recebida, a quantidade de vendas concluídas, o tempo de
          participação na comunidade e denúncias aprovadas contra o vendedor. Quanto mais negócios
          concluídos com confirmação dupla e boas avaliações, maior o score.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-ink-50">Confirmação dupla</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          Toda transação registrada só é considerada concluída depois que <strong>comprador e vendedor</strong>{" "}
          confirmam, cada um, que receberam o que combinaram. Só depois disso a avaliação fica liberada —
          isso evita que alguém se autoavalie ou infle a própria reputação.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-ink-50">Como conferir o frasco você mesmo</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          Antes de fechar negócio, peça sempre: foto do frasco ao lado de um papel com o nome do vendedor e
          a data, foto do lote (rótulo e caixa, os dois têm que bater) e, se possível, vídeo do nível do
          líquido. Consulte também as{" "}
          <a href="/regras" className="text-gold-300 hover:underline">
            regras do fórum
          </a>{" "}
          para mais dicas de segurança.
        </p>
      </section>
    </div>
  );
}
