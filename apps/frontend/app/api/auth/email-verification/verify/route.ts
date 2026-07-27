import { NextResponse, type NextRequest } from "next/server";
import { consumeAccountVerification } from "@/lib/email-verification";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { requestIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  const loginUrl = new URL("/login", request.url);
  if (callbackUrl) {
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
  }
  
  if (
    token.length < 32
    || await isPersistentlyRateLimited("verify-email-ip", requestIp(request), 30, 15 * 60_000)
  ) {
    loginUrl.searchParams.set("verification", "invalid");
    return NextResponse.redirect(loginUrl);
  }

  const verified = await consumeAccountVerification(token);
  loginUrl.searchParams.set("verification", verified ? "success" : "invalid");
  return NextResponse.redirect(loginUrl);
}
