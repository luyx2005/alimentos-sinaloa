"use server";

import { revalidatePath } from "next/cache";

import { hashPassword, requireSession } from "@/lib/auth";
import { isMexicanState } from "@/lib/mexican-states";
import { prisma } from "@/lib/prisma";

export type ActionResult = { ok: boolean; message?: string };

const SOLO_ADMIN = "Solo los administradores pueden editar o eliminar la configuración.";

/** Editar, activar/desactivar y eliminar están reservados a administradores. */
async function denyIfNotAdmin(): Promise<ActionResult | null> {
  const session = await requireSession();
  return session.role === "admin" ? null : { ok: false, message: SOLO_ADMIN };
}

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
  const session = await requireSession();

  const id = Number(formData.get("id") ?? 0);
  if (id && session.role !== "admin") return { ok: false, message: SOLO_ADMIN };

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
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

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

export async function deleteCompany(formData: FormData): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const id = Number(formData.get("id") ?? 0);
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return { ok: false, message: "Empresa no encontrada." };

  const hospitals = await prisma.hospital.count({ where: { companyId: id } });
  if (hospitals > 0) {
    return {
      ok: false,
      message: `No se puede eliminar: la empresa tiene ${hospitals} ${
        hospitals === 1 ? "hospital" : "hospitales"
      }. Elimínalos primero o desactiva la empresa.`,
    };
  }

  await prisma.company.delete({ where: { id } });
  revalidateAll();
  return { ok: true, message: "Empresa eliminada." };
}

export async function saveHospital(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const id = Number(formData.get("id") ?? 0);
  if (id && session.role !== "admin") return { ok: false, message: SOLO_ADMIN };

  const companyId = Number(formData.get("companyId") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const price = parsePrice(formData.get("price"));

  if (!companyId) return { ok: false, message: "Selecciona la empresa." };
  if (!name) return { ok: false, message: "El nombre del hospital es obligatorio." };
  if (!isMexicanState(state)) {
    return { ok: false, message: "Selecciona un estado de la República Mexicana." };
  }
  if (price === null) {
    return { ok: false, message: "El precio debe ser un número mayor o igual a cero." };
  }

  if (id) {
    await prisma.hospital.update({
      where: { id },
      data: { companyId, name, state, price },
    });
  } else {
    await prisma.hospital.create({ data: { companyId, name, state, price } });
  }

  revalidateAll();
  return { ok: true, message: id ? "Hospital actualizado." : "Hospital creado." };
}

export async function toggleHospital(formData: FormData): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

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

export async function deleteHospital(formData: FormData): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const id = Number(formData.get("id") ?? 0);
  const hospital = await prisma.hospital.findUnique({ where: { id } });
  if (!hospital) return { ok: false, message: "Hospital no encontrado." };

  const records = await prisma.dailyRecord.count({ where: { hospitalId: id } });
  if (records > 0) {
    return {
      ok: false,
      message: `No se puede eliminar: el hospital tiene ${records} ${
        records === 1 ? "captura" : "capturas"
      } en su historial. Desactívalo para dejar de usarlo sin perder los importes.`,
    };
  }

  await prisma.hospital.delete({ where: { id } });
  revalidateAll();
  return { ok: true, message: "Hospital eliminado." };
}

export async function saveUser(formData: FormData): Promise<ActionResult> {
  const session = await requireSession();

  const id = Number(formData.get("id") ?? 0);
  if (id && session.role !== "admin") return { ok: false, message: SOLO_ADMIN };

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "capturista");

  if (!name) return { ok: false, message: "El nombre es obligatorio." };
  if (!username) return { ok: false, message: "El usuario es obligatorio." };
  if (role !== "admin" && role !== "capturista") {
    return { ok: false, message: "Selecciona un rol válido." };
  }
  if (!id && password.length < 6) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (id && password && password.length < 6) {
    return { ok: false, message: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (role !== "admin" && session.role === "admin" && id === session.id) {
    return { ok: false, message: "No puedes quitarte a ti mismo el rol de administrador." };
  }

  const duplicate = await prisma.user.findUnique({ where: { username } });
  if (duplicate && duplicate.id !== id) {
    return { ok: false, message: "Ya existe un usuario con ese nombre de usuario." };
  }

  if (id) {
    if (role !== "admin") {
      const blocked = await wouldLeaveNoAdmin(id);
      if (blocked) return blocked;
    }
    await prisma.user.update({
      where: { id },
      data: {
        name,
        username,
        role,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
  } else {
    await prisma.user.create({
      data: { name, username, role, passwordHash: await hashPassword(password) },
    });
  }

  revalidatePath("/configuracion");
  return { ok: true, message: id ? "Usuario actualizado." : "Usuario creado." };
}

export async function toggleUser(formData: FormData): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const session = await requireSession();
  const id = Number(formData.get("id") ?? 0);
  if (id === session.id) {
    return { ok: false, message: "No puedes desactivar tu propio usuario." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { ok: false, message: "Usuario no encontrado." };

  if (user.active && user.role === "admin") {
    const blocked = await wouldLeaveNoAdmin(id);
    if (blocked) return blocked;
  }

  await prisma.user.update({ where: { id }, data: { active: !user.active } });
  revalidatePath("/configuracion");
  return { ok: true, message: user.active ? "Usuario desactivado." : "Usuario activado." };
}

export async function deleteUser(formData: FormData): Promise<ActionResult> {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const session = await requireSession();
  const id = Number(formData.get("id") ?? 0);
  if (id === session.id) {
    return { ok: false, message: "No puedes eliminar tu propio usuario." };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { ok: false, message: "Usuario no encontrado." };

  if (user.role === "admin") {
    const blocked = await wouldLeaveNoAdmin(id);
    if (blocked) return blocked;
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/configuracion");
  return { ok: true, message: "Usuario eliminado." };
}

/** Impide quedarse sin ningún administrador activo. */
async function wouldLeaveNoAdmin(excludedUserId: number): Promise<ActionResult | null> {
  const otherAdmins = await prisma.user.count({
    where: { role: "admin", active: true, id: { not: excludedUserId } },
  });
  return otherAdmins > 0
    ? null
    : {
        ok: false,
        message: "Debe quedar al menos un administrador activo.",
      };
}
