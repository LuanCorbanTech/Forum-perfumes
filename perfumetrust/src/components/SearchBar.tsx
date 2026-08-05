"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/busca?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome ou telefone do vendedor..."
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
      <button
        type="submit"
        className="rounded-lg bg-brand-600 px-5 py-2 font-medium text-white transition hover:bg-brand-700"
      >
        Buscar
      </button>
    </form>
  );
}
