import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth-user";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Full-screen layout for add/edit business – no portal sidebar */
export default async function BusinessPortalFullLayout({ children }: { children: React.ReactNode }) {
  const userId = await currentUserId();
  if (!userId) {
    redirect("/login?callbackUrl=/business-portal");
  }
  return (
    <div className="min-h-screen bg-[#f8f5f1]">
      {children}
    </div>
  );
}
