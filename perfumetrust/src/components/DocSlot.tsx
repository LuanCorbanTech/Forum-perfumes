// Um "slot" de upload de documento/selfie — usado tanto na tela de
// cadastro (LoginForm.tsx) quanto na de reenvio de verificação
// (VerificacaoForm.tsx). Extraído pra um componente só pra não duplicar
// a mesma UI (preview de imagem/PDF + botão de trocar arquivo) nos dois
// lugares.

// Um arquivo é considerado "PDF" tanto pelo tipo/nome do File recém
// selecionado quanto pela extensão da URL assinada de algo já enviado
// antes (a URL assinada preserva a extensão original antes do "?").
export function looksLikePdf(file: File | null, url: string | null): boolean {
  if (file) return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!url) return false;
  return url.split("?")[0].toLowerCase().endsWith(".pdf");
}

export function DocSlot({
  slotKey,
  label,
  hint,
  accept,
  capture,
  file,
  previewUrl,
  error,
  onChange,
}: {
  slotKey: string;
  label: string;
  hint: string;
  accept: string;
  capture?: "environment" | "user";
  file: File | null;
  previewUrl: string | null;
  error: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const isPdf = looksLikePdf(file, previewUrl);

  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.02em] text-[#8A8F98]">
        {label} <span className="text-dourado-dark">(obrigatória)</span>
      </label>
      <p className="mb-2 text-[12.5px] text-[#8A8F98]">{hint}</p>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          isPdf ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-sand-300 bg-sand text-center text-[10px] font-medium text-[#5B6470]"
            >
              <span className="text-lg">📄</span>
              PDF anexado
            </a>
          ) : (
            <img
              src={previewUrl}
              alt={label}
              className="h-20 w-20 rounded-lg border border-sand-300 object-cover"
            />
          )
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-sand-400 text-center text-[10px] text-[#8A8F98]">
            Sem arquivo
          </div>
        )}
        <label className="cursor-pointer rounded-lg border border-sand-400 px-3 py-2 text-xs font-semibold text-obsidian-900 transition-colors hover:border-dourado hover:text-dourado">
          {previewUrl ? "Trocar arquivo" : "Enviar arquivo"}
          <input
            key={slotKey}
            type="file"
            accept={accept}
            capture={capture}
            onChange={onChange}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="mt-1.5 text-xs text-crimson">{error}</p>}
    </div>
  );
}
