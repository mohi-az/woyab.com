import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAttributeDefinition } from "@/lib/admin-actions";
import { authorizeAiAdminRequest } from "@/lib/ai/admin-auth";

export const runtime = "nodejs";

const quickAttributeSchema = z.object({
  labelFa: z.string().trim().max(120).default(""),
  labelEn: z.string().trim().max(120).default(""),
  labelDe: z.string().trim().max(120).default(""),
  dataType: z.enum(["BOOLEAN", "TEXT", "NUMBER"]).default("BOOLEAN"),
}).refine((value) => Boolean(value.labelFa || value.labelEn || value.labelDe), {
  message: "Enter at least one feature name.",
});

export async function POST(request: Request) {
  const authorization = await authorizeAiAdminRequest();
  if (!authorization.ok) return NextResponse.json({ error: authorization.message }, { status: authorization.status });

  const parsed = quickAttributeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid feature." }, { status: 400 });
  }

  const fallbackLabel = parsed.data.labelEn || parsed.data.labelDe || parsed.data.labelFa;
  const formData = new FormData();
  formData.set("key", `feature_${randomUUID().replaceAll("-", "")}`);
  formData.set("labelFa", parsed.data.labelFa || fallbackLabel);
  formData.set("labelEn", parsed.data.labelEn || fallbackLabel);
  formData.set("labelDe", parsed.data.labelDe || fallbackLabel);
  formData.set("dataType", parsed.data.dataType);
  formData.set("sortOrder", "0");
  formData.set("active", "true");

  try {
    const attribute = await createAttributeDefinition(formData);
    return NextResponse.json({ attribute }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The feature could not be created." },
      { status: 400 },
    );
  }
}
