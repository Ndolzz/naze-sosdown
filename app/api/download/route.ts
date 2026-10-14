import { NextRequest } from "next/server";
import { extractResponseCookie, getCookieFor, rememberCookies } from "@/lib/media-cookies";
import { refreshYouTubeFormatUrl } from "@/lib/resolvers/youtube";

/*
  Route proxy unduhan dan pratinjau.

  Media di CDN TikTok/Instagram kadang menolak akses dari IP server dengan
  403 Forbidden. Penyebab paling umum: cookie sesi dari tahap resolve tidak
  tersedia pada instance serverless yang menangani permintaan ini (memori
  antar instance tidak dibagi), atau cookie yang tersimpan sudah
  kedaluwarsa. Route ini mengambil berkas dengan upaya berjenjang:

  1. Header lengkap plus cookie tersimpan dari tahap resolve.
  2. Untuk TikTok/Instagram: cookie sesi baru yang diambil langsung dari
     halaman sumber (parameter source), lalu ulangi permintaan. Untuk
     YouTube: URL segar dengan penanda format yang sama (parameter itag)
     karena URL googlevideo terikat IP instance penerbit, bukan cookie.
  3. Permintaan polos tanpa cookie dan referer untuk CDN yang justru
     menolak header tersebut.

  Parameter disposition menentukan cara peramban memperlakukan berkas:
  - attachment (bawaan): berkas diunduh.
  - inline: berkas dirender sebagai pratinjau di dalam halaman.

  Parameter ext mengizinkan ekstensi berkas hasil disesuaikan format
  audio sumber (mp3, m4a, atau webm) tanpa transcoding.
*/

const BASE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
};

const PLATFORM_HEADERS: Record<string, Record<string, string>> = {
  tiktok: {
    "Referer": "https://www.tiktok.com/",
  },
  instagram: {
    "Referer": "https://www.instagram.com/",
  },
  youtube: {
    "Referer": "https://www.youtube.com/",
  },
};

function isMediaResponse(status: number): boolean {
  return (status >= 200 && status < 300) || status === 206;
}

function buildMediaHeaders(
  platform: string,
  cookie: string | null,
  range: string | null,
  bare: boolean
): Record<string, string> {
  const headers: Record<string, string> = bare
    ? { "User-Agent": BASE_HEADERS["User-Agent"], "Accept": "*/*" }
    : { ...BASE_HEADERS };

  if (!bare && platform in PLATFORM_HEADERS) {
    Object.assign(headers, PLATFORM_HEADERS[platform]);
  }

  if (!bare && cookie) {
    headers["Cookie"] = cookie;
  }

  if (range) {
    headers["Range"] = range;
  }

  return headers;
}

// Ambil cookie sesi baru dari halaman sumber. Cookie juga disimpan ke cache
// media agar permintaan berikutnya langsung lolos pada upaya pertama.
async function refreshSessionCookie(
  sourceUrl: string,
  platform: string,
  targetUrl: string
): Promise<string | null> {
  const referer =
    platform in PLATFORM_HEADERS
      ? PLATFORM_HEADERS[platform]["Referer"]
      : "https://www.google.com/";

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": BASE_HEADERS["User-Agent"],
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
        "Referer": referer,
      },
      redirect: "follow",
    });

    if (!response.ok) return null;

    const cookie = extractResponseCookie(response);
    if (cookie) {
      rememberCookies([targetUrl], cookie);
    }
    return cookie;
  } catch {
    return null;
  }
}

async function fetchMediaWithFallback(
  targetUrl: string,
  platform: string,
  sourceUrl: string | null,
  range: string | null,
  itag: string | null
): Promise<Response> {
  // Upaya 1: header lengkap dengan cookie tersimpan dari tahap resolve.
  const first = await fetch(targetUrl, {
    headers: buildMediaHeaders(platform, getCookieFor(targetUrl), range, false),
  });
  if (isMediaResponse(first.status)) return first;

  // Upaya 2: perbarui sesi dari halaman sumber lalu ulangi. Untuk YouTube,
  // URL media terikat IP instance penerbit sehingga pembaruannya berupa
  // permintaan URL segar untuk itag yang sama, bukan cookie.
  if (platform === "youtube" && sourceUrl && itag) {
    const freshUrl = await refreshYouTubeFormatUrl(sourceUrl, itag);
    if (freshUrl && freshUrl !== targetUrl) {
      const refreshed = await fetch(freshUrl, {
        headers: buildMediaHeaders(platform, null, range, false),
      });
      if (isMediaResponse(refreshed.status)) return refreshed;
    }
  } else if (sourceUrl) {
    const freshCookie = await refreshSessionCookie(sourceUrl, platform, targetUrl);
    if (freshCookie) {
      const second = await fetch(targetUrl, {
        headers: buildMediaHeaders(platform, freshCookie, range, false),
      });
      if (isMediaResponse(second.status)) return second;
    }
  }

  // Upaya 3: permintaan polos tanpa cookie dan referer.
  return fetch(targetUrl, {
    headers: buildMediaHeaders(platform, null, range, true),
  });
}

function pickExtension(contentType: string, requested: string | null): string {
  if (requested && /^[a-z0-9]{2,4}$/i.test(requested)) {
    return requested.toLowerCase();
  }
  if (contentType.startsWith("video/")) return "mp4";
  if (contentType.startsWith("audio/mpeg")) return "mp3";
  if (contentType.startsWith("audio/webm")) return "webm";
  if (contentType.startsWith("audio/")) return "m4a";
  return "jpg";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const platform = searchParams.get("platform") || "naze";
  const type = searchParams.get("type") || "media";
  const sourceUrl = searchParams.get("source");
  const itag = searchParams.get("itag");
  const requestedExtension = searchParams.get("ext");
  const disposition =
    searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  if (!targetUrl) {
    return new Response("Missing URL parameter", { status: 400 });
  }

  try {
    const range = request.headers.get("range");
    const response = await fetchMediaWithFallback(targetUrl, platform, sourceUrl, range, itag);

    if (!isMediaResponse(response.status)) {
      return new Response(`Failed to fetch source: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";
    const extension = pickExtension(contentType, requestedExtension);
    const filename = `${platform}-${type}-${Date.now()}.${extension}`;

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set(
      "Content-Disposition",
      `${disposition}; filename="${filename}"`
    );

    if (disposition === "inline") {
      responseHeaders.set("Accept-Ranges", "bytes");
      const contentRange = response.headers.get("Content-Range");
      if (contentRange) {
        responseHeaders.set("Content-Range", contentRange);
      }
    }

    // Buffer seluruh berkas di memori. Pada skala proyek ini masih dapat
    // diterima; streaming penuh menjadi pekerjaan fase berikutnya.
    const data = await response.arrayBuffer();

    return new Response(data, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[API_DOWNLOAD_ERROR]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
