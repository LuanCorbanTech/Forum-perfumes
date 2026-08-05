"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

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
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-serif text-2xl font-light text-ink-50">Registrar transação</h1>
      <p className="text-sm text-ink-300">
        Registre aqui a negociação combinada no grupo de desapego. Depois, ambos os lados
        confirmam a conclusão para liberar a avaliação.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink-700 bg-ink-800/60 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-200">Vendedor</label>
          {seller ? (
            <div className="flex items-center justify-between rounded-lg border border-ink-600 p-2 text-sm text-ink-50">
              <span>{seller.full_name}</span>
              <button
                type="button"
                onClick={() => setSeller(null)}
                className="text-xs text-ink-400 hover:text-red-300"
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
                className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
              />
              {sellerOptions.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-ink-600 bg-ink-800 shadow-lg">
                  {sellerOptions.map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSeller(opt);
                          setSellerQuery("");
                          setSellerOptions([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-ink-100 hover:bg-ink-700"
                      >
                        {opt.full_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-200">Item negociado</label>
          <input
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            placeholder="Ex: Perfume XPTO 100ml, 80% do frasco"
            required
            className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-200">Valor combinado (R$)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150,00"
            required
            className="w-full rounded-lg border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
          />
        </div>

        {error && <p className="rounded bg-red-400/10 p-2 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gold-500 py-2 font-medium text-ink-950 transition disabled:opacity-50 hover:bg-gold-400"
        >
          {loading ? "Registrando..." : "Registrar transação"}
        </button>
      </form>
    </div>
  );
}
