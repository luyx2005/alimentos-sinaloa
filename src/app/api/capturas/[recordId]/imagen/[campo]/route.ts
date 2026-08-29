import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isImageField, readImage } from "@/lib/uploads";

/** Las fotos de la captura no son públicas: se sirven solo con sesión iniciada. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordId: string; campo: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });

  const { recordId, campo } = await params;
  if (!isImageField(campo)) return new NextResponse("No encontrada", { status: 404 });

  const record = await prisma.dailyRecord.findUnique({
    where: { id: Number(recordId) || 0 },
  });
  const relativePath = record?.[campo];
  if (!relativePath) return new NextResponse("No encontrada", { status: 404 });

  const image = await readImage(relativePath);
  if (!image) return new NextResponse("No encontrada", { status: 404 });

  return new NextResponse(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
