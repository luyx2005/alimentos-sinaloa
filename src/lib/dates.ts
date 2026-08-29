/**
 * Las fechas de servicio se manejan como fechas puras (sin hora ni zona horaria).
 * Internamente se representan como Date en medianoche UTC para evitar corrimientos.
 */

const MEXICO_TZ = "America/Mexico_City";

export function parseISODate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error(`Fecha inválida: ${value}`);
  }
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${value}`);
  }
  return date;
}

export function isISODate(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Fecha de hoy en la zona horaria de México, como cadena YYYY-MM-DD. */
export function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function addDaysISO(value: string, days: number): string {
  return toISODate(addDays(parseISODate(value), days));
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** Ej. "sábado 29 de agosto de 2026" */
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} de ${
    MONTHS[date.getUTCMonth()]
  } de ${date.getUTCFullYear()}`;
}

/** Ej. "29 ago 2026" */
export function formatShortDate(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, "0")} ${MONTHS[
    date.getUTCMonth()
  ].slice(0, 3)} ${date.getUTCFullYear()}`;
}

export function monthName(monthIndex: number): string {
  return MONTHS[monthIndex];
}

/** Lista de fechas (YYYY-MM-DD) entre dos fechas inclusive. */
export function eachDateISO(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let current = parseISODate(startISO);
  const end = parseISODate(endISO);
  while (current.getTime() <= end.getTime()) {
    out.push(toISODate(current));
    current = addDays(current, 1);
  }
  return out;
}
