export type Quantities = {
  breakfastPatients: number | null;
  breakfastStaff: number | null;
  breakfastSnack: number | null;
  lunchPatients: number | null;
  lunchStaff: number | null;
  lunchSnack: number | null;
  dinnerPatients: number | null;
  dinnerStaff: number | null;
  dinnerSnack: number | null;
};

export type Totals = {
  /** Cada total de servicio incluye su colación. */
  breakfastTotal: number;
  lunchTotal: number;
  dinnerTotal: number;
  /** Suma de las colaciones de los tres servicios. */
  snack: number;
  totalPatients: number;
  totalStaff: number;
  totalServed: number;
  amount: number;
};

export const SERVICE_LABELS = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
} as const;

export type ServiceKey = keyof typeof SERVICE_LABELS;

const n = (value: number | null | undefined) => value ?? 0;

/**
 * Cada servicio tiene pacientes, personal y colación. La colación no se suma a
 * pacientes ni a personal, pero sí al total del servicio y por lo tanto al importe.
 */
export function computeTotals(q: Quantities, appliedPrice: number): Totals {
  const breakfastTotal =
    n(q.breakfastPatients) + n(q.breakfastStaff) + n(q.breakfastSnack);
  const lunchTotal = n(q.lunchPatients) + n(q.lunchStaff) + n(q.lunchSnack);
  const dinnerTotal = n(q.dinnerPatients) + n(q.dinnerStaff) + n(q.dinnerSnack);
  const snack = n(q.breakfastSnack) + n(q.lunchSnack) + n(q.dinnerSnack);
  const totalPatients =
    n(q.breakfastPatients) + n(q.lunchPatients) + n(q.dinnerPatients);
  const totalStaff = n(q.breakfastStaff) + n(q.lunchStaff) + n(q.dinnerStaff);
  const totalServed = breakfastTotal + lunchTotal + dinnerTotal;

  return {
    breakfastTotal,
    lunchTotal,
    dinnerTotal,
    snack,
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
    totalPatients: a.totalPatients + b.totalPatients,
    totalStaff: a.totalStaff + b.totalStaff,
    totalServed: a.totalServed + b.totalServed,
    amount: round2(a.amount + b.amount),
  };
}

/**
 * Cada servicio tiene pacientes y personal. Si la empresa maneja colación, también
 * esa cantidad. Un servicio está capturado cuando tiene las cantidades que aplica;
 * CERO es un valor válido.
 */
export function missingServices(
  q: Quantities,
  options: { usesSnack?: boolean } = {},
): ServiceKey[] {
  const usesSnack = options.usesSnack !== false;
  const missing: ServiceKey[] = [];
  const incomplete = (
    patients: number | null,
    staff: number | null,
    snack: number | null,
  ) =>
    patients === null || staff === null || (usesSnack && snack === null);

  if (incomplete(q.breakfastPatients, q.breakfastStaff, q.breakfastSnack)) {
    missing.push("breakfast");
  }
  if (incomplete(q.lunchPatients, q.lunchStaff, q.lunchSnack)) {
    missing.push("lunch");
  }
  if (incomplete(q.dinnerPatients, q.dinnerStaff, q.dinnerSnack)) {
    missing.push("dinner");
  }
  return missing;
}

export type CaptureStatus = "completo" | "incompleto" | "sin_captura";

export function captureStatus(
  q: Quantities | null,
  options: { usesSnack?: boolean } = {},
): CaptureStatus {
  if (!q) return "sin_captura";
  return missingServices(q, options).length === 0 ? "completo" : "incompleto";
}

export const STATUS_LABELS: Record<CaptureStatus, string> = {
  completo: "Completo",
  incompleto: "Incompleto",
  sin_captura: "Sin captura",
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
