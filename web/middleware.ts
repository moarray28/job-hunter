import { NextRequest, NextResponse } from "next/server";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isValidBasicAuth(header: string, username: string, password: string): boolean {
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    if (sep < 0) return false;
    return safeEqual(decoded.slice(0, sep), username) && safeEqual(decoded.slice(sep + 1), password);
  } catch {
    return false;
  }
}

/**
 * Single-user protection. When APP_PASSWORD is set, every page and API route
 * requires HTTP Basic auth. External cron may call /api/scrape/run-all with
 * `Authorization: Bearer $CRON_SECRET` instead.
 */
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";

  if (cronSecret && req.nextUrl.pathname === "/api/scrape/run-all" && safeEqual(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.next();
  }
  if (!password || isValidBasicAuth(auth, process.env.APP_USERNAME || "me", password)) {
    return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Job Hunter", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
