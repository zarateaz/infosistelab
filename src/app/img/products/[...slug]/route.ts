import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (!slug || slug.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const filename = path.basename(slug.join("/"));
  if (!filename || filename.includes("..")) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  const candidateDirs = [
    process.env.PRODUCT_IMAGES_DIR,
    "/home/zarate/infosistel-v2-data/uploads/products",
    "/home/zarate/infosistel-v2/public/img/products",
    path.resolve(process.cwd(), "..", "infosistel-v2-data", "uploads", "products"),
    path.join(process.cwd(), "public", "img", "products"),
    path.join(process.cwd(), ".next", "standalone", "public", "img", "products"),
  ].filter((d): d is string => typeof d === "string" && d.length > 0);

  for (const dir of candidateDirs) {
    try {
      const fullPath = path.join(dir, filename);
      const st = await stat(fullPath);
      if (st.isFile()) {
        const buffer = await readFile(fullPath);
        const ext = path.extname(filename).toLowerCase();
        let contentType = "image/webp";
        if (ext === ".png") contentType = "image/png";
        else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
        else if (ext === ".svg") contentType = "image/svg+xml";

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } catch {
      // Try next candidate directory
    }
  }

  return new NextResponse("Image not found", { status: 404 });
}
