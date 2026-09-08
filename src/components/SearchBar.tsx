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

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[620px] items-stretch gap-2">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={compact ? "Buscar por membro..." : "Buscar por nome ou telefone..."}
        className="h-12 min-w-0 flex-1 rounded-lg border border-sand-400 bg-white px-4 font-sans text-[15px] font-normal text-obsidian-900 placeholder-[#A0A5AC] transition-[border-color,box-shadow] focus:border-dourado focus:outline-none focus:ring-[3px] focus:ring-dourado/[0.16]"
      />
      <button
        type="submit"
        className="h-12 shrink-0 rounded-lg bg-obsidian-900 px-[26px] font-sans text-xs font-semibold uppercase tracking-[0.02em] text-white transition-colors hover:bg-dourado hover:text-obsidian-900"
      >
        Buscar
      </button>
    </form>
  );
}
