import { NextRequest } from "next/server";
import { extractResponseCookie, getCookieFor, rememberCookies } from "@/lib/media-cookies";

/*
  Route proxy unduhan dan pratinjau.

  Media di CDN TikTok/Instagram kadang menolak akses dari IP server dengan
  403 Forbidden. Penyebab paling umum: cookie sesi dari tahap resolve tidak
  tersedia pada instance serverless yang menangani permintaan ini (memori
  antar instance tidak dibagi), cookie tersimpan sudah kedaluwarsa, atau
  CDN menolak permintaan pertama yang membawa cookie sesi yang baru diambil.
  Gejala terakhir inilah yang membuat unduhan pertama setelah halaman dibuka
  gagal padahal percobaan ulang setelah refresh berhasil.

  Route ini karena itu menjalankan tiga upaya berjenjang dalam beberapa
  ronde dengan jeda singkat:

  1. Header lengkap plus cookie tersimpan dari tahap resolve.
  2. Cookie sesi baru yang diambil langsung dari halaman sumber (parameter
     source), lalu ulangi permintaan. Cookie baru juga disimpan ke cache
     sehingga ronde berikutnya langsung memakainya pada upaya pertama.
  3. Permintaan polos tanpa cookie dan referer untuk CDN yang justru
     menolak header tersebut.

  Parameter disposition menentukan cara peramban memperlakukan berkas:
  - attachment (bawaan): berkas diunduh.
  - inline: berkas dirender sebagai pratinjau di dalam halaman.
  Parameter name (opsional) menyetel nama dasar berkas unduhan; nilainya
  disaring dari karakter yang tidak aman untuk header.
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
};

const RETRY_ROUNDS = 2;
const RETRY_DELAY_MS = 600;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

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
  range: string | null
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let round = 0; round < RETRY_ROUNDS; round++) {
    if (round > 0) {
      await delay(RETRY_DELAY_MS);
    }

    // Upaya 1: header lengkap dengan cookie tersimpan dari tahap resolve.
    const first = await fetch(targetUrl, {
      headers: buildMediaHeaders(platform, getCookieFor(targetUrl), range, false),
    });
    lastResponse = first;
    if (isMediaResponse(first.status)) return first;

    // Upaya 2: perbarui sesi dari halaman sumber lalu ulangi.
    if (sourceUrl) {
      const freshCookie = await refreshSessionCookie(sourceUrl, platform, targetUrl);
      if (freshCookie) {
        const second = await fetch(targetUrl, {
          headers: buildMediaHeaders(platform, freshCookie, range, false),
        });
        lastResponse = second;
        if (isMediaResponse(second.status)) return second;
      }
    }

    // Upaya 3: permintaan polos tanpa cookie dan referer.
    const bare = await fetch(targetUrl, {
      headers: buildMediaHeaders(platform, null, range, true),
    });
    lastResponse = bare;
    if (isMediaResponse(bare.status)) return bare;
  }

  if (lastResponse) {
    return lastResponse;
  }

  return new Response("Failed to fetch source", { status: 502 });
}

function extensionFor(contentType: string): string {
  if (contentType.startsWith("audio/")) {
    if (contentType.includes("mp4") || contentType.includes("m4a") || contentType.includes("aac")) {
      return "m4a";
    }
    if (contentType.includes("webm") || contentType.includes("opus")) {
      return "weba";
    }
    return "bin";
  }

  if (contentType.startsWith("video/")) {
    return contentType.includes("webm") ? "webm" : "mp4";
  }

  if (contentType.startsWith("image/")) {
    return "jpg";
  }

  return "bin";
}

// Nama berkas dari klien disaring: hanya huruf, angka, spasi, titik, strip,
// dan garis bawah, maksimal 80 karakter, agar aman sebagai header.
function sanitizeName(rawName: string | null): string | null {
  if (!rawName) return null;

  const cleaned = rawName
    .replace(/[^\w\-. ]+/g, "")
    .trim()
    .slice(0, 80);

  return cleaned.length > 0 ? cleaned : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const platform = searchParams.get("platform") || "naze";
  const type = searchParams.get("type") || "media";
  const sourceUrl = searchParams.get("source");
  const name = searchParams.get("name");
  const disposition =
    searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  if (!targetUrl) {
    return new Response("Missing URL parameter", { status: 400 });
  }

  try {
    const range = request.headers.get("range");
    const response = await fetchMediaWithFallback(targetUrl, platform, sourceUrl, range);

    if (!isMediaResponse(response.status)) {
      return new Response("Failed to fetch source: " + response.status, {
        status: response.status,
      });
    }

    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";
    const extension = extensionFor(contentType);
    const safeName = sanitizeName(name);
    const filename = safeName
      ? safeName + "." + extension
      : platform + "-" + type + "-" + Date.now() + "." + extension;

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set(
      "Content-Disposition",
      disposition + '; filename="' + filename + '"'
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
