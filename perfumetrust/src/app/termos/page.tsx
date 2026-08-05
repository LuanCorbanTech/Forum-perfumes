function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[14px_1fr] items-start gap-2.5">
          <span className="mt-1.5 h-1 w-1 rounded-full bg-gold-500" />
          <span className="text-[14.5px] leading-relaxed text-ink-300">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.26em] text-gold-500">
          leia antes de usar o site
        </p>
        <h1 className="font-serif text-3xl font-light text-ink-50">
          Termos de uso e isenção de responsabilidade
        </h1>
        <p className="mt-2 text-sm text-ink-400">Última atualização: Agosto de 2026</p>
      </div>

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink-50">1. Natureza da plataforma</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          O Cheiro Novo atua exclusivamente como um diretório, fórum e catálogo informativo de
          reputação para a comunidade de colecionadores e entusiastas de perfumaria. A plataforma
          tem como objetivo expor históricos de transações e avaliações voluntárias informadas
          pelos próprios usuários.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink-50">
          2. Isenção de intermediação financeira e logística
        </h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          O Cheiro Novo <strong className="text-ink-100">NÃO</strong> é um e-commerce, mercado
          pago, meio de pagamento ou instituição financeira, e <strong className="text-ink-100">NÃO</strong> realiza:
        </p>
        <Bullets
          items={[
            "Intermediação, custódia ou retenção de valores;",
            "Garantia de entrega, envio ou logística de produtos;",
            "Emissão de notas fiscais ou controle de estoques;",
            "Verificação presencial da autenticidade física dos frascos.",
          ]}
        />
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-300">
          Todas as transações, pagamentos, fretes e trocas ocorrem inteiramente por conta e risco
          das partes envolvidas (comprador e vendedor) em ambientes externos à plataforma (como
          WhatsApp, PIX, transferência bancária ou redes sociais).
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink-50">
          3. Limite de acesso e formalização do vendedor
        </h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          A atuação do Cheiro Novo restringe-se, única e exclusivamente, ao registro e à
          formalização do cadastro do vendedor em nosso banco de dados. A plataforma possui acesso
          e visibilidade <strong className="text-ink-100">SOMENTE</strong> às seguintes
          informações:
        </p>
        <Bullets
          items={[
            "Dados fornecidos voluntariamente no momento da criação do perfil (como nome de exibição, localização, telefone de contato e foto);",
            "Anúncios criados e cadastrados pelo usuário em nossa base (fotos enviadas, descrição do produto e lotes informados);",
            "Histórico público de avaliações e notas deixadas por outros membros da comunidade dentro do site.",
          ]}
        />
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-300">
          A plataforma <strong className="text-ink-100">NÃO</strong> possui acesso a conversas
          privadas, negociações de valores, dados bancários, comprovantes de pagamento ou dados de
          envio ocorridos fora do site (como via WhatsApp ou e-mail). A formalização do cadastro do
          vendedor não representa garantia jurídica, vínculo comercial ou endosso de idoneidade por
          parte do site.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink-50">4. Limitação de responsabilidade jurídica</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          Em conformidade com o Marco Civil da Internet (Lei nº 12.965/2014) e o Código Civil
          Brasileiro:
        </p>
        <Bullets
          items={[
            "O Cheiro Novo e seus administradores estão totalmente isentos de qualquer responsabilidade por prejuízos financeiros, golpes, extravios, defeitos em produtos, desacordos comerciais ou venda de réplicas ocorridas em negociações externas.",
            "Os dados e notas exibidos no perfil refletem relatos cadastrados voluntariamente pela comunidade, cabendo ao usuário realizar sua própria checagem antes de fechar qualquer negócio.",
          ]}
        />
      </section>

      <section className="border border-ink-700 bg-ink-800 p-5">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-500">
          5. Boas práticas e segurança
        </h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          Para minimizar riscos de fraudes em negociações diretas (P2P), recomendamos que os
          usuários:
        </p>
        <Bullets
          items={[
            "Exijam foto do frasco ao lado de um papel com o nome do usuário e a data atual;",
            "Verifiquem o histórico do número de telefone no Cheiro Novo antes de enviar pagamentos via PIX;",
            "Comecem negociando itens de menor valor (como decants) com vendedores recém-cadastrados.",
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink-50">6. Conduta e suspensão de conta</h2>
        <p className="text-[14.5px] leading-relaxed text-ink-300">
          Reservamo-nos o direito de suspender ou banir contas que utilizem dados falsos, sejam
          alvo de denúncias comprovadas de fraude/falsificação ou tentem manipular o sistema de
          avaliações.
        </p>
      </section>
    </div>
  );
}
