import assert from "node:assert/strict";
import test from "node:test";

import {
  captureStatus,
  computeTotals,
  missingServices,
  type Quantities,
} from "../src/lib/calc";

const full: Quantities = {
  breakfastPatients: 10,
  breakfastStaff: 5,
  breakfastSnack: 2,
  lunchPatients: 20,
  lunchStaff: 5,
  lunchSnack: 1,
  dinnerPatients: 10,
  dinnerStaff: 0,
  dinnerSnack: 2,
};

test("cada servicio incluye su colación en el total", () => {
  const totals = computeTotals(full, 100);
  assert.equal(totals.breakfastTotal, 17);
  assert.equal(totals.lunchTotal, 26);
  assert.equal(totals.dinnerTotal, 12);
  assert.equal(totals.snack, 5);
  assert.equal(totals.totalPatients, 40);
  assert.equal(totals.totalStaff, 10);
  assert.equal(totals.totalServed, 55);
  assert.equal(totals.amount, 5500);
});

test("la colación no se suma a pacientes ni a personal", () => {
  const totals = computeTotals({ ...full, lunchSnack: 1000 }, 1);
  assert.equal(totals.totalPatients, 40);
  assert.equal(totals.totalStaff, 10);
  assert.equal(totals.totalServed, 1054);
});

test("cero es un valor válido y no significa faltante", () => {
  const zeros: Quantities = {
    breakfastPatients: 0,
    breakfastStaff: 0,
    breakfastSnack: 0,
    lunchPatients: 0,
    lunchStaff: 0,
    lunchSnack: 0,
    dinnerPatients: 0,
    dinnerStaff: 0,
    dinnerSnack: 0,
  };
  assert.deepEqual(missingServices(zeros), []);
  assert.equal(captureStatus(zeros), "completo");
  assert.equal(computeTotals(zeros, 85).amount, 0);
});

test("un servicio sin colación queda incompleto", () => {
  const partial: Quantities = { ...full, dinnerSnack: null };
  assert.deepEqual(missingServices(partial), ["dinner"]);
  assert.equal(captureStatus(partial), "incompleto");
});

test("sin colación, la captura está completa si hay pacientes y personal", () => {
  const withoutSnack: Quantities = { ...full, dinnerSnack: null, lunchSnack: null, breakfastSnack: null };
  assert.deepEqual(missingServices(withoutSnack, { usesSnack: false }), []);
  assert.equal(captureStatus(withoutSnack, { usesSnack: false }), "completo");
});

test("sin registro el estado es sin captura", () => {
  assert.equal(captureStatus(null), "sin_captura");
});

test("precios con decimales", () => {
  assert.equal(computeTotals(full, 78.5).amount, 4317.5);
});
