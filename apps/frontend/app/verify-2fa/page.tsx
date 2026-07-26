import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { TwoFactorVerifyForm } from "@/components/auth/TwoFactorVerifyForm";
import { redirectWithLocale } from "@/i18n/server";
import { safeCallbackPath } from "@/lib/safe-callback-url";
import { CHALLENGE_COOKIE_NAME, verifyChallengeCookie } from "@/app/api/auth/two-factor/challenge/route";

export const metadata: Metadata = {
  title: "Two-Factor Verification",
  robots: { index: false, follow: false },
};

export default async function VerifyTwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);

  // If already authenticated, redirect
  const session = await auth();
  if (session?.user && !session.user.invalid) {
    await redirectWithLocale(callbackUrl);
  }

  // Validate the challenge cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value;

  if (!token || !verifyChallengeCookie(token)) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f5f1] px-4 py-14">
      <TwoFactorVerifyForm callbackUrl={callbackUrl} />
    </main>
  );
}
