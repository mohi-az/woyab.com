import { NextResponse } from "next/server";
import { processPendingReviewTranslations } from "@/lib/review-translations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingReviewTranslations(20);
  return NextResponse.json({ success: true, data: result });
}
