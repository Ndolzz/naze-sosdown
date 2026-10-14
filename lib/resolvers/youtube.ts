import type { ResolverResult, ResolvedMediaItem } from "./types";
import { extractResponseCookie, rememberCookies } from "@/lib/media-cookies";

/*
  Resolver YouTube

  Pendekatan: menanyakan endpoint internal InnerTube (youtubei/v1/player)
  yang dipakai aplikasi resmi YouTube dengan klien seluler (IOS, dengan
  TVHTML5_SIMPLY_EMBEDDED_PLAYER sebagai cadangan). Klien seluler umumnya
  mengembalikan URL media langsung tanpa proses dekripsi signature yang
  dibutuhkan klien web. Struktur respons InnerTube tetap bisa berubah
  sewaktu-waktu; titik paling rawan ditandai dengan komentar PERAWATAN.

  Batasan lingkungan serverless yang diketahui:

  1. URL googlevideo terikat IP instance yang melakukan permintaan player.
     Bila unduhan ditolak dari instance berbeda, route unduhan meminta
     URL segar lewat refreshYouTubeFormatUrl dengan penanda format (itag).
  2. Tanpa ffmpeg pada lingkungan serverless, opsi MP4 berasal dari
     format muxed (video dan audio dalam satu berkas, umumnya 360p dan
     720p). Format video resolusi lebih tinggi hanya tersedia sebagai
     stream terpisah tanpa audio sehingga tidak ditawarkan.
  3. Opsi MP3 mengunduh jalur audio asli dari sumber tanpa transcoding;
     wadahnya mengikuti sumber, umumnya m4a atau webm.
*/

const INNERTUBE_ENDPOINT = "https://www.youtube.com/youtubei/v1/player";

interface InnertubeClient {
  clientName: string;
  clientVersion: string;
  userAgent: string;
  clientHeaderId?: string;
  deviceModel?: string;
  osName?: string;
  osVersion?: string;
  thirdParty?: { embedUrl: string };
}

const INNERTUBE_CLIENTS: InnertubeClient[] = [
  {
    clientName: "IOS",
    clientVersion: "19.29.1",
    userAgent: "com.google.ios.youtube/19.29.1 (iPhone16,2; U12; iOS 17.5.1)",
    clientHeaderId: "5",
    deviceModel: "iPhone16,2",
    osName: "iOS",
    osVersion: "17.5.1.21F90",
  },
  {
    clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    clientVersion: "2.0",
    userAgent: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version",
    clientHeaderId: "85",
    thirdParty: { embedUrl: "https://www.youtube.com" },
  },
];

function buildRequestBody(videoId: string, client: InnertubeClient): string {
  return JSON.stringify({
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
    context: {
      client: {
        clientName: client.clientName,
        clientVersion: client.clientVersion,
        hl: "en",
        gl: "US",
        ...(client.deviceModel ? { deviceModel: client.deviceModel } : {}),
        ...(client.osName ? { osName: client.osName } : {}),
        ...(client.osVersion ? { osVersion: client.osVersion } : {}),
      },
      ...(client.thirdParty ? { thirdParty: client.thirdParty } : {}),
    },
  });
}

async function requestPlayer(videoId: string, client: InnertubeClient): Promise<Response | null> {
  try {
    return await fetch(INNERTUBE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": client.userAgent,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        ...(client.clientHeaderId
          ? {
              "X-Youtube-Client-Name": client.clientHeaderId,
              "X-Youtube-Client-Version": client.clientVersion,
            }
          : {}),
      },
      body: buildRequestBody(videoId, client),
    });
  } catch {
    return null;
  }
}

/*
  PERAWATAN: klien pertama yang mengembalikan playabilityStatus OK dipakai.
  Jika YouTube mulai menuntut PO token atau verifikasi tambahan pada klien
  seluler, urutan dan konfigurasi klien pada INNERTUBE_CLIENTS adalah titik
  pertama yang perlu diperbarui.
*/
async function fetchPlayableResponse(
  videoId: string
): Promise<{ data: any; cookie: string | null } | null> {
  for (const client of INNERTUBE_CLIENTS) {
    const response = await requestPlayer(videoId, client);
    if (!response) continue;

    const cookie = extractResponseCookie(response);

    let data: any;
    try {
      data = await response.json();
    } catch {
      continue;
    }

    if (data?.playabilityStatus?.status !== "OK") continue;

    return { data, cookie };
  }

  return null;
}

function hasDirectUrl(format: any): boolean {
  return typeof format?.url === "string" && format.url.length > 0;
}

function parseHeight(qualityLabel: string): number {
  const match = qualityLabel.match(/(\d+)p/);
  return match ? Number(match[1]) : 0;
}

function pickCover(videoDetails: any): string | null {
  const thumbnails = videoDetails?.thumbnail?.thumbnails;
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
  const last = thumbnails[thumbnails.length - 1];
  return typeof last?.url === "string" ? last.url : null;
}

