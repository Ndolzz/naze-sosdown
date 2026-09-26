import { NextRequest, NextResponse } from "next/server";
import { detectPlatform } from "@/lib/resolvers/detect-platform";
import { resolveTikTok } from "@/lib/resolvers/tiktok";
import { resolveInstagram } from "@/lib/resolvers/instagram";
import type { ResolverResult } from "@/lib/resolvers/types";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_link", message: "Tautan tidak boleh kosong." } },
        { status: 400 }
      );
    }

    const detected = detectPlatform(url);

    if (!detected) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "unsupported_platform",
            message: "Platform tidak didukung atau tautan tidak dikenali.",
          },
        },
        { status: 400 }
      );
    }

    let result: ResolverResult;

    if (detected.platform === "tiktok") {
      result = await resolveTikTok(detected.normalizedUrl);
    } else if (detected.platform === "instagram") {
      result = await resolveInstagram(detected.normalizedUrl);
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "unsupported_platform",
            message: "Platform belum didukung.",
          },
        },
        { status: 400 }
      );
    }

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API_RESOLVE_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "parse_failed",
          message: "Terjadi kesalahan internal saat memproses tautan.",
        },
      },
      { status: 500 }
    );
  }
}
