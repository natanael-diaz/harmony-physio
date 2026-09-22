import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Prisma client singleton
// Follows Next.js best-practice for preventing too many connections in dev
// (hot-reload creates a new module instance on each reload without this guard).
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export generated types so consumers only need @harmony/db
export * from "@prisma/client";

// Password hashing helpers (task 2.4)
export * from "./auth";
