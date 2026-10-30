import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Protected routes: dashboard, admin
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  // If logged in but no username, redirect to onboarding
  // (except if already on onboarding or auth routes)
  if (
    token &&
    !token.username &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/signin")
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|restaurants|food|.*\\.png$).*)",
  ],
};
