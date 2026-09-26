import { NextRequest, NextResponse } from "next/server";
import { isApiKeyRequired, isApiKeyValid, UNAUTHORIZED_BODY } from "@/lib/api-auth";

/*
  Middleware proteksi API key untuk seluruh route di bawah /api/.

  Mode terproteksi aktif hanya bila REQUIRE_API_KEY=true. Pada mode bebas,
  seluruh request lolos tanpa pemeriksaan, sehingga halaman web dan API
  berperilaku sama seperti sebelum fitur API key ditambahkan.
*/

export function middleware(request: NextRequest) {
  if (!isApiKeyRequired() || isApiKeyValid(request)) {
    return NextResponse.next();
  }

  return new NextResponse(UNAUTHORIZED_BODY, {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export const config = {
  matcher: "/api/:path*",
};
