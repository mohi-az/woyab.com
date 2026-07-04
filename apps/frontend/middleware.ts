import { type NextRequest, NextResponse } from "next/server";
import {
  defaultLocale,
  isAppLocale,
  localeCookieMaxAge,
  localeCookieName,
  localeHeaderName,
  localizePathname,
  stripLocalePrefix,
} from "@/i18n/config";

const bypassPrefixes = ["/api", "/_next", "/pwa-icons"];

function shouldBypass(pathname: string) {
  return bypassPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    || pathname === "/sw.js"
    || pathname === "/manifest.webmanifest"
    || /\.[^/]+$/.test(pathname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const [, firstSegment] = pathname.split("/");

  if (!isAppLocale(firstSegment)) {
    const preferredLocale = request.cookies.get(localeCookieName)?.value;
    const locale = isAppLocale(preferredLocale) ? preferredLocale : defaultLocale;
    const response = NextResponse.redirect(new URL(localizePathname(`${pathname}${request.nextUrl.search}`, locale), request.url));
    response.cookies.set(localeCookieName, locale, {
      maxAge: localeCookieMaxAge,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  const rewrittenUrl = request.nextUrl.clone();
  rewrittenUrl.pathname = stripLocalePrefix(pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(localeHeaderName, firstSegment);

  const response = NextResponse.rewrite(rewrittenUrl, {
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set(localeCookieName, firstSegment, {
    maxAge: localeCookieMaxAge,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
