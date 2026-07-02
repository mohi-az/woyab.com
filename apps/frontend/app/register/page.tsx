import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user && !session.user.invalid) redirect("/dashboard");
  return <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f5f1] px-4 py-14"><RegisterForm googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} /></main>;
}
