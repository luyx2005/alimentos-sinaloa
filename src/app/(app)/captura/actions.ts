"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { isISODate, parseISODate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  IMAGE_FIELDS,
  IMAGE_FIELD_LABELS,
  deleteImage,
  storeImage,
  validateImage,
  type ImageField,
} from "@/lib/uploads";

export type SaveRecordResult = {
  ok: boolean;
  message?: string;
  duplicate?: boolean;
  recordId?: number;
};

const QUANTITY_FIELDS = [
  "breakfastPatients",
  "breakfastStaff",
  "breakfastSnack",
  "lunchPatients",
  "lunchStaff",
  "lunchSnack",
  "dinnerPatients",
  "dinnerStaff",
  "dinnerSnack",
] as const;

type QuantityField = (typeof QUANTITY_FIELDS)[number];

function pickedFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

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
  revalidatePath("/no-completados");
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

  const files = {} as Record<ImageField, File | null>;
  for (const field of IMAGE_FIELDS) {
    const file = pickedFile(formData.get(field));
    if (file) {
      const validation = validateImage(file, IMAGE_FIELD_LABELS[field]);
      if (!validation.ok) return { ok: false, message: validation.message };
    }
    files[field] = file;
  }

  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    include: { company: { select: { usesSnack: true } } },
  });
  if (!hospital) return { ok: false, message: "Hospital no encontrado." };

  if (!hospital.company.usesSnack) {
    quantities.breakfastSnack = 0;
    quantities.lunchSnack = 0;
    quantities.dinnerSnack = 0;
  }

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

      // Al corregir una captura la foto ya guardada se conserva; solo se reemplaza si
      // se adjunta otra. Las capturas anteriores a esta función se pueden seguir
      // editando sin foto.
      const images = await storeImages(files, hospitalId, serviceDate);
      await prisma.dailyRecord.update({
        where: { id: recordId },
        data: { hospitalId, serviceDate: date, ...quantities, ...images },
      });
      for (const field of IMAGE_FIELDS) {
        if (images[field]) await deleteImage(record[field]);
      }
      revalidateAll();
      return { ok: true, message: "Captura actualizada.", recordId };
    }

    if (!files.reportImage) return { ok: false, message: FALTA_REPORTE };

    const images = await storeImages(files, hospitalId, serviceDate);
    const created = await prisma.dailyRecord.create({
      data: {
        hospitalId,
        serviceDate: date,
        ...quantities,
        ...images,
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

const FALTA_REPORTE = "Adjunta la foto del reporte diario para guardar la captura.";

async function storeImages(
  files: Record<ImageField, File | null>,
  hospitalId: number,
  serviceDate: string,
): Promise<Partial<Record<ImageField, string>>> {
  const stored: Partial<Record<ImageField, string>> = {};
  for (const field of IMAGE_FIELDS) {
    const file = files[field];
    if (!file) continue;
    stored[field] = await storeImage({ file, hospitalId, serviceDate, field });
  }
  return stored;
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
