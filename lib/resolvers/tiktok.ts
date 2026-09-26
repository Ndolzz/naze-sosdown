import type { ResolverResult, ResolvedMediaItem } from "./types";

/*
  Resolver TikTok

  Sumber data diambil dari endpoint internal yang dipakai oleh halaman web
  TikTok sendiri (bukan API resmi berbayar). Struktur endpoint dan bentuk
  JSON di bawah ini dapat berubah sewaktu waktu mengikuti perubahan pada
  sisi TikTok, sebagaimana sudah dicatat sebagai risiko pada spec.md bagian 7.
  Titik yang paling rawan berubah ditandai dengan komentar PERAWATAN di bawah.
*/

const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SHORT_LINK_HOST_PATTERN = /(^|\.)(vt|vm)\.tiktok\.com$/i;

async function expandShortLink(rawUrl: string): Promise<string> {
  const parsed = new URL(rawUrl);
  if (!SHORT_LINK_HOST_PATTERN.test(parsed.hostname)) {
    return rawUrl;
  }

  const response = await fetch(rawUrl, {
    method: "GET",
    redirect: "follow",
    headers: { "User-Agent": DESKTOP_USER_AGENT },
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

// PERAWATAN: path endpoint ini mengikuti struktur yang dipakai halaman web
// TikTok saat dokumen ini ditulis. Jika resolver mulai gagal secara luas,
// langkah pertama debugging adalah memeriksa apakah path atau parameter
// query di bawah ini masih dipakai oleh tiktok.com.
async function fetchItemDetail(itemId: string): Promise<any> {
  const endpoint = `https://www.tiktok.com/api/item/detail/?itemId=${itemId}&aid=1988&app_name=tiktok_web&device_platform=web_pc`;

  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": DESKTOP_USER_AGENT,
      Referer: "https://www.tiktok.com/",
      Accept: "application/json, text/plain, */*",
    },
  });

  if (!response.ok) {
    throw new Error(`item detail request failed with status ${response.status}`);
  }

  return response.json();
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

  let detail: any;
  try {
    detail = await fetchItemDetail(itemId);
  } catch {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Gagal mengambil data dari TikTok. Struktur sumber kemungkinan berubah.",
      },
    };
  }

  const itemStruct = detail?.itemInfo?.itemStruct;
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
