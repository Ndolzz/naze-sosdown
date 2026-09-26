/*
  Autentikasi API key (opsional).

  Mode operasi ditentukan oleh environment variables:

  - API_KEYS: daftar key yang valid, dipisah koma.
    Contoh: "naze-dev-abc123, naze-prod-xyz789"
  - REQUIRE_API_KEY: "true" untuk mengaktifkan mode terproteksi.
    Selain "true" (termasuk tidak diisi), API berjalan dalam mode bebas.

  Key dikirim klien lewat salah satu dari:
  - Header x-api-key
  - Header Authorization: Bearer <key>

  Sengaja tidak memakai perbandingan waktu-konstan canggih karena key
  dibaca dari environment, bukan dari database; kecilnya risiko timing
  attack masih dapat diterima untuk skala proyek ini.
*/

function getValidKeys(): string[] {
  const raw = process.env.API_KEYS ?? "";
  return raw
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

export function isApiKeyRequired(): boolean {
  return process.env.REQUIRE_API_KEY === "true";
}

export function extractApiKey(request: Request): string | null {
  const headerKey = request.headers.get("x-api-key");
  if (headerKey) return headerKey;

  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }

  const url = new URL(request.url);
  const queryKey = url.searchParams.get("key");
  if (queryKey) return queryKey;

  return null;
}

export function isApiKeyValid(request: Request): boolean {
  if (!isApiKeyRequired()) {
    return true;
  }

  const provided = extractApiKey(request);
  if (!provided) return false;

  return getValidKeys().includes(provided);
}

export const UNAUTHORIZED_BODY =
  JSON.stringify({
    ok: false,
    error: {
      code: "invalid_link",
      message: "API key tidak valid atau tidak disertakan.",
    },
  });
