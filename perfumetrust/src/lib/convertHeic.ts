// Fotos tiradas direto de iPhone às vezes vêm em HEIC/HEIF (é o formato
// padrão da câmera da Apple desde o iOS 11). O problema: quase nenhum
// navegador de computador ou Android (Chrome, Firefox, Edge) sabe exibir
// HEIC — só o Safari. O arquivo continua sendo uma foto de verdade (abre
// normal no rolo de fotos do próprio iPhone, ou depois de baixado), mas
// tentar mostrar ele como <img> na tela de um Chrome, por exemplo, sempre
// vai dar ícone quebrado, não importa o que a gente configure no
// Content-Type do arquivo — o navegador simplesmente não sabe decodificar
// o formato.
//
// A solução é converter pra JPEG assim que a pessoa escolhe o arquivo,
// antes de mandar pra qualquer lugar — assim o que fica salvo já nasce
// num formato que todo navegador exibe.
//
// Só chame isto a partir de um componente "use client": usa APIs do
// navegador (Canvas) por baixo dos panos, não funciona no servidor.
export async function convertHeicIfNeeded(file: File): Promise<File> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const looksHeic = file.type === "image/heic" || file.type === "image/heif" || ext === "heic" || ext === "heif";
  if (!looksHeic) return file;

  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
    const jpegBlob = Array.isArray(result) ? result[0] : result;
    const newName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
    return new File([jpegBlob], newName, { type: "image/jpeg" });
  } catch {
    // Se a conversão falhar por algum motivo, segue com o arquivo original
    // — na pior das hipóteses, mesma situação de antes, não pior.
    return file;
  }
}
