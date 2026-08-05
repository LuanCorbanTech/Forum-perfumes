const TIPS = [
  "Peça foto do frasco ao lado de um papel com o nome do usuário e a data.",
  "Confira o lote no rótulo e na caixa — os dois têm que bater.",
  "O site não intermedeia pagamento: confira a reputação aqui antes de fechar lá fora.",
  "Vendedor novo? Comece com um decant antes do frasco cheio.",
];

const RULES = [
  "Registre a transação na plataforma assim que combinar a negociação — isso protege as duas partes.",
  "Só avalie depois que a transação estiver marcada como concluída (confirmação dupla).",
  "Não é permitido criar mais de uma conta para inflar a própria reputação.",
  "Denuncie golpes, produtos falsificados ou vendedores que sumirem após o pagamento.",
  "Respeite os outros membros: assédio ou abuso resulta em banimento imediato.",
];

export default function RegrasPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.26em] text-gold-500">
          antes de anunciar
        </p>
        <h1 className="font-serif text-3xl font-light text-ink-50">Regras do fórum</h1>
      </div>

      <section>
        <h2 className="mb-4 font-serif text-xl text-ink-50">Regras da comunidade</h2>
        <ol className="space-y-3">
          {RULES.map((rule, i) => (
            <li key={rule} className="grid grid-cols-[24px_1fr] items-start gap-3">
              <span className="font-mono text-[11px] text-ink-500">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[14.5px] leading-relaxed text-ink-300">{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border border-ink-700 bg-ink-800 p-5">
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gold-500">
          como não tomar golpe
        </h2>
        <div className="space-y-3.5">
          {TIPS.map((tip, i) => (
            <div key={tip} className="grid grid-cols-[20px_1fr] items-start gap-3">
              <span className="font-mono text-[10px] text-ink-500">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[13.5px] leading-relaxed text-ink-300">{tip}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-ink-400">
        Viu alguém quebrando essas regras?{" "}
        <a href="/busca" className="text-gold-300 hover:underline">
          Encontre o perfil da pessoa
        </a>{" "}
        e use o botão de denúncia.
      </p>
    </div>
  );
}
