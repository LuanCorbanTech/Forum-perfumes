"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LIST, ITEM_TYPE_LIST } from "@/lib/types";
import type { Profile } from "@/lib/types";

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [city, setCity] = useState(profile.city ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [brands, setBrands] = useState<string[]>(profile.brands ?? []);
  const [itemTypes, setItemTypes] = useState<string[]>(profile.item_types ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleBrand(brand: string) {
    setBrands((prev) => (prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]));
  }

  function toggleItemType(type: string) {
    setItemTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        brands,
        item_types: itemTypes,
      })
      .eq("id", profile.id);

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="whitespace-nowrap border border-ink-600 px-4 py-2 font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-200 transition hover:border-gold-500/50 hover:text-gold-300"
      >
        Editar perfil
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 border border-ink-700 bg-ink-900/60 p-5 sm:w-80">
      {error && <p className="bg-red-400/10 p-2 text-xs text-red-300">{error}</p>}

      <div>
        <label className="mb-1 block text-xs text-ink-400">Nome</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 focus:border-gold-500 focus:outline-none"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-400">Cidade</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full border border-ink-600 bg-ink-900/60 p-2 text-sm text-ink-50 focus:border-gold-500 focus:outline-none"
          />
        </div>
        <div className="w-20">
          <label className="mb-1 block text-xs text-ink-400">UF</label>
          <input
            value={state}
            maxLength={2}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            className="w-full border border-ink-600 bg-ink-900/60 p-2 text-sm uppercase text-ink-50 focus:border-gold-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-ink-400">Marcas que costuma vender</label>
        <div className="flex flex-wrap gap-2">
          {BRAND_LIST.map((brand) => (
            <button
              type="button"
              key={brand}
              onClick={() => toggleBrand(brand)}
              className={`border px-2.5 py-1 text-[11px] transition ${
                brands.includes(brand)
                  ? "border-gold-500 bg-gold-500/10 text-gold-300"
                  : "border-ink-600 text-ink-300 hover:border-ink-500"
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-ink-400">Tipos de item que costuma vender</label>
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPE_LIST.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => toggleItemType(type)}
              className={`border px-2.5 py-1 text-[11px] transition ${
                itemTypes.includes(type)
                  ? "border-gold-500 bg-gold-500/10 text-gold-300"
                  : "border-ink-600 text-ink-300 hover:border-ink-500"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-gold-500 px-4 py-2 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-950 transition disabled:opacity-50 hover:bg-gold-400"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-ink-600 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-ink-300 transition hover:bg-ink-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
