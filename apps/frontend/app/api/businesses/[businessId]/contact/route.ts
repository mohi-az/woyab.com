import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.API_URL ?? "http://localhost:4000";

const contactPayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(4000),
});

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

type BusinessLookupResponse = {
  success: boolean;
  data?: {
    id: string;
    businessName: string;
    email?: string | null;
  };
};

async function fetchBusinessContactTarget(businessId: string) {
  const response = await fetch(`${API_BASE}/v1/businesses/${businessId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as BusinessLookupResponse;
  return json.data ?? null;
}

async function deliverWithResend({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BUSINESS_CONTACT_FROM_EMAIL;

  if (!apiKey || !from) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  return response.ok;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;

  try {
    const payload = contactPayloadSchema.parse(await request.json());
    const business = await fetchBusinessContactTarget(businessId);

    if (!business?.email) {
      return NextResponse.json(
        { success: false, error: "Business email is not available." },
        { status: 400 },
      );
    }

    const subject = `New Fargo contact message for ${business.businessName}`;
    const html = `
      <h2>New contact message</h2>
      <p><strong>Business:</strong> ${business.businessName}</p>
      <p><strong>Name:</strong> ${payload.name}</p>
      <p><strong>Email:</strong> ${payload.email}</p>
      <p><strong>Phone:</strong> ${payload.phone || "-"}</p>
      <p><strong>Message:</strong></p>
      <p>${payload.message.replace(/\n/g, "<br />")}</p>
    `;

    const sent = await deliverWithResend({
      to: business.email,
      subject,
      html,
      replyTo: payload.email,
    });

    if (!sent) {
      console.info("[business-contact:mock]", {
        businessId,
        target: business.email,
        payload,
      });
    }

    return NextResponse.json({
      success: true,
      deliveryMode: sent ? "resend" : "mock",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message ?? "Invalid contact request.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Unable to send message right now." },
      { status: 500 },
    );
  }
}
