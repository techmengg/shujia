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
 * Middleware: maintenance gate.
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
  return NextResponse.next();
}

/**
 * Only the API: the gate above never applies anywhere else, and running
 * middleware on every page view (mostly crawlers on manga pages) is billed
 * CPU for nothing.
 */
export const config = {
  matcher: ["/api/:path*"],
};
