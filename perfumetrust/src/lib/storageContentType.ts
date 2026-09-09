// Descobre o Content-Type certo pra salvar num arquivo no Supabase Storage.
//
// Por quê: o navegador de alguns celulares manda um File sem o campo
// "type" preenchido (fica ""), principalmente em fotos tiradas na hora
// pela câmera. Quando isso acontece, o upload salva o arquivo com um
// Content-Type genérico — os bytes continuam certos (por isso o download
// funciona normal), mas o navegador se recusa a mostrar em miniatura
// (<img>), aparecendo como um ícone de imagem quebrada. Como o nome do
// arquivo no bucket é sempre gerado por nós (ex.: "front.jpg"), dá pra
// inferir o tipo certo pela extensão como reserva.
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  pdf: "application/pdf",
};

export function resolveContentType(file: { type?: string | null; name: string }): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}
