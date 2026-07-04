import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = ticketSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please check the ticket fields." }, { status: 400 });

  const userId = await currentUserId();
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: parsed.data.priority ?? "NORMAL",
    },
  });

  return NextResponse.json({ success: true, data: { id: ticket.id } }, { status: 201 });
}
