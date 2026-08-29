import { jwtVerify } from "jose";

export const SESSION_COOKIE = "comedores_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;

export type UserRole = "admin" | "capturista";

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  role: UserRole;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  capturista: "Capturista",
};

/** Secciones reservadas a administradores: el capturista solo trabaja con capturas. */
export const ADMIN_ONLY_PATHS = ["/reportes", "/configuracion"] as const;

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (role === "admin") return true;
  return !ADMIN_ONLY_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "Falta AUTH_SECRET (mínimo 16 caracteres) en las variables de entorno.",
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verifica la firma y la forma del token. El proxy y el servidor usan esta misma
 * función: si aceptaran criterios distintos, una cookie antigua provocaría un bucle
 * de redirecciones entre la aplicación y el login.
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.id !== "number" ||
      typeof payload.name !== "string" ||
      typeof payload.username !== "string" ||
      (payload.role !== "admin" && payload.role !== "capturista")
    ) {
      return null;
    }
    return {
      id: payload.id,
      name: payload.name,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
