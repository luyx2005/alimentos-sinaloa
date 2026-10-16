import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  decodeInlineImage,
  encodeInlineImage,
  isInlineImage,
} from "@/lib/inline-image";

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
  "image/heif": "heic",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS);

const DEFAULT_UPLOADS_DIR = path.join(process.cwd(), "uploads");

export function uploadsRoot(): string {
  return process.env.UPLOADS_DIR || DEFAULT_UPLOADS_DIR;
}

function usesInlineStorage(): boolean {
  return Boolean(process.env.VERCEL);
}

export function isImageField(value: string): value is ImageField {
  return (IMAGE_FIELDS as readonly string[]).includes(value);
}

export type ImageValidation = { ok: true } | { ok: false; message: string };

export function validateImage(file: File, label: string): ImageValidation {
  const type = file.type || guessMimeFromName(file.name);
  if (!EXTENSIONS[type] && type !== "application/octet-stream") {
    if (!guessMimeFromName(file.name)) {
      return {
        ok: false,
        message: `La foto de ${label} debe ser JPG, PNG, WEBP o HEIC.`,
      };
    }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      message: `La foto de ${label} pesa más de 8 MB. Usa una imagen más ligera.`,
    };
  }
  return { ok: true };
}

function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

async function storeInline(file: File): Promise<string> {
  const mime = file.type && EXTENSIONS[file.type] ? file.type : "image/jpeg";
  return encodeInlineImage(new Uint8Array(await file.arrayBuffer()), mime);
}

/** Guarda la imagen y devuelve su ruta relativa, o un data URL en Vercel. */
export async function storeImage(options: {
  file: File;
  hospitalId: number;
  serviceDate: string;
  field: ImageField;
}): Promise<string> {
  if (usesInlineStorage()) {
    return storeInline(options.file);
  }

  const mime = options.file.type && EXTENSIONS[options.file.type]
    ? options.file.type
    : guessMimeFromName(options.file.name) || "image/jpeg";
  const extension = EXTENSIONS[mime] ?? "jpg";
  const relativeDir = path.join(String(options.hospitalId), options.serviceDate);
  const fileName = `${options.field}-${randomUUID()}.${extension}`;

  try {
    const absoluteDir = path.join(process.cwd(), "uploads", relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    await writeFile(
      path.join(absoluteDir, fileName),
      Buffer.from(await options.file.arrayBuffer()),
    );
    return path.join(relativeDir, fileName);
  } catch {
    // Disco de solo lectura (serverless): se guarda en la misma fila de Postgres.
    return storeInline(options.file);
  }
}

/** Evita que una ruta guardada apunte fuera de la carpeta de subidas. */
export function resolveImagePath(relativePath: string): string | null {
  if (isInlineImage(relativePath)) return null;
  const root = path.resolve(process.cwd(), "uploads");
  const absolute = path.resolve(process.cwd(), "uploads", relativePath);
  return absolute.startsWith(root) ? absolute : null;
}

export async function readImage(
  relativePath: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const inline = decodeInlineImage(relativePath);
  if (inline) return inline;

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
  if (!relativePath || isInlineImage(relativePath)) return;
  const absolute = resolveImagePath(relativePath);
  if (!absolute) return;
  try {
    await unlink(absolute);
  } catch {
    // Si el archivo ya no está, la captura igual queda consistente.
  }
}
