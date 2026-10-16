/** Fotos guardadas en la propia columna de Prisma (Vercel no tiene disco persistente). */
export const INLINE_IMAGE_PREFIX = "data:image/";

export function isInlineImage(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(INLINE_IMAGE_PREFIX));
}

export function encodeInlineImage(bytes: Uint8Array, mimeType: string): string {
  const mime = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

export function decodeInlineImage(
  value: string,
): { body: Buffer; contentType: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(
    value,
  );
  if (!match) return null;
  return { body: Buffer.from(match[2], "base64"), contentType: match[1] };
}
