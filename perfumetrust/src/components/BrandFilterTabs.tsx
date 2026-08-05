"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BRAND_LIST } from "@/lib/types";

export function BrandFilterTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("marca") ?? "";

  function go(brand: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (brand) params.set("marca", brand);
    else params.delete("marca");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 overflow-x-auto">
      <Tab label="Todas" isActive={active === ""} onClick={() => go("")} />
      {BRAND_LIST.map((brand) => (
        <Tab key={brand} label={brand} isActive={active === brand} onClick={() => go(brand)} />
      ))}
    </div>
  );
}

function Tab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-4 py-3.5 font-sans text-[13px] font-light tracking-wide transition ${
        isActive
          ? "border-gold-500 bg-ink-800 text-ink-50"
          : "border-transparent text-ink-400 hover:text-ink-200"
      }`}
    >
      {label}
    </button>
  );
}
