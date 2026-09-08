export default function AutenticidadePage() {
  return (
    <div>
      <p className="mb-3.5 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
        Como funciona a verificação
      </p>
      <h1 className="max-w-[20ch] font-serif text-[46px] font-medium leading-[1.04] text-obsidian-900">
        O que o Cheiro Novo verifica e o que não verifica
      </h1>

      <div className="mb-2 mt-8 max-w-[62ch] rounded-card border border-dourado-tint-border bg-dourado-tint px-[22px] py-5">
        <p className="text-[15px] font-normal leading-[1.7] text-[#3C434C]">
          Importante: nós <strong className="font-semibold text-dourado-dark">não verificamos fisicamente</strong>{" "}
          se um frasco é original ou o nível real do líquido. O que fazemos é reunir o{" "}
          <strong className="font-semibold text-dourado-dark">histórico e a reputação</strong> de cada vendedor
          dentro da comunidade, para que você tenha mais informação antes de negociar em outro lugar
          (Facebook, WhatsApp, etc).
        </p>
      </div>

      <div className="mt-9 max-w-[62ch] border-t border-sand-300">
        <Section title={'O que é o selo "✓ verificado"'}>
          Aparece automaticamente no perfil de quem já concluiu pelo menos 3 vendas na plataforma, com
          confirmação dupla de comprador e vendedor. Não é uma checagem de identidade nem de documentos —
          é um indicador de que essa pessoa já negociou várias vezes por aqui e tem histórico registrado.
        </Section>
        <Section title="Como o score de confiabilidade é calculado">
          O score de 0 a 100 combina a nota média recebida, a quantidade de vendas concluídas, o tempo de
          participação na comunidade e denúncias aprovadas contra o vendedor. Quanto mais negócios
          concluídos com confirmação dupla e boas avaliações, maior o score.
        </Section>
        <Section title="Confirmação dupla">
          Toda transação registrada só é considerada concluída depois que comprador e vendedor confirmam,
          cada um, que receberam o que combinaram. Só depois disso a avaliação fica liberada, isso evita
          que alguém se autoavalie ou infle a própria reputação.
        </Section>
        <Section title="Como conferir o frasco você mesmo" last>
          Antes de fechar negócio, peça sempre: foto do frasco ao lado de um papel com o nome do vendedor e
          a data, foto do lote (rótulo e caixa, os dois têm que bater) e, se possível, vídeo do nível do
          líquido. Consulte também as{" "}
          <a href="/regras" className="border-b border-dourado-tint-border text-dourado-dark">
            regras do fórum
          </a>{" "}
          para mais dicas de segurança.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={`py-[30px] ${last ? "" : "border-b border-sand-300"}`}>
      <h2 className="mb-2.5 text-[19px] font-bold leading-tight text-obsidian-900">{title}</h2>
      <p className="text-[15px] font-normal leading-[1.75] text-[#3C434C]">{children}</p>
    </section>
  );
}
