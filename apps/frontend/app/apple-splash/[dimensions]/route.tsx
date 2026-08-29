/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

const markData = readFile(
  join(process.cwd(), "public", "brand", "woyab-mark.png"),
).then((data) => Uint8Array.from(data).buffer);

export async function GET(
  _request: Request,
  context: { params: Promise<{ dimensions: string }> },
) {
  const { dimensions } = await context.params;
  const match = /^(\d{2,4})x(\d{2,4})$/.exec(dimensions);

  if (!match) {
    return new Response("Invalid splash dimensions", { status: 400 });
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (width > 3000 || height > 3000) {
    return new Response("Splash dimensions are too large", { status: 400 });
  }

  const mark = await markData;
  const markSize = Math.round(Math.min(width, height) * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* ImageResponse accepts ArrayBuffer sources for local images. */}
        <img
          src={mark as unknown as string}
          alt=""
          width={markSize}
          height={markSize}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      width,
      height,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
