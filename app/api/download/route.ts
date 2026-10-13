import { NextRequest } from "next/server";
import { getCookieFor } from "@/lib/media-cookies";

/*
  Route proxy unduhan dan pratinjau.

  Media di CDN TikTok/Instagram hanya bisa diakses bila request membawa
  header yang sesuai: Referer dari platform asal dan cookie sesi yang
  diterima saat tahap resolve. Tanpa itu CDN menjawab 403 Forbidden.
  Route ini menyuntikkan header tersebut sebelum meneruskan berkas.

  Parameter disposition menentukan cara peramban memperlakukan berkas:
  - attachment (bawaan): berkas diunduh.
  - inline: berkas dirender sebagai pratinjau di dalam halaman.
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");
  const platform = searchParams.get("platform") || "naze";
  const type = searchParams.get("type") || "media";
  const disposition =
    searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  if (!targetUrl) {
    return new Response("Missing URL parameter", { status: 400 });
  }

  try {
    const headers: Record<string, string> = { ...BASE_HEADERS };

    if (platform in PLATFORM_HEADERS) {
      Object.assign(headers, PLATFORM_HEADERS[platform]);
    }

    // Teruskan cookie sesi dari tahap resolve agar CDN tidak menolak 403.
    const sourceCookie = getCookieFor(targetUrl);
    if (sourceCookie) {
      headers["Cookie"] = sourceCookie;
    }

    // Teruskan header Range agar pratinjau video dapat di-seek tanpa
    // memuat ulang seluruh berkas.
    const range = request.headers.get("range");
    if (range) {
      headers["Range"] = range;
    }

    const response = await fetch(targetUrl, { headers });

    if (!response.ok && response.status !== 206) {
      return new Response(`Failed to fetch source: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType =
      response.headers.get("Content-Type") || "application/octet-stream";
    const extension = contentType.includes("video") ? "mp4" : "jpg";
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
