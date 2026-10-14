import type { Platform } from "./types";

export interface PlatformDetectionResult {
  platform: Platform;
  normalizedUrl: string;
}

const TIKTOK_HOST_PATTERN = /(^|\.)tiktok\.com$/i;
const TIKTOK_SHORT_HOST_PATTERN = /(^|\.)(vt|vm)\.tiktok\.com$/i;
const INSTAGRAM_HOST_PATTERN = /(^|\.)instagram\.com$/i;
const YOUTUBE_HOST_PATTERN = /(^|\.)(youtube\.com|youtube-nocookie\.com)$/i;
const YOUTUBE_SHORT_HOST_PATTERN = /^youtu\.be$/i;

const INSTAGRAM_PATH_PATTERN = /^\/(p|reel|tv)\/[A-Za-z0-9_-]+/;

// ID video YouTube selalu 11 karakter alfanumerik, garis bawah, atau strip.
const YOUTUBE_ID_PATTERN = /^[\w-]{11}$/;
const YOUTUBE_ID_PATH_PATTERN = /^\/(?:shorts|live|embed|v)\/([\w-]{11})/;

function parseUrl(rawUrl: string): URL | null {
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function extractYouTubeId(parsed: URL): string | null {
  if (YOUTUBE_SHORT_HOST_PATTERN.test(parsed.hostname)) {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (!YOUTUBE_HOST_PATTERN.test(parsed.hostname)) return null;

  const queryId = parsed.searchParams.get("v");
  if (queryId && YOUTUBE_ID_PATTERN.test(queryId)) return queryId;

  const pathMatch = parsed.pathname.match(YOUTUBE_ID_PATH_PATTERN);
  if (pathMatch) return pathMatch[1];

  return null;
}

export function detectPlatform(rawUrl: string): PlatformDetectionResult | null {
  const trimmed = rawUrl.trim();
  if (trimmed.length === 0) return null;

  const parsed = parseUrl(trimmed);
  if (!parsed) return null;

  const host = parsed.hostname;

  if (TIKTOK_HOST_PATTERN.test(host) || TIKTOK_SHORT_HOST_PATTERN.test(host)) {
    return {
      platform: "tiktok",
      normalizedUrl: parsed.toString(),
    };
  }

  if (INSTAGRAM_HOST_PATTERN.test(host) && INSTAGRAM_PATH_PATTERN.test(parsed.pathname)) {
    return {
      platform: "instagram",
      normalizedUrl: parsed.toString(),
    };
  }

  const youtubeId = extractYouTubeId(parsed);
  if (youtubeId) {
    // URL dinormalisasi ke bentuk watch agar resolver dan route unduhan
    // selalu bekerja dengan satu representasi tautan yang sama.
    return {
      platform: "youtube",
      normalizedUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    };
  }

  return null;
}