/*
  Hanya format muxed (video dan audio dalam satu berkas) yang ditawarkan
  sebagai opsi MP4 karena lingkungan serverless tidak menyediakan ffmpeg
  untuk menggabungkan stream terpisah. Format tanpa URL langsung dilewati
  karena membutuhkan dekripsi signature klien web.
*/
function buildVideoItems(muxedFormats: any[], cover: string | null): ResolvedMediaItem[] {
  return muxedFormats
    .filter((format) => hasDirectUrl(format))
    .filter(
      (format) =>
        typeof format?.mimeType === "string" && format.mimeType.startsWith("video/mp4")
    )
    .map((format) => {
      const qualityLabel: string =
        typeof format?.qualityLabel === "string" && format.qualityLabel.length > 0
          ? format.qualityLabel
          : typeof format?.height === "number" && format.height > 0
          ? `${format.height}p`
          : "video";

      return {
        url: format.url,
        quality: qualityLabel,
        label: null,
        hasWatermark: false,
        mimeType: "video/mp4",
        thumbnailUrl: cover,
        formatId: format?.itag != null ? String(format.itag) : null,
      };
    })
    .sort((a, b) => parseHeight(b.quality) - parseHeight(a.quality));
}

function buildAudioItem(adaptiveFormats: any[], cover: string | null): ResolvedMediaItem | null {
  const audioFormats = adaptiveFormats
    .filter((format) => hasDirectUrl(format))
    .filter(
      (format) => typeof format?.mimeType === "string" && format.mimeType.startsWith("audio/")
    )
    .sort(
      (a, b) => (b.averageBitrate ?? b.bitrate ?? 0) - (a.averageBitrate ?? a.bitrate ?? 0)
    );

  const best = audioFormats[0];
  if (!best) return null;

  const bitrate = Number(best.averageBitrate ?? best.bitrate ?? 0);

  return {
    url: best.url,
    quality: bitrate > 0 ? `${Math.round(bitrate / 1000)}kbps` : "audio",
    label: null,
    hasWatermark: false,
    mimeType: String(best.mimeType).split(";")[0].trim(),
    thumbnailUrl: cover,
    formatId: best.itag != null ? String(best.itag) : null,
  };
}

function extractVideoIdFromUrl(rawUrl: string): string | null {
  const match = rawUrl.match(/[?&]v=([\w-]{11})/);
  return match ? match[1] : null;
}

/*
  Meminta URL segar untuk satu penanda format (itag). Dipakai route unduhan
  bila URL lama ditolak karena diterbitkan untuk IP instance lain.
*/
export async function refreshYouTubeFormatUrl(
  sourceUrl: string,
  formatId: string
): Promise<string | null> {
  const videoId = extractVideoIdFromUrl(sourceUrl);
  if (!videoId) return null;

  const played = await fetchPlayableResponse(videoId);
  if (!played) return null;

  const streamingData = played.data?.streamingData ?? {};
  const formats = [
    ...(Array.isArray(streamingData.formats) ? streamingData.formats : []),
    ...(Array.isArray(streamingData.adaptiveFormats) ? streamingData.adaptiveFormats : []),
  ];

  const match = formats.find(
    (format) => String(format?.itag) === formatId && hasDirectUrl(format)
  );

  return match ? match.url : null;
}

export async function resolveYouTube(rawUrl: string): Promise<ResolverResult> {
  const videoId = extractVideoIdFromUrl(rawUrl);
  if (!videoId) {
    return {
      ok: false,
      error: {
        code: "invalid_link",
        message: "Tautan YouTube tidak mengandung penanda video yang dikenali.",
      },
    };
  }

  const played = await fetchPlayableResponse(videoId);

  if (!played) {
    return {
      ok: false,
      error: {
        code: "content_unavailable",
        message:
          "Video YouTube tidak dapat diputar. Kemungkinan video privat, dibatasi usia, atau YouTube meminta verifikasi tambahan.",
      },
    };
  }

  const streamingData = played.data?.streamingData ?? {};
  const muxedFormats = Array.isArray(streamingData.formats) ? streamingData.formats : [];
  const adaptiveFormats = Array.isArray(streamingData.adaptiveFormats)
    ? streamingData.adaptiveFormats
    : [];

  const videoDetails = played.data?.videoDetails ?? null;
  const cover = pickCover(videoDetails);
  const videoItems = buildVideoItems(muxedFormats, cover);
  const audioItem = buildAudioItem(adaptiveFormats, cover);

  if (videoItems.length === 0) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Data media tidak dapat diurai dari respons YouTube.",
      },
    };
  }

  const mediaUrls = videoItems
    .flatMap((item) =>
      item.thumbnailUrl && item.thumbnailUrl !== item.url
        ? [item.url, item.thumbnailUrl]
        : [item.url]
    )
    .concat(audioItem ? [audioItem.url] : []);
  rememberCookies(mediaUrls, played.cookie);

  return {
    ok: true,
    data: {
      platform: "youtube",
      type: "video",
      items: videoItems,
      author: videoDetails?.author ?? null,
      caption: videoDetails?.title ?? null,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      audioItem,
    },
  };
}
