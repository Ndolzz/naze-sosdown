import type { ResolverResult, ResolvedMediaItem } from "./types";

/*
  Resolver TikTok

  Pendekatan utama: mengambil halaman web video/foto TikTok lalu membaca blok
  JSON __UNIVERSAL_DATA_FOR_REHYDRATION__ yang disisipkan TikTok di dalam
  HTML halamannya sendiri. Blok ini dipakai oleh aplikasi web TikTok untuk
  menghidrasikan konten, sehingga strukturnya jauh lebih stabil dibanding
  endpoint internal /api/item/detail/ yang memerlukan signature dan cookie.
  Struktur ini tetap bisa berubah sewaktu-waktu sebagaimana dicatat pada
  spec.md bagian 7. Titik yang paling rawan berubah ditandai dengan
  komentar PERAWATAN di bawah.
*/

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
  "Referer": "https://www.tiktok.com/",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Upgrade-Insecure-Requests": "1",
};

const SHORT_LINK_HOST_PATTERN = /(^|\.)(vt|vm)\.tiktok\.com$/i;

async function expandShortLink(rawUrl: string): Promise<string> {
  const parsed = new URL(rawUrl);
  if (!SHORT_LINK_HOST_PATTERN.test(parsed.hostname)) {
    return rawUrl;
  }

  const response = await fetch(rawUrl, {
    method: "GET",
    redirect: "follow",
    headers: BROWSER_HEADERS,
  });

  return response.url || rawUrl;
}

function extractItemId(canonicalUrl: string): string | null {
  const videoMatch = canonicalUrl.match(/\/video\/(\d+)/);
  if (videoMatch) return videoMatch[1];

  const photoMatch = canonicalUrl.match(/\/photo\/(\d+)/);
  if (photoMatch) return photoMatch[1];

  return null;
}

async function fetchPageHtml(canonicalUrl: string): Promise<string> {
  const response = await fetch(canonicalUrl, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`page request failed with status ${response.status}`);
  }

  return response.text();
}

// PERAWATAN: blok data rehidrasi ini dibaca berdasarkan id script-nya.
// Jika resolver mulai gagal secara luas, periksa apakah TikTok masih
// menyisipkan script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" pada HTML.
function parseRehydrationData(html: string): any | null {
  const pattern =
    /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;
  const match = html.match(pattern);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractItemStruct(universalData: any): any | null {
  // PERAWATAN: jalur key di bawah ini mengikuti struktur webapp TikTok
  // saat dokumen ini ditulis.
  const detail = universalData?.__DEFAULT_SCOPE__?.["webapp.video-detail"];
  return detail?.itemInfo?.itemStruct ?? null;
}

function buildVideoItems(itemStruct: any): ResolvedMediaItem[] {
  const video = itemStruct?.video;
  if (!video) return [];

  const items: ResolvedMediaItem[] = [];

  const noWatermarkUrl: string | undefined = video.playAddr;
  const watermarkUrl: string | undefined = video.downloadAddr;

  if (noWatermarkUrl) {
    items.push({
      url: noWatermarkUrl,
      quality: video.ratio ? `${video.ratio}` : "original",
      hasWatermark: false,
      mimeType: "video/mp4",
    });
  }

  if (watermarkUrl && watermarkUrl !== noWatermarkUrl) {
    items.push({
      url: watermarkUrl,
      quality: video.ratio ? `${video.ratio}` : "original",
      hasWatermark: true,
      mimeType: "video/mp4",
    });
  }

  return items;
}

function buildPhotoItems(itemStruct: any): ResolvedMediaItem[] {
  const images = itemStruct?.imagePost?.images;
  if (!Array.isArray(images)) return [];

  return images
    .map((image: any) => {
      const url = image?.imageURL?.urlList?.[0];
      if (!url) return null;

      const item: ResolvedMediaItem = {
        url,
        quality: `${image?.imageWidth ?? "auto"}x${image?.imageHeight ?? "auto"}`,
        hasWatermark: false,
        mimeType: "image/jpeg",
      };
      return item;
    })
    .filter((item: ResolvedMediaItem | null): item is ResolvedMediaItem => item !== null);
}

export async function resolveTikTok(rawUrl: string): Promise<ResolverResult> {
  let canonicalUrl: string;

  try {
    canonicalUrl = await expandShortLink(rawUrl);
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid_link",
        message: "Tautan pendek TikTok tidak dapat dibuka.",
      },
    };
  }

  const itemId = extractItemId(canonicalUrl);
  if (!itemId) {
    return {
      ok: false,
      error: {
        code: "invalid_link",
        message: "Tautan TikTok tidak mengandung penanda video atau foto yang dikenali.",
      },
    };
  }

  let html: string;
  try {
    html = await fetchPageHtml(canonicalUrl);
  } catch {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Gagal mengambil halaman TikTok. Struktur sumber kemungkinan berubah.",
      },
    };
  }

  const universalData = parseRehydrationData(html);
  const itemStruct = universalData ? extractItemStruct(universalData) : null;

  if (!itemStruct) {
    return {
      ok: false,
      error: {
        code: "content_unavailable",
        message: "Konten TikTok tidak ditemukan atau sudah tidak tersedia.",
      },
    };
  }

  const isPhotoPost = Boolean(itemStruct?.imagePost?.images?.length);
  const items = isPhotoPost ? buildPhotoItems(itemStruct) : buildVideoItems(itemStruct);

  if (items.length === 0) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Data media tidak dapat diurai dari respons TikTok.",
      },
    };
  }

  return {
    ok: true,
    data: {
      platform: "tiktok",
      type: isPhotoPost ? "photo" : "video",
      items,
      author: itemStruct?.author?.uniqueId ?? null,
      caption: itemStruct?.desc ?? null,
    },
  };
}
