"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!compact) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [compact]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/busca?${params.toString()}`);
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="relative w-full max-w-md">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por membro..."
          className="w-full border border-ink-600 bg-ink-900/70 py-2 pl-3.5 pr-9 text-sm text-ink-50 placeholder-ink-400 focus:border-gold-500 focus:outline-none"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border border-ink-600 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
          /
        </span>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por membro (nome ou telefone)..."
        className="flex-1 border border-ink-600 bg-ink-900/60 px-4 py-2 text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
      />
      <button
        type="submit"
        className="bg-gold-500 px-5 py-2 font-medium text-ink-950 transition hover:bg-gold-400"
      >
        Buscar
      </button>
    </form>
  );
}
