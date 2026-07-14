import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { redirectWithLocale } from "@/i18n/server";
import { safeCallbackPath } from "@/lib/safe-callback-url";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string | string[] }> }) {
  const callbackUrl = safeCallbackPath((await searchParams).callbackUrl);
  const session = await auth();
  if (session?.user && !session.user.invalid) await redirectWithLocale(callbackUrl);
  return <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f5f1] px-4 py-14"><LoginForm callbackUrl={callbackUrl} googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} /></main>;
}
