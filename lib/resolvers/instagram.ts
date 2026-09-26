import type { ResolverResult, ResolvedMediaItem, MediaKind } from "./types";

/*
  Resolver Instagram

  Instagram jauh lebih ketat dibanding TikTok dalam membatasi akses tanpa
  sesi login. Pendekatan yang dipakai di sini adalah membaca halaman embed
  publik (/embed/captioned/) yang masih bisa diakses tanpa login untuk
  konten publik, lalu mengurai blok data JSON yang disisipkan di dalam HTML
  tersebut. Ini adalah bagian paling rawan berubah dari seluruh proyek,
  sebagaimana dicatat pada spec.md bagian 7. Jika resolver ini mulai gagal
  secara luas, langkah pertama adalah memeriksa ulang bentuk HTML halaman
  embed Instagram saat ini, bukan hanya memeriksa kode di bawah.
*/

const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SHORTCODE_PATTERN = /\/(p|reel|tv)\/([A-Za-z0-9_-]+)/;

// PERAWATAN: pola ini mengasumsikan Instagram masih menyisipkan blok
// "contextJSON" pada halaman embed. Pola ini yang paling mungkin perlu
// disesuaikan lebih dulu bila resolver berhenti bekerja.
const CONTEXT_JSON_PATTERN = /"contextJSON":"((?:\\.|[^"\\])*)"/;

interface InstagramMediaNode {
  is_video: boolean;
  display_url?: string;
  video_url?: string;
  dimensions?: { width: number; height: number };
}

interface InstagramContext {
  shortcode_media?: {
    __typename: string;
    display_url?: string;
    video_url?: string;
    is_video?: boolean;
    dimensions?: { width: number; height: number };
    owner?: { username?: string };
    edge_media_to_caption?: { edges?: Array<{ node?: { text?: string } }> };
    edge_sidecar_to_children?: { edges?: Array<{ node?: InstagramMediaNode }> };
  };
}

function extractShortcode(rawUrl: string): { type: string; shortcode: string } | null {
  const match = rawUrl.match(SHORTCODE_PATTERN);
  if (!match) return null;
  return { type: match[1], shortcode: match[2] };
}

function unescapeJsonString(raw: string): string {
  return JSON.parse(`"${raw}"`);
}

async function fetchEmbedHtml(type: string, shortcode: string): Promise<string> {
  const embedType = type === "p" ? "p" : type;
  const url = `https://www.instagram.com/${embedType}/${shortcode}/embed/captioned/`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": DESKTOP_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`embed page request failed with status ${response.status}`);
  }

  return response.text();
}

function parseContext(html: string): InstagramContext | null {
  const match = html.match(CONTEXT_JSON_PATTERN);
  if (!match) return null;

  try {
    const unescaped = unescapeJsonString(match[1]);
    return JSON.parse(unescaped) as InstagramContext;
  } catch {
    return null;
  }
}

function looksUnavailable(html: string): boolean {
  return (
    html.includes("Sorry, this page isn't available") ||
    html.includes("halaman ini tidak tersedia")
  );
}

function buildItemsFromNode(node: {
  is_video?: boolean;
  video_url?: string;
  display_url?: string;
  dimensions?: { width: number; height: number };
}): ResolvedMediaItem[] {
  const quality = node.dimensions
    ? `${node.dimensions.width}x${node.dimensions.height}`
    : "original";

  if (node.is_video && node.video_url) {
    return [
      {
        url: node.video_url,
        quality,
        hasWatermark: false,
        mimeType: "video/mp4",
      },
    ];
  }

  if (node.display_url) {
    return [
      {
        url: node.display_url,
        quality,
        hasWatermark: false,
        mimeType: "image/jpeg",
      },
    ];
  }

  return [];
}

export async function resolveInstagram(rawUrl: string): Promise<ResolverResult> {
  const shortcodeInfo = extractShortcode(rawUrl);
  if (!shortcodeInfo) {
    return {
      ok: false,
      error: {
        code: "invalid_link",
        message: "Tautan Instagram tidak mengandung penanda postingan yang dikenali.",
      },
    };
  }

  let html: string;
  try {
    html = await fetchEmbedHtml(shortcodeInfo.type, shortcodeInfo.shortcode);
  } catch {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Gagal mengambil halaman Instagram. Struktur sumber kemungkinan berubah.",
      },
    };
  }

  if (looksUnavailable(html)) {
    return {
      ok: false,
      error: {
        code: "content_unavailable",
        message: "Postingan Instagram tidak ditemukan, privat, atau sudah dihapus.",
      },
    };
  }

  const context = parseContext(html);
  const media = context?.shortcode_media;

  if (!media) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Data media tidak dapat diurai dari halaman Instagram.",
      },
    };
  }

  const sidecarEdges = media.edge_sidecar_to_children?.edges;
  let items: ResolvedMediaItem[] = [];
  let type: MediaKind = "photo";

  if (sidecarEdges && sidecarEdges.length > 0) {
    type = "carousel";
    items = sidecarEdges.flatMap((edge) =>
      edge.node ? buildItemsFromNode(edge.node) : []
    );
  } else {
    type = media.is_video ? "video" : "photo";
    items = buildItemsFromNode(media);
  }

  if (items.length === 0) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Tidak ada media yang dapat diambil dari postingan ini.",
      },
    };
  }

  const captionEdges = media.edge_media_to_caption?.edges;
  const caption = captionEdges && captionEdges.length > 0 ? captionEdges[0].node?.text ?? null : null;

  return {
    ok: true,
    data: {
      platform: "instagram",
      type,
      items,
      author: media.owner?.username ?? null,
      caption: caption ?? null,
    },
  };
}
