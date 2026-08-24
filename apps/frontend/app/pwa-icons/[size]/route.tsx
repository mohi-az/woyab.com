/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime برای سرعت بیشتر در تولید تصویر
export const runtime = "edge";

// آیکون برند WoYab به صورت داینامیک تولید می‌شود
// مثال: GET /pwa-icons/192  →  PNG 192×192
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await context.params;
  const size = Math.min(512, Math.max(16, parseInt(sizeStr, 10) || 192));
  const inner = Math.round(size * 0.82);
  const markUrl = new URL("/brand/woyab-mark.png", req.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <img
          src={markUrl}
          alt=""
          width={inner}
          height={inner}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
