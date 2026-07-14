import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { redirectWithLocale } from "@/i18n/server";
import { safeCallbackPath } from "@/lib/safe-callback-url";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[] }> }) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);
  const session = await auth();
  if (session?.user && !session.user.invalid) await redirectWithLocale(callbackUrl);
  return <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f5f1] px-4 py-14"><RegisterForm callbackUrl={callbackUrl} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} /></main>;
}
