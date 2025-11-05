const { APP_BASE_URL, CSRF_ALLOWED_ORIGINS } = process.env;

function buildAllowedOrigins(request: Request) {
  const origins = new Set<string>();

  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // Ignore malformed request URL – unlikely in Next.js.
  }

  if (APP_BASE_URL) {
    try {
      origins.add(new URL(APP_BASE_URL).origin);
    } catch {
      // Ignore invalid APP_BASE_URL configuration.
    }
  }

  if (CSRF_ALLOWED_ORIGINS) {
    for (const origin of CSRF_ALLOWED_ORIGINS.split(",").map((value) => value.trim())) {
      if (!origin) continue;
      try {
        origins.add(new URL(origin).origin);
      } catch {
        // Ignore malformed entries.
      }
    }
  }

  return origins;
}

export function isSafeRequestOrigin(request: Request) {
  const allowedOrigins = buildAllowedOrigins(request);

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      const origin = new URL(originHeader).origin;
      if (!allowedOrigins.has(origin)) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  }

  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      const refererOrigin = new URL(refererHeader).origin;
      if (!allowedOrigins.has(refererOrigin)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
