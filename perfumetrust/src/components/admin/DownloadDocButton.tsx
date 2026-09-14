interface DownloadDocButtonProps {
  label: string;
  url: string | null;
}

// Substitui a pré-visualização inline (antigo PhotoSlot) nas 3 telas de
// admin que mostram documento/selfie (Cadastros, Usuários e Reprovados):
// em vez de já carregar (e, pra HEIC, converter no navegador) a foto de
// cada pessoa listada, mostra só um botão de download — o arquivo só é
// buscado quando o admin realmente clica, o que evita pesar o navegador
// quando a lista tiver muitos cadastros.
//
// O link (gerado por signedUrl() em cada página, com { download: true })
// já vem com o cabeçalho Content-Disposition: attachment definido pelo
// próprio Supabase Storage — isso força o download mesmo em navegadores
// que ignoram o atributo "download" do <a> em link de outra origem.
export function DownloadDocButton({ label, url }: DownloadDocButtonProps) {
  return (
    <div>
      <p className="mb-1.5 text-[9.5px] font-medium uppercase tracking-[0.02em] text-[#8A8F98]">{label}</p>
      {url ? (
        <a
          href={url}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-sand-300 bg-sand text-[12px] font-semibold text-[#3C434C] transition-colors hover:border-dourado hover:text-dourado-dark"
        >
          <span aria-hidden="true">⬇</span> Baixar
        </a>
      ) : (
        <div className="flex h-11 w-full items-center justify-center rounded-lg border border-dashed border-sand-400 text-[10px] text-[#8A8F98]">
          Sem foto
        </div>
      )}
    </div>
  );
}
