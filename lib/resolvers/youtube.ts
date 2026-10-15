import type { ResolvedMedia, ResolvedMediaItem, ResolverResult } from "./types";

/*
  Resolver YouTube

  Strategi utama: endpoint internal innertube dengan konteks klien ANDROID.
  Klien ini mengembalikan URL media langsung tanpa signatureCipher sehingga
  tidak perlu membaca berkas base.js pemutar. Bila strategi utama ditolak
  (misalnya pemeriksaan bot atau klien kedaluwarsa) atau tidak menghasilkan
  URL langsung, resolver beralih ke strategi cadangan: mengambil halaman
  watch, membaca ytInitialPlayerResponse, lalu mendekripsi signatureCipher
  dengan fungsi decipher yang dibangun dari base.js pemutar.

  PERAWATAN: sisi YouTube berubah lebih cepat dibanding sumber lain. Titik
  paling rawan berubah: kunci dan versi klien innertube, pola fungsi
  decipher pada base.js, serta struktur ytInitialPlayerResponse.
*/

const INNERTUBE_ENDPOINT = "https://www.youtube.com/youtubei/v1/player";
// Kunci publik bawaan klien web YouTube, tidak rahasia dan bukan kredensial.
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const ANDROID_CLIENT_VERSION = "20.10.38";
const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{8,20}$/;
const WATCH_URL_PREFIX = "https://www.youtube.com/watch?v=";
const DECIPHER_PROBE_INPUT = "AAAABBBBCCCCDDDD";

interface YoutubeFormat {
  itag?: number;
  url?: string;
  signatureCipher?: string;
  cipher?: string;
  mimeType?: string;
  qualityLabel?: string;
  bitrate?: number;
}

interface PlayerResponse {
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
  videoDetails?: {
    title?: string;
    author?: string;
    lengthSeconds?: string;
    thumbnail?: {
      thumbnails?: Array<{ url?: string; width?: number }>;
    };
  };
  streamingData?: {
    formats?: YoutubeFormat[];
    adaptiveFormats?: YoutubeFormat[];
  };
}

type DecipherFunction = (signature: string) => string | null;

function extractVideoId(rawUrl: string): string | null {
  let parsed: URL;
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : "https://" + rawUrl;
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();

  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\//, "");
    return VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  if (/(^|\.)youtube\.com$/.test(host)) {
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery && VIDEO_ID_PATTERN.test(fromQuery)) return fromQuery;

    const pathMatch = parsed.pathname.match(/^\/(shorts|embed|live|v)\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && VIDEO_ID_PATTERN.test(pathMatch[2])) return pathMatch[2];
  }

  return null;
}

async function fetchAndroidPlayer(videoId: string): Promise<PlayerResponse | null> {
  const response = await fetch(INNERTUBE_ENDPOINT + "?key=" + INNERTUBE_KEY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "com.google.android.youtube/" + ANDROID_CLIENT_VERSION + " (Linux; U; Android 11) gzip",
      "X-YouTube-Client-Name": "ANDROID",
      "X-YouTube-Client-Version": ANDROID_CLIENT_VERSION,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: ANDROID_CLIENT_VERSION,
          androidSdkVersion: 30,
          hl: "id",
          gl: "ID",
        },
      },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    }),
  });

  if (!response.ok) return null;

  try {
    return (await response.json()) as PlayerResponse;
  } catch {
    return null;
  }
}

async function fetchWatchHtml(videoId: string): Promise<string | null> {
  const response = await fetch(
    WATCH_URL_PREFIX + videoId + "&hl=id&bpctr=9999999999&has_verified=1",
    {
      headers: {
        "User-Agent": DESKTOP_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
        "Cookie": "CONSENT=YES+1; SOCS=CAI",
      },
    }
  );

  if (!response.ok) return null;

  try {
    return await response.text();
  } catch {
    return null;
  }
}

