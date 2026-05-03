import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

// Routes that stay open during MAINTENANCE_MODE - sign-out should always
// work so users aren't trapped in a session if something goes sideways.
const MAINTENANCE_ALLOWLIST = new Set<string>([
  "/api/auth/logout",
]);

function shouldBlockForMaintenance(request: NextRequest): boolean {
  if (process.env.MAINTENANCE_MODE !== "true") return false;
  if (!WRITE_METHODS.has(request.method)) return false;

  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) return false;
  if (MAINTENANCE_ALLOWLIST.has(pathname)) return false;

  return true;
}

/**
 * Middleware: maintenance gate + performance monitoring.
 *
 * When MAINTENANCE_MODE=true, returns 503 on POST/PATCH/PUT/DELETE under
 * /api/* (except the allowlist). GET routes pass through normally so the
 * site stays readable from cached data. Pair with the <MaintenanceBar />
 * component, which renders a sitewide banner driven by the same env var.
 */
export function middleware(request: NextRequest) {
  if (shouldBlockForMaintenance(request)) {
    return NextResponse.json(
      {
        error: "maintenance",
        message:
          "shujia is undergoing brief maintenance. Please try again in a few minutes.",
      },
      {
        status: 503,
        headers: { "Retry-After": "300" },
      },
    );
  }

  const start = performance.now();

  const response = NextResponse.next();

  // Add performance header
  const duration = performance.now() - start;
  response.headers.set("X-Response-Time", `${duration.toFixed(0)}ms`);

  // Log slow requests for monitoring
  if (duration > 1000) {
    console.warn(
      `[Performance] Slow request: ${request.method} ${request.nextUrl.pathname} took ${duration.toFixed(0)}ms`
    );
  }

  // Log very slow requests more prominently
  if (duration > 3000) {
    console.error(
      `[Performance] VERY SLOW request: ${request.method} ${request.nextUrl.pathname} took ${duration.toFixed(0)}ms`
    );
  }

  return response;
}

/**
 * Matcher config - run on all routes except:
 * - Static files (_next/static)
 * - Image optimization (_next/image)
 * - Favicon
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
