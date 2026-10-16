/** Límite por foto tras comprimir: Vercel corta el body de la función ~4.5 MB. */
export const COMPRESSED_IMAGE_MAX_BYTES = 900_000;
const MAX_EDGE = 1600;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function isAcceptedImageFile(file: File): boolean {
  if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") {
    return true;
  }
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  return [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(extensionOf(file.name));
}

/**
 * Reduce la foto a JPEG para que el iPad/Vercel no revienten por tamaño.
 * Si el navegador no puede decodificar (p. ej. HEIC en Chrome), se devuelve el original.
 */
export async function compressImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.72;
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    blob = await new Promise((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/jpeg", quality);
    });
    if (!blob) break;
    if (blob.size <= COMPRESSED_IMAGE_MAX_BYTES) break;
    quality -= 0.12;
  }

  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
