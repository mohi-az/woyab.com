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

const bypassPrefixes = ["/api", "/_next", "/pwa-icons", "/monitoring"];
const privatePrefixes = ["/admin", "/dashboard", "/business-portal"];

function shouldBypass(pathname: string) {
  return bypassPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    || pathname === "/sw.js"
    || pathname === "/manifest.webmanifest"
    || /\.[^/]+$/.test(pathname);
}

function isPrivatePath(pathname: string) {
  const normalized = stripLocalePrefix(pathname);
  return privatePrefixes.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function preventPrivateCaching(response: NextResponse, pathname: string) {
  if (!isPrivatePath(pathname)) return response;
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
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
    return preventPrivateCaching(response, pathname);
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

  return preventPrivateCaching(response, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
