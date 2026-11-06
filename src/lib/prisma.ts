import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { env } from "@/lib/env";

// Prisma 7 has no bundled query engine — every provider needs an explicit
// driver adapter. This is the file every future model/query goes through.
function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Next.js dev server hot-reloads modules on every save, which would create a
// fresh PrismaClient (and a fresh SQLite connection) each time without this
// cache — same pattern as the previous Infosistel project.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
