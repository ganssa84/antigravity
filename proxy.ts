import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ANALYTICS_JWT_SECRET || "fallback-secret"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/analytics/login")) return NextResponse.next();
  if (pathname.startsWith("/api/analytics/auth")) return NextResponse.next();

  if (pathname.startsWith("/analytics") || pathname.startsWith("/api/analytics")) {
    const token = request.cookies.get("analytics_session")?.value;

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/analytics/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/analytics/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("analytics_session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/analytics/:path*", "/api/analytics/:path*"],
};
