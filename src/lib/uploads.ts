import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Campos de la captura que aceptan una foto. */
export const IMAGE_FIELDS = [
  "breakfastImage",
  "lunchImage",
  "dinnerImage",
  "reportImage",
] as const;

export type ImageField = (typeof IMAGE_FIELDS)[number];

export const IMAGE_FIELD_LABELS: Record<ImageField, string> = {
  breakfastImage: "Desayuno",
  lunchImage: "Comida",
  dinnerImage: "Cena",
  reportImage: "Reporte diario",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS);

const DEFAULT_UPLOADS_DIR = path.join(process.cwd(), "uploads");

export function uploadsRoot(): string {
  return process.env.UPLOADS_DIR || DEFAULT_UPLOADS_DIR;
}

export function isImageField(value: string): value is ImageField {
  return (IMAGE_FIELDS as readonly string[]).includes(value);
}

export type ImageValidation = { ok: true } | { ok: false; message: string };

export function validateImage(file: File, label: string): ImageValidation {
  if (!EXTENSIONS[file.type]) {
    return {
      ok: false,
      message: `La foto de ${label} debe ser JPG, PNG, WEBP o HEIC.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `La foto de ${label} pesa más de 8 MB. Usa una imagen más ligera.`,
    };
  }
  return { ok: true };
}

/** Guarda la imagen y devuelve su ruta relativa dentro de la carpeta de subidas. */
export async function storeImage(options: {
  file: File;
  hospitalId: number;
  serviceDate: string;
  field: ImageField;
}): Promise<string> {
  const extension = EXTENSIONS[options.file.type] ?? "jpg";
  const relativeDir = path.join(String(options.hospitalId), options.serviceDate);
  const fileName = `${options.field}-${randomUUID()}.${extension}`;

  const absoluteDir = path.join(process.cwd(), "uploads", relativeDir);
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(
    path.join(absoluteDir, fileName),
    Buffer.from(await options.file.arrayBuffer()),
  );

  return path.join(relativeDir, fileName);
}

/** Evita que una ruta guardada apunte fuera de la carpeta de subidas. */
export function resolveImagePath(relativePath: string): string | null {
  const root = path.resolve(process.cwd(), "uploads");
  const absolute = path.resolve(process.cwd(), "uploads", relativePath);
  return absolute.startsWith(root) ? absolute : null;
}

export async function readImage(
  relativePath: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const absolute = resolveImagePath(relativePath);
  if (!absolute) return null;

  try {
    const body = await readFile(absolute);
    const extension = path.extname(absolute).slice(1).toLowerCase();
    const contentType =
      Object.entries(EXTENSIONS).find(([, ext]) => ext === extension)?.[0] ??
      "application/octet-stream";
    return { body, contentType };
  } catch {
    return null;
  }
}

export async function deleteImage(relativePath: string | null): Promise<void> {
  if (!relativePath) return;
  const absolute = resolveImagePath(relativePath);
  if (!absolute) return;
  try {
    await unlink(absolute);
  } catch {
    // Si el archivo ya no está, la captura igual queda consistente.
  }
}
