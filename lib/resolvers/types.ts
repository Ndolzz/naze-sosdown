export type Platform = "tiktok" | "instagram";

export type MediaKind = "video" | "photo" | "carousel";

export interface ResolvedMediaItem {
  url: string;
  quality: string;
  hasWatermark: boolean;
  mimeType: string;
}

export interface ResolvedMedia {
  platform: Platform;
  type: MediaKind;
  items: ResolvedMediaItem[];
  author: string | null;
  caption: string | null;
}

export interface ResolveError {
  code: "invalid_link" | "unsupported_platform" | "content_unavailable" | "parse_failed";
  message: string;
}

export type ResolverResult =
  | { ok: true; data: ResolvedMedia }
  | { ok: false; error: ResolveError };
