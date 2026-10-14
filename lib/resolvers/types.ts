export type Platform = "tiktok" | "instagram" | "youtube";

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
  /**
   * Penanda format pada platform sumber (misalnya itag YouTube). Dipakai
   * route unduhan untuk meminta URL segar bila URL lama ditolak karena
   * terikat IP instance yang berbeda. Null bila platform tidak memakai
   * penanda format.
   */
  formatId?: string | null;
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
  /**
   * Jalur audio mandiri yang tersedia pada platform sumber, misalnya
   * format audio-only YouTube atau lagu latar TikTok. Null bila platform
   * tidak menyediakan audio mandiri sehingga opsi unduhan MP3 tidak
   * tampil. Audio diunduh apa adanya tanpa transcoding: wadahnya
   * mengikuti sumber (mp3, m4a, atau webm).
   */
  audioItem?: ResolvedMediaItem | null;
}

export interface ResolveError {
  code: "invalid_link" | "unsupported_platform" | "content_unavailable" | "parse_failed";
  message: string;
}

export type ResolverResult =
  | { ok: true; data: ResolvedMedia }
  | { ok: false; error: ResolveError };
