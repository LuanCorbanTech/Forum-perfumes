"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND_LIST, ITEM_TYPE_LIST } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

export function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [city, setCity] = useState(profile.city ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [brands, setBrands] = useState<string[]>(profile.brands ?? []);
  const [itemTypes, setItemTypes] = useState<string[]>(profile.item_types ?? []);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleBrand(brand: string) {
    setBrands((prev) => (prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]));
  }

  function toggleItemType(type: string) {
    setItemTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarError(null);
    if (file && file.size > MAX_PHOTO_BYTES) {
      setAvatarError("A foto precisa ter até 5MB.");
      setAvatarFile(null);
      e.target.value = "";
      return;
    }
    setAvatarFile(file);
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAvatarError(null);

    // A foto de perfil é obrigatória: só deixa salvar se já existir uma
    // (profile.avatar_url) ou se uma nova tiver sido selecionada agora.
    if (!profile.avatar_url && !avatarFile) {
      setAvatarError("Adicione uma foto pessoal para salvar o perfil, ela é obrigatória.");
      return;
    }

    setLoading(true);

    let avatarUrl = profile.avatar_url;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { contentType: avatarFile.type || undefined });
      if (uploadError) {
        setLoading(false);
        setAvatarError(`Não foi possível enviar a foto: ${uploadError.message}`);
        return;
      }
      avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        city: city.trim() || null,
        state: state.trim() || null,
        brands,
        item_types: itemTypes,
        avatar_url: avatarUrl,
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
        className="whitespace-nowrap rounded-lg border border-sand-400 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.02em] text-obsidian-900 transition-colors hover:border-dourado hover:text-dourado"
      >
        Editar perfil
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-card border border-sand-300 bg-white p-5 sm:w-80"
    >
      {error && (
        <p className="rounded-lg border border-crimson-tint-border bg-crimson-tint p-2 text-xs text-crimson">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Foto de perfil <span className="text-dourado-dark">(obrigatória)</span>
        </label>
        <div className="flex items-center gap-3">
          <Avatar
            fullName={fullName || profile.full_name}
            avatarUrl={avatarPreview}
            size={56}
            variant="dark-square"
          />
          <label className="cursor-pointer rounded-lg border border-sand-400 px-3 py-2 text-xs font-semibold text-obsidian-900 transition-colors hover:border-dourado hover:text-dourado">
            {avatarPreview ? "Trocar foto" : "Enviar foto"}
            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </label>
        </div>
        {avatarError && <p className="mt-1.5 text-xs text-crimson">{avatarError}</p>}
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Nome
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-sand-400 bg-white p-2 text-sm text-obsidian-900 focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            Cidade
          </label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-sand-400 bg-white p-2 text-sm text-obsidian-900 focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          />
        </div>
        <div className="w-20">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
            UF
          </label>
          <input
            value={state}
            maxLength={2}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-sand-400 bg-white p-2 text-sm uppercase text-obsidian-900 focus:border-dourado focus:outline-none focus:ring-2 focus:ring-dourado/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Marcas que costuma vender
        </label>
        <div className="flex flex-wrap gap-2">
          {BRAND_LIST.map((brand) => (
            <button
              type="button"
              key={brand}
              onClick={() => toggleBrand(brand)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                brands.includes(brand)
                  ? "border-dourado bg-dourado-tint text-dourado-dark"
                  : "border-sand-400 text-[#5B6470] hover:border-obsidian-900/30"
              }`}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
          Tipos de item que costuma vender
        </label>
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPE_LIST.map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => toggleItemType(type)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                itemTypes.includes(type)
                  ? "border-dourado bg-dourado-tint text-dourado-dark"
                  : "border-sand-400 text-[#5B6470] hover:border-obsidian-900/30"
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
          className="rounded-lg bg-obsidian-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-white transition-colors disabled:opacity-50 hover:bg-dourado hover:text-obsidian-900"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-sand-400 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-[#5B6470] transition-colors hover:bg-sand"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
