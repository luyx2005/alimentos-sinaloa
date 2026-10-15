import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/** Next.js 16 marca esta fase mientras recopila rutas en `next build`. */
function isProductionBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-export"
  );
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta la variable de entorno DATABASE_URL. En Vercel: Settings → Environment Variables → DATABASE_URL (Production y Preview), luego Redeploy.",
    );
  }

  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      // Vercel abre una función por petición: un pool pequeño evita saturar Postgres.
      max: 1,
    });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Prisma Client es “thenable” (`prisma.then`). Next, al recolectar páginas,
 * toca esa propiedad y el Proxy anterior abría la conexión en el build.
 * Sin DATABASE_URL eso tumba Vercel. Durante el build no se instancia nada.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (prop === "then" || prop === "catch" || prop === "finally") {
      return undefined;
    }
    // En el build nunca se abre Postgres: Next toca el export al recolectar
    // rutas aunque la página sea force-dynamic. La app real corre en runtime.
    if (isProductionBuildPhase()) {
      return undefined;
    }
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
