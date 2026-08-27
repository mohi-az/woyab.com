import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth-user";
import { isAppLocale } from "@/i18n/config";
import { mailConfigured, privacyEmail, sendMail, supportEmail } from "@/lib/mail";
import {
  buildPublicContactNotification,
  buildPublicContactReceipt,
  publicContactSubjects,
  type PublicContactSubject,
} from "@/lib/public-contact";
import { prisma } from "@/lib/prisma";
import { isPersistentlyRateLimited } from "@/lib/persistent-rate-limit";
import { requestIp } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().pipe(z.email()).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.enum(publicContactSubjects),
  message: z.string().trim().min(10).max(4000),
  privacyAcknowledged: z.literal(true),
  website: z.string().max(0).optional(),
});

function result(error: PromiseSettledResult<unknown>) {
  return error.status === "fulfilled"
    ? { status: "SENT" as const, error: null }
    : { status: "FAILED" as const, error: error.reason instanceof Error ? error.reason.message : "Email request failed." };
}

export async function POST(request: NextRequest) {
  try {
    return await handleContactRequest(request);
  } catch (error) {
    console.error("Public contact request failed:", error);
    return NextResponse.json({ success: false, code: "CONTACT_FAILED" }, { status: 500 });
  }
}

async function handleContactRequest(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ success: false, code: "INVALID_FIELDS" }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ success: true, accepted: true }, { status: 202 });

  if (await isPersistentlyRateLimited("public-contact", requestIp(request), 5, 60 * 60_000)) {
    return NextResponse.json({ success: false, code: "RATE_LIMITED" }, { status: 429 });
  }

  const localeHeader = request.headers.get("x-woyab-locale");
  const locale = isAppLocale(localeHeader) ? localeHeader : "en";
  const userId = await currentUserId();
  const message = await prisma.publicContactMessage.create({
    data: {
      userId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject,
      message: parsed.data.message,
    },
    select: { id: true },
  });

  if (!mailConfigured()) {
    await prisma.publicContactMessage.update({
      where: { id: message.id },
      data: { notificationStatus: "NOT_CONFIGURED", acknowledgementStatus: "NOT_CONFIGURED" },
    });
    return NextResponse.json({ success: true, accepted: true }, { status: 201 });
  }

  const recipient = parsed.data.subject === "PRIVACY" ? privacyEmail() : supportEmail();
  const notification = buildPublicContactNotification({ ...parsed.data, locale });
  const receipt = buildPublicContactReceipt({ name: parsed.data.name, subject: parsed.data.subject as PublicContactSubject, locale });
  const [notificationResult, acknowledgementResult] = await Promise.allSettled([
    sendMail({
      to: recipient,
      ...notification,
      replyTo: parsed.data.email,
      idempotencyKey: `public-contact/${message.id}/notification`,
    }),
    sendMail({
      to: parsed.data.email,
      ...receipt,
      from: "support",
      replyTo: recipient,
      idempotencyKey: `public-contact/${message.id}/receipt`,
    }),
  ]);
  const notificationDelivery = result(notificationResult);
  const acknowledgementDelivery = result(acknowledgementResult);
  await prisma.publicContactMessage.update({
    where: { id: message.id },
    data: {
      notificationStatus: notificationDelivery.status,
      notificationError: notificationDelivery.error,
      acknowledgementStatus: acknowledgementDelivery.status,
      acknowledgementError: acknowledgementDelivery.error,
    },
  });

  return NextResponse.json({ success: true, accepted: true }, { status: 201 });
}
