import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  }).$extends({
    query: {
      $allOperations({ operation, model, args, query }) {
        const start = performance.now();
        const result = query(args);
        
        // Log slow queries for monitoring
        result.then(() => {
          const duration = performance.now() - start;
          if (duration > 1000) {
            console.warn(`[Prisma] Slow query: ${model}.${operation} took ${duration.toFixed(0)}ms`);
          }
        }).catch(() => {
          // Query failed, duration logging not needed
        });
        
        return result;
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
