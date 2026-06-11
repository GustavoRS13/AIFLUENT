import { execFile } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { chmodSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import ffmpegPath from "ffmpeg-static";

// Resolve o binário do ffmpeg em ambientes serverless (caminhos podem variar)
// e garante permissão de execução (a Vercel às vezes perde o bit +x).
function resolveFfmpeg(): string | null {
  const candidates = [
    ffmpegPath as string | null,
    join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg"),
    "/ROOT/node_modules/ffmpeg-static/ffmpeg",
    "/var/task/node_modules/ffmpeg-static/ffmpeg",
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        chmodSync(p, 0o755);
      } catch {
        /* já executável */
      }
      return p;
    }
  }
  return null;
}

// REGRA DEFINITIVA: transcodificamos TODO áudio para ogg/opus, EXCETO mp3/mpeg
// (que o WhatsApp aceita nativamente). Antes pulávamos "ogg" também — mas um
// "audio/ogg" gravado pelo navegador pode NÃO ser opus (ou ser webm rotulado
// como ogg pelo fallback do cliente), e o WhatsApp rejeita. Re-encodar todo
// áudio garante saída sempre compatível (ogg/opus). Causa-raiz da regressão.
const ALREADY_OK = /^audio\/(mpeg|mp3)(;|$)/i;

export function needsTranscode(mime: string): boolean {
  // qualquer coisa que comece com audio/ e não seja mp3/mpeg → transcodifica
  if (!/^audio\//i.test(mime)) return false;
  return !ALREADY_OK.test(mime);
}

// Transcodifica um áudio (ex.: webm/opus do Chrome) para OGG/Opus,
// formato aceito pelo WhatsApp. Lança erro REAL se o ffmpeg falhar.
export async function transcodeToOggOpus(
  input: ArrayBuffer,
  inputExt: string,
): Promise<Buffer> {
  const ffmpeg = resolveFfmpeg();
  if (!ffmpeg)
    throw new Error("ffmpeg-static indisponível (binário não encontrado)");
  const id = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const safeExt = (inputExt || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8);
  const inPath = join(tmpdir(), `wa-${id}.${safeExt}`);
  const outPath = join(tmpdir(), `wa-${id}.ogg`);
  await writeFile(inPath, Buffer.from(input));
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(
        ffmpeg,
        [
          "-y",
          "-fflags",
          "+genpts", // regenera timestamps (mp4/webm fragmentado do navegador)
          "-i",
          inPath,
          "-vn", // sem vídeo
          "-c:a",
          "libopus",
          "-b:a",
          "32k",
          "-ar",
          "48000",
          "-ac",
          "1",
          "-f",
          "ogg",
          outPath,
        ],
        (err, _stdout, stderr) => {
          if (err)
            reject(
              new Error(
                `ffmpeg falhou: ${(stderr || "").slice(-500) || err.message}`,
              ),
            );
          else resolve();
        },
      );
    });
    const out = await readFile(outPath);
    if (out.byteLength < 200)
      throw new Error(
        `áudio transcodificado vazio/inválido (${out.byteLength} bytes)`,
      );
    return out;
  } finally {
    await unlink(inPath).catch(() => {});
    await unlink(outPath).catch(() => {});
  }
}
