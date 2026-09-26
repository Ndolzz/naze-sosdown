import type { Platform } from "./types";

export interface PlatformDetectionResult {
  platform: Platform;
  normalizedUrl: string;
}

const TIKTOK_HOST_PATTERN = /(^|\.)tiktok\.com$/i;
const TIKTOK_SHORT_HOST_PATTERN = /(^|\.)(vt|vm)\.tiktok\.com$/i;
const INSTAGRAM_HOST_PATTERN = /(^|\.)instagram\.com$/i;

const INSTAGRAM_PATH_PATTERN = /^\/(p|reel|tv)\/[A-Za-z0-9_-]+/;

function parseUrl(rawUrl: string): URL | null {
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    return new URL(withScheme);
  } catch {
    return null;
  }
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

  return null;
}
