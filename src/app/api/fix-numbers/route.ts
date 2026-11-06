import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Also try to alter the Sale table to add the origin column if it's missing (for SQLite in production)
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'FISICA'`);
    } catch (e) {
      // Ignore error if column already exists
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "asc" },
    });

    let counter = 1;
    let updated = 0;

    for (const p of products) {
      if (!p.itemNumber || p.itemNumber === 0 || p.itemNumber !== counter) {
        await prisma.product.update({
          where: { id: p.id },
          data: { itemNumber: counter },
        });
        updated++;
      }
      counter++;
    }

    return NextResponse.json({
      success: true,
      message: `¡Listo! Se actualizaron ${updated} productos asignándoles su número correspondiente.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
