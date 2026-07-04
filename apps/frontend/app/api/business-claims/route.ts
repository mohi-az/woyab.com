import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const claimSchema = z.object({
  businessId: z.string().min(1),
  claimantName: z.string().trim().min(2).max(120),
  claimantEmail: z.email(),
  claimantPhone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = claimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please check the claim fields." }, { status: 400 });

  const business = await prisma.business.findUnique({ where: { id: parsed.data.businessId }, select: { id: true } });
  if (!business) return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });

  const claimantUserId = await currentUserId();
  const claim = await prisma.businessClaim.create({
    data: {
      businessId: parsed.data.businessId,
      claimantUserId,
      claimantName: parsed.data.claimantName,
      claimantEmail: parsed.data.claimantEmail,
      claimantPhone: parsed.data.claimantPhone,
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ success: true, data: { id: claim.id } }, { status: 201 });
}
