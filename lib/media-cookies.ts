/*
  Cache cookie sumber media.

  CDN TikTok/Instagram menolak (403) pengambilan berkas dari IP server bila
  request tidak membawa cookie sesi yang diterima saat halaman sumber diambil
  pada tahap resolve. Modul ini menyimpan cookie per URL media agar route
  unduh bisa meneruskannya ke CDN.

  Catatan: pada lingkungan serverless (mis. Vercel), memori antar instance
  tidak selalu dibagikan. Jika unduhan 403 sesekali setelah resolve sukses,
  itu gejala instance yang berbeda, bukan bug logika.
*/

const cookieByUrl = new Map<string, string>();

export function rememberCookies(mediaUrls: string[], cookie: string | null): void {
  if (!cookie) return;
  for (const url of mediaUrls) {
    cookieByUrl.set(url, cookie);
  }
}

export function getCookieFor(mediaUrl: string): string | null {
  return cookieByUrl.get(mediaUrl) ?? null;
}

export function extractResponseCookie(response: Response): string | null {
  const anyHeaders = response.headers as any;
  const setCookieList: string[] | undefined =
    typeof anyHeaders.getSetCookie === "function"
      ? anyHeaders.getSetCookie()
      : undefined;

  if (setCookieList && setCookieList.length > 0) {
    return setCookieList.map((c) => c.split(";")[0]).join("; ");
  }

  const raw = response.headers.get("set-cookie");
  if (!raw) return null;

  return raw
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}
