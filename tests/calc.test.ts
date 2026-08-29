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
  lunchPatients: 20,
  lunchStaff: 5,
  dinnerPatients: 10,
  dinnerStaff: 0,
  snackQuantity: 5,
};

test("totales e importe", () => {
  const totals = computeTotals(full, 100);
  assert.equal(totals.breakfastTotal, 15);
  assert.equal(totals.lunchTotal, 25);
  assert.equal(totals.dinnerTotal, 10);
  assert.equal(totals.snack, 5);
  assert.equal(totals.mainServices, 50);
  assert.equal(totals.totalPatients, 40);
  assert.equal(totals.totalStaff, 10);
  assert.equal(totals.totalServed, 55);
  assert.equal(totals.amount, 5500);
});

test("la colación no se suma a pacientes ni a personal", () => {
  const totals = computeTotals({ ...full, snackQuantity: 1000 }, 1);
  assert.equal(totals.totalPatients, 40);
  assert.equal(totals.totalStaff, 10);
  assert.equal(totals.totalServed, 1050);
});

test("cero es un valor válido y no significa pendiente", () => {
  const zeros: Quantities = {
    breakfastPatients: 0,
    breakfastStaff: 0,
    lunchPatients: 0,
    lunchStaff: 0,
    dinnerPatients: 0,
    dinnerStaff: 0,
    snackQuantity: 0,
  };
  assert.deepEqual(missingServices(zeros), []);
  assert.equal(captureStatus(zeros), "completo");
  assert.equal(computeTotals(zeros, 85).amount, 0);
});

test("un registro sin colación queda incompleto", () => {
  const partial: Quantities = { ...full, snackQuantity: null };
  assert.deepEqual(missingServices(partial), ["snack"]);
  assert.equal(captureStatus(partial), "incompleto");
});

test("sin registro el estado es sin captura", () => {
  assert.equal(captureStatus(null), "sin_captura");
});

test("precios con decimales", () => {
  assert.equal(computeTotals(full, 78.5).amount, 4317.5);
});
