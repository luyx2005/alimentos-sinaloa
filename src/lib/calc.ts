export type Quantities = {
  breakfastPatients: number | null;
  breakfastStaff: number | null;
  lunchPatients: number | null;
  lunchStaff: number | null;
  dinnerPatients: number | null;
  dinnerStaff: number | null;
  snackQuantity: number | null;
};

export type Totals = {
  breakfastTotal: number;
  lunchTotal: number;
  dinnerTotal: number;
  snack: number;
  mainServices: number;
  totalPatients: number;
  totalStaff: number;
  totalServed: number;
  amount: number;
};

export const SERVICE_LABELS = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Colación",
} as const;

export type ServiceKey = keyof typeof SERVICE_LABELS;

const n = (value: number | null | undefined) => value ?? 0;

/**
 * La colación es independiente: no se suma a pacientes ni a personal,
 * pero sí al total servido y por lo tanto al importe.
 */
export function computeTotals(q: Quantities, appliedPrice: number): Totals {
  const breakfastTotal = n(q.breakfastPatients) + n(q.breakfastStaff);
  const lunchTotal = n(q.lunchPatients) + n(q.lunchStaff);
  const dinnerTotal = n(q.dinnerPatients) + n(q.dinnerStaff);
  const snack = n(q.snackQuantity);
  const mainServices = breakfastTotal + lunchTotal + dinnerTotal;
  const totalPatients =
    n(q.breakfastPatients) + n(q.lunchPatients) + n(q.dinnerPatients);
  const totalStaff = n(q.breakfastStaff) + n(q.lunchStaff) + n(q.dinnerStaff);
  const totalServed = mainServices + snack;

  return {
    breakfastTotal,
    lunchTotal,
    dinnerTotal,
    snack,
    mainServices,
    totalPatients,
    totalStaff,
    totalServed,
    amount: round2(totalServed * appliedPrice),
  };
}

export function emptyTotals(): Totals {
  return {
    breakfastTotal: 0,
    lunchTotal: 0,
    dinnerTotal: 0,
    snack: 0,
    mainServices: 0,
    totalPatients: 0,
    totalStaff: 0,
    totalServed: 0,
    amount: 0,
  };
}

export function addTotals(a: Totals, b: Totals): Totals {
  return {
    breakfastTotal: a.breakfastTotal + b.breakfastTotal,
    lunchTotal: a.lunchTotal + b.lunchTotal,
    dinnerTotal: a.dinnerTotal + b.dinnerTotal,
    snack: a.snack + b.snack,
    mainServices: a.mainServices + b.mainServices,
    totalPatients: a.totalPatients + b.totalPatients,
    totalStaff: a.totalStaff + b.totalStaff,
    totalServed: a.totalServed + b.totalServed,
    amount: round2(a.amount + b.amount),
  };
}

/**
 * Un servicio está capturado cuando tiene datos; CERO es un valor válido.
 * Desayuno/comida/cena requieren pacientes y personal.
 */
export function missingServices(q: Quantities): ServiceKey[] {
  const missing: ServiceKey[] = [];
  if (q.breakfastPatients === null || q.breakfastStaff === null) {
    missing.push("breakfast");
  }
  if (q.lunchPatients === null || q.lunchStaff === null) missing.push("lunch");
  if (q.dinnerPatients === null || q.dinnerStaff === null) missing.push("dinner");
  if (q.snackQuantity === null) missing.push("snack");
  return missing;
}

export type CaptureStatus = "completo" | "incompleto" | "sin_captura";

export function captureStatus(q: Quantities | null): CaptureStatus {
  if (!q) return "sin_captura";
  return missingServices(q).length === 0 ? "completo" : "incompleto";
}

export const STATUS_LABELS: Record<CaptureStatus, string> = {
  completo: "Completo",
  incompleto: "Incompleto",
  sin_captura: "Pendiente",
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}
