/*
  Konversi MP3 sisi klien.

  Peramban tidak dapat mengunduh trek audio YouTube sebagai MP3 secara
  langsung: YouTube menyediakan audio dalam wadah M4A (AAC) atau WebM
  (Opus). Lingkungan serverless proyek ini juga tidak memiliki ffmpeg untuk
  transkode. Karena itu konversi MP3 dilakukan di peramban: audio diambil
  lewat proxy unduhan dengan progres, didekode dengan Web Audio API, lalu
  disandikan ulang dengan lamejs yang dimuat dari CDN saat fitur dipakai.
  Dengan pendekatan ini bundel utama tetap ringan dan package.json bebas
  dari dependensi baru; bila CDN tidak dapat dijangkau, hanya opsi MP3 yang
  gagal dengan pesan jelas, seluruh fitur lain tetap berfungsi.
*/

const LAMEJS_URL: string = "https://esm.sh/lamejs@1.2.1";
const MP3_BITRATE = 192;
const BLOCK_SIZE = 1152;
export const MAX_DURATION_SECONDS = 15 * 60;

export type Mp3Stage = "fetch" | "decode" | "encode";

export interface Mp3Progress {
  stage: Mp3Stage;
  percent: number | null;
}

export class Mp3ConversionError extends Error {}

export function canConvertToMp3(durationSeconds: number | null): boolean {
  if (durationSeconds === null) return true;
  return durationSeconds <= MAX_DURATION_SECONDS;
}

async function loadEncoder(): Promise<any> {
  let mod: any;

  try {
    mod = await import(/* webpackIgnore: true */ LAMEJS_URL);
  } catch {
    throw new Mp3ConversionError(
      "Modul penyandi MP3 tidak dapat dimuat. Periksa koneksi lalu coba lagi."
    );
  }

  const lame = mod.default ?? mod;
  if (!lame || typeof lame.Mp3Encoder !== "function") {
    throw new Mp3ConversionError("Modul penyandi MP3 tidak valid.");
  }

  return lame;
}

export async function fetchAudioBuffer(
  audioUrl: string,
  onProgress: (percent: number) => void
): Promise<ArrayBuffer> {
  const response = await fetch(audioUrl);

  if (!response.ok) {
    throw new Mp3ConversionError(
      "Audio gagal diambil dari server (" + response.status + ")."
    );
  }

  const total = Number(response.headers.get("content-length")) || null;

  if (!response.body || total === null) {
    onProgress(1);
    return response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    received += value.length;
    if (total > 0) {
      onProgress(Math.min(1, received / total));
    }
  }

  const merged = new Uint8Array(received);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged.buffer;
}

function decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
  const AudioContextCtor =
    window.AudioContext ?? (window as any).webkitAudioContext;

  if (!AudioContextCtor) {
    return Promise.reject(
      new Mp3ConversionError("Peramban tidak mendukung dekode audio.")
    );
  }

  const context = new AudioContextCtor();

  return context
    .resume()
    .catch(() => undefined)
    .then(() => context.decodeAudioData(buffer))
    .finally(() => {
      context.close().catch(() => undefined);
    });
}

function floatToInt16(samples: Float32Array): Int16Array {
  const converted = new Int16Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    converted[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return converted;
}

// Salin byte hasil sandi ke buffer baru agar data tetap utuh saat blob
// dirakit; Int8Array dan Uint8Array memandang byte yang sama secara beda.
function toUint8Copy(encoded: Int8Array): Uint8Array {
  const view = new Uint8Array(encoded.byteLength);
  view.set(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength));
  return view;
}

export async function convertAudioToMp3(
  audioUrl: string,
  durationSeconds: number | null,
  onProgress: (progress: Mp3Progress) => void
): Promise<Blob> {
  if (!canConvertToMp3(durationSeconds)) {
    throw new Mp3ConversionError(
      "Durasi melebihi batas konversi MP3 (maksimal 15 menit)."
    );
  }

  const lame = await loadEncoder();

  onProgress({ stage: "fetch", percent: null });
  const raw = await fetchAudioBuffer(audioUrl, (percent) =>
    onProgress({ stage: "fetch", percent })
  );

  onProgress({ stage: "decode", percent: null });
  const audio = await decodeAudio(raw);

  const channels = Math.min(2, audio.numberOfChannels);

  let encoder: any;
  try {
    encoder = new lame.Mp3Encoder(channels, audio.sampleRate, MP3_BITRATE);
  } catch {
    throw new Mp3ConversionError("Sampling rate audio tidak didukung penyandi MP3.");
  }

  const left = floatToInt16(audio.getChannelData(0));
  const right = channels === 2 ? floatToInt16(audio.getChannelData(1)) : null;

  const parts: Uint8Array[] = [];
  let yieldCounter = 0;

  for (let offset = 0; offset < left.length; offset += BLOCK_SIZE) {
    const leftChunk = left.subarray(offset, offset + BLOCK_SIZE);
    const rightChunk = right ? right.subarray(offset, offset + BLOCK_SIZE) : undefined;

    const encoded =
      channels === 2 && rightChunk
        ? encoder.encodeBuffer(leftChunk, rightChunk)
        : encoder.encodeBuffer(leftChunk);

    if (encoded && encoded.length > 0) {
      parts.push(toUint8Copy(encoded));
    }

    yieldCounter++;
    if (yieldCounter % 200 === 0) {
      onProgress({ stage: "encode", percent: offset / left.length });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const tail = encoder.flush();
  if (tail && tail.length > 0) {
    parts.push(toUint8Copy(tail));
  }

  onProgress({ stage: "encode", percent: 1 });
  return new Blob(parts, { type: "audio/mpeg" });
}
