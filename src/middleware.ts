import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Concilium middleware — request logging only (auth redirect in DEV-4).
 *
 * Logs method, path, status, and duration for every incoming request.
 * No blocking / redirect logic at this stage.
 */
export function middleware(request: NextRequest) {
  const start = Date.now();

  const response = NextResponse.next();

  const duration = Date.now() - start;
  console.log(
    `[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname} — ${response.status} (${duration}ms)`,
  );

  return response;
}

/**
 * Match all request paths except static files, images, and Next.js internals.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|screenshots|design-system).*)"],
};
