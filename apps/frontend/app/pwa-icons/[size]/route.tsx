import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime برای سرعت بیشتر در تولید تصویر
export const runtime = "edge";

const BRAND_COLOR = "#f5735c";
const BRAND_COLOR_DARK = "#c94d38";

// آیکون برند Fargo به صورت داینامیک تولید می‌شود
// مثال: GET /pwa-icons/192  →  PNG 192×192
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await context.params;
  const size = Math.min(512, Math.max(16, parseInt(sizeStr, 10) || 192));
  const pad = Math.round(size * 0.16);
  const inner = size - pad * 2;
  const radius = Math.round(size * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(145deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_DARK} 100%)`,
          borderRadius: radius,
        }}
      >
        {/* آیکون کلیپ‌بورد / دایرکتوری */}
        <svg
          width={inner}
          height={inner}
          viewBox="0 0 24 24"
          fill="white"
        >
          <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
