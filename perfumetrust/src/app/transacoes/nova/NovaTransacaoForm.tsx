"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/types";

const STEPS = [
  {
    n: "01",
    title: "Você registra",
    body: "Descreva o item e o valor combinado. A outra parte recebe a notificação.",
  },
  {
    n: "02",
    title: "Os dois confirmam",
    body: "Comprador e vendedor confirmam que a negociação aconteceu.",
  },
  {
    n: "03",
    title: "A avaliação libera",
    body: "Só transações confirmadas geram avaliação. É isso que mantém o score honesto.",
  },
  {
    n: "04",
    title: "A reputação atualiza",
    body: "Nota, vendas e score de confiabilidade são recalculados no perfil.",
  },
];

export function NovaTransacaoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [seller, setSeller] = useState<Profile | null>(null);
  const [sellerQuery, setSellerQuery] = useState("");
  const [sellerOptions, setSellerOptions] = useState<Profile[]>([]);
  const [itemDescription, setItemDescription] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    const sellerId = searchParams.get("vendedor");
    if (!sellerId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", sellerId)
      .single()
      .then(({ data }) => data && setSeller(data as Profile));
  }, [searchParams, supabase]);

  useEffect(() => {
    if (!sellerQuery.trim() || seller) {
      setSellerOptions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .ilike("full_name", `%${sellerQuery.trim()}%`)
        .limit(5)
        .returns<Profile[]>();
      setSellerOptions(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [sellerQuery, seller, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentUserId) {
      setError("Você precisa estar logado.");
      return;
    }
    if (!seller) {
      setError("Selecione o vendedor da negociação.");
      return;
    }
    if (seller.id === currentUserId) {
      setError("Você não pode registrar uma transação com você mesmo.");
      return;
    }
    const priceValue = Number(price.replace(",", "."));
    if (!priceValue || priceValue <= 0) {
      setError("Informe um valor válido.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        seller_id: seller.id,
        buyer_id: currentUserId,
        item_description: itemDescription.trim(),
        price: priceValue,
      })
      .select()
      .single();
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/transacoes/${data.id}`);
  }

  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.02em] text-dourado">Transação</p>
      <h1 className="mb-2 font-serif text-4xl font-medium leading-none text-obsidian-900">
        Registrar uma negociação
      </h1>
      <p className="mb-7 max-w-[56ch] text-[14.5px] font-normal leading-relaxed text-[#5B6470]">
        Registre aqui a negociação combinada no grupo de desapego. Depois, ambos os lados confirmam a
        conclusão para liberar a avaliação.
      </p>

      <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        <form onSubmit={handleSubmit} className="rounded-card border border-sand-300 bg-white p-6">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            Vendedor
          </label>
          {seller ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-sand-300 bg-sand px-3.5 py-[11px]">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar fullName={seller.full_name} avatarUrl={seller.avatar_url} size={30} variant="dark-square" />
                <span className="truncate text-[14.5px] font-normal text-obsidian-900">{seller.full_name}</span>
              </span>
              <button
                type="button"
                onClick={() => setSeller(null)}
                className="shrink-0 text-[11px] font-medium uppercase tracking-[0.02em] text-[#8A8F98] transition-colors hover:text-crimson"
              >
                trocar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={sellerQuery}
                onChange={(e) => setSellerQuery(e.target.value)}
                placeholder="Buscar vendedor por nome..."
                className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
              />
              {sellerOptions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 top-[50px] rounded-lg border border-sand-400 bg-white p-1 shadow-[0_6px_18px_rgba(18,22,26,0.08)]">
                  {sellerOptions.map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSeller(opt);
                          setSellerQuery("");
                          setSellerOptions([]);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-normal text-obsidian-900 transition-colors hover:bg-sand"
                      >
                        <Avatar fullName={opt.full_name} avatarUrl={opt.avatar_url} size={26} variant="light-circle" />
                        {opt.full_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <label className="mb-2 mt-[18px] block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            Item negociado
          </label>
          <input
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            placeholder="Ex.: Amouage Interlude 100ml, 80% cheio"
            required
            className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          />

          <label className="mb-2 mt-[18px] block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            Valor combinado (R$)
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150,00"
            required
            className="h-[46px] w-full rounded-lg border border-sand-400 bg-white px-3.5 text-sm text-obsidian-900 placeholder-[#A0A5AC] focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          />

          {error && (
            <p className="mt-4 rounded-lg border border-crimson-tint-border bg-crimson-tint p-2.5 text-[12.5px] text-crimson">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-[22px] w-full rounded-lg bg-obsidian-900 py-3.5 text-[11.5px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
          >
            {loading ? "Registrando..." : "Registrar transação"}
          </button>
        </form>

        <div>
          <p className="mb-4 text-[9.5px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            Como funciona
          </p>
          <div className="grid border-t border-sand-300">
            {STEPS.map((st) => (
              <div key={st.n} className="grid grid-cols-[42px_1fr] gap-3.5 border-b border-sand-300 py-4">
                <span className="text-[19px] font-semibold leading-[1.35] text-dourado">{st.n}</span>
                <span>
                  <span className="block text-sm font-medium text-obsidian-900">{st.title}</span>
                  <span className="mt-1 block text-[13px] font-normal leading-relaxed text-[#5B6470]">
                    {st.body}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
