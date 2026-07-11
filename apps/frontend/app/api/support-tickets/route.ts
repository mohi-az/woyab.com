import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
});

export async function POST(request: NextRequest) {
  const parsed = ticketSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please check the ticket fields." }, { status: 400 });

  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, _count: { select: { businesses: true } } } });
  if (!user || (user.role === "USER" && user._count.businesses === 0)) {
    return NextResponse.json({ success: false, error: "Support tickets are available to business owners." }, { status: 403 });
  }
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: "NORMAL",
    },
  });

  return NextResponse.json({ success: true, data: { id: ticket.id } }, { status: 201 });
}
