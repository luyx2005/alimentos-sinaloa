"use server";

import { revalidatePath } from "next/cache";

import { hashPassword, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: boolean; message?: string };

function parsePrice(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const price = Number(raw);
  if (!Number.isFinite(price) || price < 0) return null;
  return Math.round(price * 100) / 100;
}

function revalidateAll() {
  revalidatePath("/configuracion");
  revalidatePath("/captura");
  revalidatePath("/reportes");
  revalidatePath("/pendientes");
  revalidatePath("/");
}

export async function saveCompany(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const paymentPeriodType = String(formData.get("paymentPeriodType") ?? "");

  if (!name) return { ok: false, message: "El nombre de la empresa es obligatorio." };
  if (paymentPeriodType !== "weekly" && paymentPeriodType !== "biweekly") {
    return { ok: false, message: "Selecciona una periodicidad válida." };
  }

  if (id) {
    await prisma.company.update({ where: { id }, data: { name, paymentPeriodType } });
  } else {
    await prisma.company.create({ data: { name, paymentPeriodType } });
  }

  revalidateAll();
  return { ok: true, message: id ? "Empresa actualizada." : "Empresa creada." };
}

export async function toggleCompany(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const id = Number(formData.get("id") ?? 0);
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return { ok: false, message: "Empresa no encontrada." };

  await prisma.company.update({ where: { id }, data: { active: !company.active } });
  revalidateAll();
  return {
    ok: true,
    message: company.active ? "Empresa desactivada." : "Empresa activada.",
  };
}

export async function saveHospital(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const id = Number(formData.get("id") ?? 0);
  const companyId = Number(formData.get("companyId") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const price = parsePrice(formData.get("price"));

  if (!companyId) return { ok: false, message: "Selecciona la empresa." };
  if (!name) return { ok: false, message: "El nombre del hospital es obligatorio." };
  if (price === null) {
    return { ok: false, message: "El precio debe ser un número mayor o igual a cero." };
  }

  if (id) {
    await prisma.hospital.update({ where: { id }, data: { companyId, name, price } });
  } else {
    await prisma.hospital.create({ data: { companyId, name, price } });
  }

  revalidateAll();
  return { ok: true, message: id ? "Hospital actualizado." : "Hospital creado." };
}

export async function toggleHospital(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const id = Number(formData.get("id") ?? 0);
  const hospital = await prisma.hospital.findUnique({ where: { id } });
  if (!hospital) return { ok: false, message: "Hospital no encontrado." };

  await prisma.hospital.update({ where: { id }, data: { active: !hospital.active } });
  revalidateAll();
  return {
    ok: true,
    message: hospital.active ? "Hospital desactivado." : "Hospital activado.",
  };
}

export async function saveUser(formData: FormData): Promise<ActionResult> {
  await requireSession();

  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { ok: false, message: "El nombre es obligatorio." };
  if (!username) return { ok: false, message: "El usuario es obligatorio." };
  if (!id && password.length < 6) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (id && password && password.length < 6) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  }

  const duplicate = await prisma.user.findUnique({ where: { username } });
  if (duplicate && duplicate.id !== id) {
    return { ok: false, message: "Ya existe un usuario con ese nombre de usuario." };
  }

  if (id) {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        username,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
  } else {
    await prisma.user.create({
      data: { name, username, passwordHash: await hashPassword(password) },
    });
  }

  revalidatePath("/configuracion");
  return { ok: true, message: id ? "Usuario actualizado." : "Usuario creado." };
}

export async function toggleUser(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const id = Number(formData.get("id") ?? 0);
  if (id === session.id) {
    return { ok: false, message: "No puedes desactivar tu propio usuario." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { ok: false, message: "Usuario no encontrado." };

  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/configuracion");
  return { ok: true, message: user.active ? "Usuario desactivado." : "Usuario activado." };
}
