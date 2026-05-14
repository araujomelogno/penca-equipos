import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/api/auth", "/api/health", "/api/cron"];
const staticPaths = ["/uploads"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and public API paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/flags") ||
    pathname.startsWith("/avatars") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Always serve static asset paths (uploads, etc.)
  if (staticPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  // Redirect unauthenticated users to login.
  // Note: cookie presence is used as a cheap signal — the actual session is
  // validated by `auth()` inside pages/layouts. If the cookie is stale the
  // page will redirect to /login itself. We intentionally do NOT redirect
  // authenticated-looking users away from /login here because that creates an
  // infinite loop when the cookie can't be decrypted.
  if (!isPublicPath && !hasSession && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
