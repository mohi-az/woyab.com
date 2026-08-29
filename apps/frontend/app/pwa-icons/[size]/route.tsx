/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Keep the source image local. Building its URL from the incoming request can
// resolve to Railway's internal origin (for example https://localhost:8080).
export const runtime = "nodejs";

const markData = readFile(
  join(process.cwd(), "public", "brand", "woyab-mark.png"),
).then((data) => Uint8Array.from(data).buffer);

// آیکون برند WoYab به صورت داینامیک تولید می‌شود
// مثال: GET /pwa-icons/192  →  PNG 192×192
export async function GET(
  request: Request,
  context: { params: Promise<{ size: string }> },
) {
  const { size: sizeStr } = await context.params;
  const size = Math.min(512, Math.max(16, parseInt(sizeStr, 10) || 192));
  const isMaskable = new URL(request.url).searchParams.get("purpose") === "maskable";
  // Keep the mark inside Android's maskable safe zone. The white canvas blends
  // into the manifest splash background so only the brand mark is visible.
  const inner = Math.round(size * (isMaskable ? 0.68 : 0.82));
  const mark = await markData;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isMaskable ? "#ffffff" : "transparent",
        }}
      >
        {/* ImageResponse supports ArrayBuffer sources for local images, while
            the DOM img typings only accept string URLs. */}
        <img
          src={mark as unknown as string}
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
