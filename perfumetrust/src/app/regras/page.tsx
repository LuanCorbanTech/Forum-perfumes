const RULES = [
  "Registre a transação na plataforma assim que combinar a negociação isso protege as duas partes.",
  "Só avalie depois que a transação estiver marcada como concluída (confirmação dupla).",
  "Não é permitido criar mais de uma conta para inflar a própria reputação.",
  "Denuncie golpes, produtos falsificados ou vendedores que sumirem após o pagamento.",
  "Respeite os outros membros: assédio ou abuso resulta em banimento imediato.",
];

export default function RegrasPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-9">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">
          antes de negociar
        </p>
        <h1 className="font-serif text-[38px] font-medium leading-[1.04] text-obsidian-900">Regras do fórum</h1>
      </div>

      <section className="border-t border-sand-300 pt-8">
        <h2 className="mb-4 text-[19px] font-bold leading-tight text-obsidian-900">Regras da comunidade</h2>
        <ol className="space-y-3.5">
          {RULES.map((rule, i) => (
            <li key={rule} className="grid grid-cols-[26px_1fr] items-start gap-3">
              <span className="text-[11px] font-semibold text-dourado">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[14.5px] font-normal leading-relaxed text-[#3C434C]">{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="border-t border-sand-300 pt-6 text-sm font-normal text-[#8A8F98]">
        Viu alguém quebrando essas regras?{" "}
        <a href="/busca" className="border-b border-dourado-tint-border text-dourado-dark">
          Encontre o perfil da pessoa
        </a>{" "}
        e use o botão de denúncia.
      </p>
    </div>
  );
}
