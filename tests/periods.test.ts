import assert from "node:assert/strict";
import test from "node:test";

import { getPeriodForDate, listRecentPeriods } from "../src/lib/periods";

const weekly = { paymentPeriodType: "weekly" as const };
const biweekly = { paymentPeriodType: "biweekly" as const };

test("periodo semanal de lunes a domingo", () => {
  const period = getPeriodForDate(weekly, "2026-08-29"); // sábado
  assert.equal(period.startDate, "2026-08-24");
  assert.equal(period.endDate, "2026-08-30");
});

test("el domingo cierra su propia semana", () => {
  const period = getPeriodForDate(weekly, "2026-08-30");
  assert.equal(period.startDate, "2026-08-24");
  assert.equal(period.endDate, "2026-08-30");
});

test("semana que cruza de mes", () => {
  const period = getPeriodForDate(weekly, "2026-08-01"); // sábado
  assert.equal(period.startDate, "2026-07-27");
  assert.equal(period.endDate, "2026-08-02");
  assert.match(period.label, /julio/);
});

test("primera quincena", () => {
  const period = getPeriodForDate(biweekly, "2026-08-15");
  assert.equal(period.startDate, "2026-08-01");
  assert.equal(period.endDate, "2026-08-15");
});

test("segunda quincena hasta el último día del mes", () => {
  const period = getPeriodForDate(biweekly, "2026-08-16");
  assert.equal(period.startDate, "2026-08-16");
  assert.equal(period.endDate, "2026-08-31");
});

test("febrero de año bisiesto", () => {
  const period = getPeriodForDate(biweekly, "2028-02-20");
  assert.equal(period.startDate, "2028-02-16");
  assert.equal(period.endDate, "2028-02-29");
});

test("periodos recientes en orden descendente y sin traslapes", () => {
  const periods = listRecentPeriods(biweekly, "2026-08-20", 3);
  assert.deepEqual(
    periods.map((period) => `${period.startDate}/${period.endDate}`),
    ["2026-08-16/2026-08-31", "2026-08-01/2026-08-15", "2026-07-16/2026-07-31"],
  );
});
