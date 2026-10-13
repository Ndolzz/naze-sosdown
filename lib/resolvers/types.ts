export type Platform = "tiktok" | "instagram";

export type MediaKind = "video" | "photo" | "carousel";

export type QualityLabel = "hd" | "sd";

export interface ResolvedMediaItem {
  url: string;
  quality: string;
  /**
   * Label kualitas varian: hd untuk varian bitrate tertinggi, sd untuk
   * varian di bawahnya. Null bila item tidak termasuk pilihan kualitas,
   * misalnya versi berwatermark atau media satu varian.
   */
  label?: QualityLabel | null;
  hasWatermark: boolean;
  mimeType: string;
  /** URL gambar sampul untuk pratinjau pada antarmuka. */
  thumbnailUrl?: string | null;
}

export interface ResolvedMedia {
  platform: Platform;
  type: MediaKind;
  items: ResolvedMediaItem[];
  author: string | null;
  caption: string | null;
  /**
   * URL halaman sumber (halaman video TikTok atau embed Instagram).
   * Dipakai route unduhan untuk memperbarui cookie sesi saat CDN menolak
   * permintaan dengan 403.
   */
  sourceUrl?: string | null;
}

export interface ResolveError {
  code: "invalid_link" | "unsupported_platform" | "content_unavailable" | "parse_failed";
  message: string;
}

export type ResolverResult =
  | { ok: true; data: ResolvedMedia }
  | { ok: false; error: ResolveError };
