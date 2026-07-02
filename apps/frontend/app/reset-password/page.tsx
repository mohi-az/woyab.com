import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <main className="flex min-h-[70vh] items-center justify-center bg-[#f8f5f1] px-4 py-14"><ResetPasswordForm token={params.token ?? ""} /></main>;
}
