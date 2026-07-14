import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const contactPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(4000),
});

type RouteContext = { params: Promise<{ businessId: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

async function deliverWithResend(to: string, subject: string, html: string, replyTo: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BUSINESS_CONTACT_FROM_EMAIL;
  if (!apiKey || !from) return { status: "NOT_CONFIGURED" as const, error: "Resend is not configured." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo }),
    });
    if (response.ok) return { status: "SENT" as const, error: null };
    return { status: "FAILED" as const, error: `Resend returned HTTP ${response.status}.` };
  } catch (error) {
    return { status: "FAILED" as const, error: error instanceof Error ? error.message : "Email request failed." };
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  try {
    const payload = contactPayloadSchema.parse(await request.json());
    const business = await prisma.business.findFirst({
      where: { id: businessId, removedAt: null },
      select: { id: true, businessName: true, email: true, ownerId: true },
    });
    if (!business) return NextResponse.json({ success: false, error: "Business not found." }, { status: 404 });
    if (!business.ownerId) {
      return NextResponse.json({
        success: false,
        code: "BUSINESS_CONTACT_UNAVAILABLE",
        error: "Direct messaging is not available for this business yet.",
      }, { status: 409 });
    }

    const stored = await prisma.contactMessage.create({
      data: {
        businessId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        message: payload.message,
        emailStatus: "PENDING",
      },
      select: { id: true },
    });

    let delivery: { status: "SENT" | "FAILED" | "NOT_CONFIGURED"; error: string | null };
    if (!business.email) {
      delivery = { status: "NOT_CONFIGURED", error: "The business has no public email address." };
    } else {
      const safe = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, escapeHtml(value || "-")])) as Record<string, string>;
      const html = `<h2>New contact message</h2><p><strong>Business:</strong> ${escapeHtml(business.businessName)}</p><p><strong>Name:</strong> ${safe.name}</p><p><strong>Email:</strong> ${safe.email}</p><p><strong>Phone:</strong> ${safe.phone}</p><p><strong>Message:</strong></p><p>${safe.message.replace(/\n/g, "<br />")}</p>`;
      delivery = await deliverWithResend(business.email, `New Fargo contact message for ${business.businessName}`, html, payload.email);
    }

    await prisma.contactMessage.update({
      where: { id: stored.id },
      data: { emailStatus: delivery.status, emailError: delivery.error, deliveryMode: delivery.status === "SENT" ? "resend" : null },
    });
    return NextResponse.json({ success: true, messageId: stored.id, status: "STORED" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: error.issues[0]?.message ?? "Invalid contact request." }, { status: 400 });
    return NextResponse.json({ success: false, error: "Unable to store message right now." }, { status: 500 });
  }
}
