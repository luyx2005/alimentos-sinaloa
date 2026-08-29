"use server";

import { redirect } from "next/navigation";

import { createSession, verifyCredentials } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!username || !password) {
    return { error: "Escribe tu usuario y contraseña." };
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  await createSession(user);
  redirect(next.startsWith("/") ? next : "/");
}
