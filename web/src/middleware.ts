import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Performance monitoring middleware
 * Logs slow requests and adds response time headers
 */
export function middleware(request: NextRequest) {
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

