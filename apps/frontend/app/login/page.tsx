import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { redirectWithLocale } from "@/i18n/server";
import { safeCallbackPath } from "@/lib/safe-callback-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[]; verification?: string; error?: string | string[] }> }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);
  const authError = Array.isArray(params.error) ? params.error[0] : params.error;
  const session = await auth();
  if (session?.user && !session.user.invalid) await redirectWithLocale(callbackUrl);
  return <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f5f1] px-4 py-14"><LoginForm callbackUrl={callbackUrl} verification={params.verification} authError={authError} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} /></main>;
}
