"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { isISODate, parseISODate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export type SaveRecordResult = {
  ok: boolean;
  message?: string;
  duplicate?: boolean;
  recordId?: number;
};

const QUANTITY_FIELDS = [
  "breakfastPatients",
  "breakfastStaff",
  "lunchPatients",
  "lunchStaff",
  "dinnerPatients",
  "dinnerStaff",
  "snackQuantity",
] as const;

type QuantityField = (typeof QUANTITY_FIELDS)[number];

/** Devuelve null cuando el campo viene vacío ("no capturado"); 0 es un valor válido. */
function parseQuantity(value: FormDataEntryValue | null): number | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  if (!/^\d+$/.test(raw)) return "invalid";
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return "invalid";
  return parsed;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/captura");
  revalidatePath("/pendientes");
  revalidatePath("/reportes");
}

export async function saveRecord(formData: FormData): Promise<SaveRecordResult> {
  await requireSession();

  const recordId = Number(formData.get("recordId") ?? 0) || null;
  const hospitalId = Number(formData.get("hospitalId") ?? 0);
  const serviceDate = String(formData.get("serviceDate") ?? "").trim();

  if (!hospitalId) return { ok: false, message: "Selecciona un hospital." };
  if (!isISODate(serviceDate)) {
    return { ok: false, message: "Selecciona una fecha de servicio válida." };
  }

  const quantities = {} as Record<QuantityField, number | null>;
  for (const field of QUANTITY_FIELDS) {
    const parsed = parseQuantity(formData.get(field));
    if (parsed === "invalid") {
      return {
        ok: false,
        message: "Las cantidades deben ser números enteros mayores o iguales a cero.",
      };
    }
    quantities[field] = parsed;
  }

  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  if (!hospital) return { ok: false, message: "Hospital no encontrado." };

  const date = parseISODate(serviceDate);
  const existing = await prisma.dailyRecord.findFirst({
    where: { hospitalId, serviceDate: date, active: true },
  });

  if (!recordId && existing) {
    return {
      ok: false,
      duplicate: true,
      recordId: existing.id,
      message: "Ya existe una captura para este hospital y fecha.",
    };
  }
  if (recordId && existing && existing.id !== recordId) {
    return {
      ok: false,
      duplicate: true,
      recordId: existing.id,
      message: "Ya existe una captura para este hospital y fecha.",
    };
  }
  if (!recordId && !hospital.active) {
    return {
      ok: false,
      message: "El hospital está inactivo: no se pueden crear capturas nuevas.",
    };
  }

  try {
    if (recordId) {
      // Al modificar se conserva el precio aplicado original del registro.
      const record = await prisma.dailyRecord.findFirst({
        where: { id: recordId, active: true },
      });
      if (!record) return { ok: false, message: "La captura ya no existe." };

      await prisma.dailyRecord.update({
        where: { id: recordId },
        data: { hospitalId, serviceDate: date, ...quantities },
      });
      revalidateAll();
      return { ok: true, message: "Captura actualizada.", recordId };
    }

    const created = await prisma.dailyRecord.create({
      data: {
        hospitalId,
        serviceDate: date,
        ...quantities,
        appliedPrice: hospital.price,
      },
    });
    revalidateAll();
    return { ok: true, message: "Captura guardada.", recordId: created.id };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return {
        ok: false,
        duplicate: true,
        message: "Ya existe una captura para este hospital y fecha.",
      };
    }
    throw error;
  }
}

export async function deleteRecord(formData: FormData): Promise<SaveRecordResult> {
  await requireSession();

  const recordId = Number(formData.get("recordId") ?? 0);
  const record = await prisma.dailyRecord.findFirst({
    where: { id: recordId, active: true },
  });
  if (!record) return { ok: false, message: "La captura ya no existe." };

  // Eliminación lógica: el registro se conserva en la base de datos.
  await prisma.dailyRecord.update({ where: { id: recordId }, data: { active: false } });
  revalidateAll();
  return { ok: true, message: "Captura eliminada." };
}
