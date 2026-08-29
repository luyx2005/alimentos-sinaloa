import { addDays, monthName, parseISODate, toISODate } from "@/lib/dates";

export type PaymentPeriodType = "weekly" | "biweekly";

export type Period = {
  startDate: string;
  endDate: string;
  label: string;
};

type CompanyLike = { paymentPeriodType: PaymentPeriodType };

/**
 * Periodo de pago al que pertenece una fecha de SERVICIO.
 * weekly: lunes a domingo. biweekly: 1-15 y 16 al último día del mes.
 */
export function getPeriodForDate(company: CompanyLike, date: Date | string): Period {
  const day = typeof date === "string" ? parseISODate(date) : date;

  if (company.paymentPeriodType === "weekly") {
    const offset = (day.getUTCDay() + 6) % 7; // lunes = 0
    const start = addDays(day, -offset);
    const end = addDays(start, 6);
    return {
      startDate: toISODate(start),
      endDate: toISODate(end),
      label: weeklyLabel(start, end),
    };
  }

  const year = day.getUTCFullYear();
  const month = day.getUTCMonth();
  const isFirstHalf = day.getUTCDate() <= 15;
  const start = new Date(Date.UTC(year, month, isFirstHalf ? 1 : 16));
  const end = isFirstHalf
    ? new Date(Date.UTC(year, month, 15))
    : lastDayOfMonth(year, month);

  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
    label: `${start.getUTCDate()} al ${end.getUTCDate()} de ${monthName(
      month,
    )} de ${year}`,
  };
}

/** Los N periodos más recientes (incluyendo el de `date`), del más nuevo al más viejo. */
export function listRecentPeriods(
  company: CompanyLike,
  date: Date | string,
  count = 12,
): Period[] {
  const periods: Period[] = [];
  let cursor = typeof date === "string" ? parseISODate(date) : date;
  for (let i = 0; i < count; i++) {
    const period = getPeriodForDate(company, cursor);
    periods.push(period);
    cursor = addDays(parseISODate(period.startDate), -1);
  }
  return periods;
}

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0));
}

function weeklyLabel(start: Date, end: Date): string {
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth && sameYear) {
    return `Semana del ${start.getUTCDate()} al ${end.getUTCDate()} de ${monthName(
      start.getUTCMonth(),
    )} de ${start.getUTCFullYear()}`;
  }
  const left = `${start.getUTCDate()} de ${monthName(start.getUTCMonth())}${
    sameYear ? "" : ` de ${start.getUTCFullYear()}`
  }`;
  const right = `${end.getUTCDate()} de ${monthName(
    end.getUTCMonth(),
  )} de ${end.getUTCFullYear()}`;
  return `Semana del ${left} al ${right}`;
}