// Membaca objek JSON mulai dari kurung kurawal pembuka pada openIndex
// sampai kurung penutup yang berimbang, mengabaikan kurung di dalam
// string. Dipakai untuk ytInitialPlayerResponse dan objek helper decipher.
function extractBalancedObject(source: string, openIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < source.length; i++) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }

  return null;
}

function extractPlayerResponse(html: string): PlayerResponse | null {
  // PERAWATAN: penanda ini bergantung pada bentuk halaman watch YouTube.
  const marker = "ytInitialPlayerResponse = ";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const openIndex = html.indexOf("{", markerIndex + marker.length);
  if (openIndex === -1) return null;

  const jsonSource = extractBalancedObject(html, openIndex);
  if (!jsonSource) return null;

  try {
    return JSON.parse(jsonSource) as PlayerResponse;
  } catch {
    return null;
  }
}

function findPlayerJsUrl(html: string): string | null {
  const jsUrlMatch = html.match(/"jsUrl"\s*:\s*"([^"]+)"/);
  if (jsUrlMatch) {
    return "https://www.youtube.com" + jsUrlMatch[1];
  }

  const directMatch = html.match(
    /https:\/\/www\.youtube\.com\/s\/player\/[a-zA-Z0-9/.-]+\/base\.js/
  );
  return directMatch ? directMatch[0] : null;
}

const STRING_METHODS = new Set([
  "split",
  "join",
  "reverse",
  "slice",
  "splice",
  "push",
  "concat",
  "shift",
  "unshift",
  "pop",
  "indexOf",
  "charAt",
  "charCodeAt",
  "substr",
  "substring",
  "replace",
  "toString",
  "fromCharCode",
]);

const GLOBAL_OBJECTS = new Set(["String", "Math", "Array", "Object", "JSON", "Number"]);

function escapeRegExp(value: string): string {
  return value.replace(/[$()*+.?[\\\]^{}]/g, "\\$&");
}

