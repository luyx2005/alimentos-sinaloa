import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const COMPANIES = [
  {
    name: "Empresa A",
    paymentPeriodType: "weekly" as const,
    hospitals: [
      { name: "Hospital 1", price: 78.5 },
      { name: "Hospital 2", price: 82 },
      { name: "Hospital 3", price: 91.25 },
      { name: "Hospital 4", price: 74 },
    ],
  },
  {
    name: "Empresa B",
    paymentPeriodType: "biweekly" as const,
    hospitals: [
      { name: "Hospital 5", price: 88 },
      { name: "Hospital 6", price: 79.9 },
      { name: "Hospital 7", price: 95 },
      { name: "Hospital 8", price: 84.5 },
      { name: "Hospital 9", price: 90 },
      { name: "Hospital 10", price: 76.75 },
    ],
  },
];

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Cantidades pseudoaleatorias pero deterministas, para una demo estable. */
function pseudo(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10_000;
  const frac = x - Math.floor(x);
  return min + Math.floor(frac * (max - min + 1));
}

async function main() {
  console.log("Sembrando datos iniciales...");

  for (const company of COMPANIES) {
    const found = await prisma.company.findFirst({ where: { name: company.name } });
    const created = found
      ? await prisma.company.update({
          where: { id: found.id },
          data: { paymentPeriodType: company.paymentPeriodType, active: true },
        })
      : await prisma.company.create({
          data: {
            name: company.name,
            paymentPeriodType: company.paymentPeriodType,
            active: true,
          },
        });

    for (const hospital of company.hospitals) {
      const existing = await prisma.hospital.findFirst({
        where: { companyId: created.id, name: hospital.name },
      });
      if (existing) {
        await prisma.hospital.update({
          where: { id: existing.id },
          data: { price: hospital.price, active: true },
        });
      } else {
        await prisma.hospital.create({
          data: {
            companyId: created.id,
            name: hospital.name,
            price: hospital.price,
            active: true,
          },
        });
      }
    }
  }

  const passwordHash = await bcrypt.hash("demo123", 10);
  const existingUser = await prisma.user.findUnique({ where: { username: "demo" } });
  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { passwordHash, active: true, name: "Capturista Demo" },
    });
  } else {
    await prisma.user.create({
      data: {
        name: "Capturista Demo",
        username: "demo",
        passwordHash,
        active: true,
      },
    });
  }

  // Capturas de ejemplo de los últimos 20 días para que los reportes tengan datos.
  const hospitals = await prisma.hospital.findMany({ orderBy: { id: "asc" } });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let createdRecords = 0;
  for (let dayOffset = 20; dayOffset >= 1; dayOffset--) {
    const date = new Date(today.getTime() - dayOffset * 86_400_000);
    const iso = toISODate(date);

    for (const hospital of hospitals) {
      // Se dejan algunos huecos a propósito para poder demostrar los pendientes.
      const skip = pseudo(hospital.id * 31 + dayOffset * 7, 0, 11) === 0;
      if (skip && dayOffset <= 3) continue;

      const existing = await prisma.dailyRecord.findFirst({
        where: { hospitalId: hospital.id, serviceDate: utcDate(iso), active: true },
      });
      if (existing) continue;

      const base = pseudo(hospital.id * 13 + dayOffset, 40, 120);
      await prisma.dailyRecord.create({
        data: {
          hospitalId: hospital.id,
          serviceDate: utcDate(iso),
          breakfastPatients: base,
          breakfastStaff: pseudo(hospital.id + dayOffset * 3, 10, 45),
          lunchPatients: base + pseudo(hospital.id * 5 + dayOffset, 0, 15),
          lunchStaff: pseudo(hospital.id * 2 + dayOffset * 5, 12, 50),
          dinnerPatients: base - pseudo(hospital.id + dayOffset * 2, 0, 12),
          dinnerStaff: pseudo(hospital.id * 7 + dayOffset, 8, 38),
          snackQuantity: pseudo(hospital.id * 3 + dayOffset * 11, 5, 40),
          appliedPrice: hospital.price,
          active: true,
        },
      });
      createdRecords++;
    }
  }

  console.log(
    `Listo: ${COMPANIES.length} empresas, ${hospitals.length} hospitales, ${createdRecords} capturas de ejemplo.`,
  );
  console.log("Usuario demo: demo / demo123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
