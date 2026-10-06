import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL.");
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
 * Proxy perezoso: Next.js importa este módulo al recolectar páginas en el build.
 * Instanciar Prisma en ese momento exige DATABASE_URL y tumba el deploy en Vercel
 * si la variable aún no está (o si la ruta no va a consultar la base).
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