// Fungsi decipher memanggil helper pada objek eksternal, misalnya XX.yz(a, 5),
// sedangkan fungsi transform parameter n berdiri sendiri. Perbedaan inilah
// yang dipakai untuk membedakan kandidat fungsi pada base.js.
function findHelperObjectName(functionBody: string): string | null {
  const matches = functionBody.matchAll(/([a-zA-Z_$][\w$]*)\.([a-zA-Z_$][\w$]*)\(/g);

  for (const match of matches) {
    const objectName = match[1];
    if (GLOBAL_OBJECTS.has(objectName)) continue;
    if (STRING_METHODS.has(match[2])) continue;
    return objectName;
  }

  return null;
}

/*
  PERAWATAN: membangun fungsi decipher dari base.js adalah bagian paling
  rapuh dari resolver ini. Deteksi memakai ciri umum: fungsi yang memecah
  masukan menjadi array karakter, menggabungkannya kembali, dan memanggil
  helper pada objek yang didefinisikan terpisah. Bila YouTube mengubah pola
  ini, hanya strategi utama (innertube ANDROID) yang tetap bekerja.
*/
function buildDecipher(playerJs: string): DecipherFunction | null {
  const candidatePattern =
    /(?:function\s+([a-zA-Z_$][\w$]*)\s*\(\s*([a-zA-Z_$][\w$]*)\s*\)|([a-zA-Z_$][\w$]*)\s*=\s*function\s*\(\s*([a-zA-Z_$][\w$]*)\s*\))\s*\{/g;

  let match: RegExpExecArray | null;

  while ((match = candidatePattern.exec(playerJs)) !== null) {
    const paramName = match[2] ?? match[4];
    const openIndex = match.index + match[0].length - 1;
    const functionBody = extractBalancedObject(playerJs, openIndex);

    if (!functionBody || functionBody.length > 4000) continue;
    if (!functionBody.includes('.split("")') || !functionBody.includes('.join("")')) continue;

    const helperName = findHelperObjectName(functionBody);
    if (!helperName) continue;

    const helperDefinition = new RegExp(
      "\\b" + escapeRegExp(helperName) + "\\s*=\\s*\\{"
    ).exec(playerJs);
    if (!helperDefinition) continue;

    const helperOpenIndex = helperDefinition.index + helperDefinition[0].length - 1;
    const helperSource = extractBalancedObject(playerJs, helperOpenIndex);
    if (!helperSource) continue;

    const innerBody = functionBody.slice(1, functionBody.length - 1);

    try {
      const candidate = new Function(
        paramName,
        "var " + helperName + " = " + helperSource + ";" + innerBody
      ) as (signature: string) => string;

      const probe = candidate(DECIPHER_PROBE_INPUT);
      if (typeof probe === "string" && probe.length >= 10) {
        return (signature: string) => {
          try {
            return candidate(signature);
          } catch {
            return null;
          }
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function resolveFormatUrl(
  format: YoutubeFormat,
  decipher: DecipherFunction | null
): string | null {
  if (format.url) return format.url;

  const cipherSource = format.signatureCipher ?? format.cipher;
  if (!cipherSource || !decipher) return null;

  const params = new URLSearchParams(cipherSource);
  const signature = params.get("s");
  const signatureParam = params.get("sp") ?? "sig";
  const mediaUrl = params.get("url");
  if (!signature || !mediaUrl) return null;

  const deciphered = decipher(signature);
  if (!deciphered) return null;

  const result = new URL(mediaUrl);
  result.searchParams.set(signatureParam, deciphered);
  return result.toString();
}

function heightFromQualityLabel(label: string | undefined): number {
  const match = label ? label.match(/(\d+)/) : null;
  return match ? Number(match[1]) : 0;
}

/*
  Hanya format progresif (video dan audio dalam satu berkas MP4) yang
  dijadikan item unduhan. Penggabungan format adaptif DASH memerlukan
  ffmpeg yang tidak tersedia di lingkungan serverless, sehingga resolusi
  maksimum mengikuti format progresif yang disediakan YouTube.
*/
function buildVideoItems(
  formats: YoutubeFormat[],
  decipher: DecipherFunction | null
): ResolvedMediaItem[] {
  const muxed = formats
    .filter(
      (format) =>
        typeof format.mimeType === "string" &&
        format.mimeType.startsWith("video/") &&
        format.mimeType.includes("audio/")
    )
    .map((format) => {
      const url = resolveFormatUrl(format, decipher);
      if (!url) return null;
      return {
        url,
        quality: format.qualityLabel ?? String(format.itag ?? "video"),
        height: heightFromQualityLabel(format.qualityLabel),
      };
    })
    .filter(
      (variant): variant is { url: string; quality: string; height: number } =>
        variant !== null
    )
    .sort((a, b) => b.height - a.height);

  return muxed.map((variant, index) => ({
    url: variant.url,
    quality: variant.quality,
    label: muxed.length > 1 ? (index === 0 ? "hd" : "sd") : null,
    hasWatermark: false,
    mimeType: "video/mp4",
    thumbnailUrl: null,
  }));
}

// Trek audio terpisah diambil dari format adaptif. AAC dalam wadah MP4
// (umumnya itag 140) diprioritaskan karena paling kompatibel didekode
// peramban pada jalur konversi MP3.
function buildAudioItem(
  adaptiveFormats: YoutubeFormat[],
  decipher: DecipherFunction | null
): ResolvedMediaItem | null {
  const audio = adaptiveFormats
    .filter(
      (format) =>
        typeof format.mimeType === "string" && format.mimeType.startsWith("audio/")
    )
    .map((format) => {
      const url = resolveFormatUrl(format, decipher);
      if (!url) return null;
      return {
        url,
        mimeType: format.mimeType as string,
        bitrate: Number(format.bitrate ?? 0),
      };
    })
    .filter(
      (item): item is { url: string; mimeType: string; bitrate: number } => item !== null
    )
    .sort((a, b) => b.bitrate - a.bitrate);

  if (audio.length === 0) return null;

  const preferred = audio.find((item) => item.mimeType.includes("mp4")) ?? audio[0];

  return {
    url: preferred.url,
    quality: Math.max(1, Math.round(preferred.bitrate / 1000)) + " kbps",
    label: null,
    hasWatermark: false,
    mimeType: preferred.mimeType.split(";")[0],
    thumbnailUrl: null,
  };
}

function isPlayable(player: PlayerResponse | null): boolean {
  return player?.playabilityStatus?.status === "OK";
}

function unavailableMessage(player: PlayerResponse | null): string {
  const reason = player?.playabilityStatus?.reason ?? "";
  if (/sign in|login|bot/i.test(reason)) {
    return "YouTube meminta verifikasi untuk video ini. Coba lagi beberapa saat atau gunakan video lain.";
  }
  return "Video tidak dapat diputar: privat, dibatasi usia, atau diblokir.";
}

export async function resolveYouTube(rawUrl: string): Promise<ResolverResult> {
  const videoId = extractVideoId(rawUrl);

  if (!videoId) {
    return {
      ok: false,
      error: {
        code: "invalid_link",
        message: "Tautan YouTube tidak mengandung id video yang dikenali.",
      },
    };
  }

  let player: PlayerResponse | null = null;
  let watchHtml: string | null = null;

  try {
    player = await fetchAndroidPlayer(videoId);
  } catch {
    player = null;
  }

  const streaming = player?.streamingData;
  const hasDirectUrl =
    (streaming?.formats ?? []).some((format) => format.url) ||
    (streaming?.adaptiveFormats ?? []).some((format) => format.url);

  const androidUsable = isPlayable(player) && hasDirectUrl;

  if (!androidUsable) {
    watchHtml = await fetchWatchHtml(videoId);
    const watchPlayer = watchHtml ? extractPlayerResponse(watchHtml) : null;
    if (watchPlayer) {
      player = watchPlayer;
    }
  }

  if (!isPlayable(player)) {
    return {
      ok: false,
      error: {
        code: "content_unavailable",
        message: unavailableMessage(player),
      },
    };
  }

  const formats = player?.streamingData?.formats ?? [];
  const adaptiveFormats = player?.streamingData?.adaptiveFormats ?? [];

  // Strategi cadangan (halaman watch) umumnya menyisipkan signatureCipher,
  // sehingga fungsi decipher perlu dibangun dari base.js pemutar.
  const needsDecipher =
    watchHtml !== null &&
    formats.concat(adaptiveFormats).some(
      (format) => !format.url && (format.signatureCipher ?? format.cipher)
    );

  let decipher: DecipherFunction | null = null;

  if (needsDecipher && watchHtml) {
    const playerJsUrl = findPlayerJsUrl(watchHtml);

    if (playerJsUrl) {
      try {
        const response = await fetch(playerJsUrl, {
          headers: { "User-Agent": DESKTOP_USER_AGENT },
        });

        if (response.ok) {
          decipher = buildDecipher(await response.text());
        }
      } catch {
        decipher = null;
      }
    }
  }

  const videoItems = buildVideoItems(formats, decipher);
  const audioItem = buildAudioItem(adaptiveFormats, decipher);

  if (videoItems.length === 0) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Tidak ada format video yang dapat diambil dari YouTube.",
      },
    };
  }

  const thumbnails = player?.videoDetails?.thumbnail?.thumbnails ?? [];
  const bestThumbnail = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url ?? null : null;

  const durationRaw = Number(player?.videoDetails?.lengthSeconds ?? 0);
  const durationSeconds = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null;

  const data: ResolvedMedia = {
    platform: "youtube",
    type: "video",
    items: videoItems.map((item) => ({ ...item, thumbnailUrl: bestThumbnail })),
    audio: audioItem ? { ...audioItem, thumbnailUrl: bestThumbnail } : null,
    author: player?.videoDetails?.author ?? null,
    caption: player?.videoDetails?.title ?? null,
    durationSeconds,
    sourceUrl: WATCH_URL_PREFIX + videoId,
  };

  return { ok: true, data };
}
