import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getClientIP } from "@/lib/rateLimit";

interface LogAuditParams {
  action: string;
  adminId?: string;
  username?: string;
  details?: string;
  ipAddress?: string;
}

export async function logAudit({ action, adminId, username, details, ipAddress }: LogAuditParams) {
  try {
    let ip = ipAddress;
    if (!ip) {
      const h = await headers();
      ip = getClientIP(h);
    }

    await prisma.auditLog.create({
      data: {
        action,
        adminId,
        username,
        details,
        ipAddress: ip,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
