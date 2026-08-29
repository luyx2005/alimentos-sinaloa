/**
 * Prueba de extremo a extremo del flujo del MVP contra un servidor ya corriendo.
 *
 *   BASE_URL=http://127.0.0.1:43137 node tests/e2e.mjs
 *
 * Requiere Google Chrome instalado (se usa el canal "chrome" de Playwright).
 */
import { chromium } from "playwright";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43137";
const results = [];
let failures = 0;

function check(name, condition, detail = "") {
  if (condition) {
    results.push(`PASA  ${name}`);
  } else {
    failures++;
    results.push(`FALLA ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const downloads = mkdtempSync(join(tmpdir(), "descargas-"));

// Nombres únicos por corrida para que la prueba se pueda repetir sobre la misma base.
const sufijo = Date.now().toString().slice(-5);
const EMPRESA = `Empresa Prueba ${sufijo}`;
const HOSPITAL = `Hospital Prueba ${sufijo}`;
const USUARIO = `anatest${sufijo}`;

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1400, height: 900 },
});
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

async function textoEstable(selector) {
  const locator = page.locator(selector);
  await locator.waitFor();
  for (let intento = 0; intento < 20; intento++) {
    const texto = ((await locator.textContent()) ?? "").trim();
    if (texto) return texto;
    await page.waitForTimeout(150);
  }
  return "";
}

async function saveDownload(action) {
  const [download] = await Promise.all([page.waitForEvent("download"), action()]);
  const name = download.suggestedFilename();
  await download.saveAs(join(downloads, name));
  return name;
}

try {
  // 1. Login
  await page.goto(`${BASE}/login`);
  await page.locator("#username").fill("demo");
  await page.locator("#password").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${BASE}/`);
  check(
    "1. Login y pantalla de inicio",
    await page.getByText("Pendientes del último día").isVisible(),
  );

  // 2. Crear empresa
  await page.goto(`${BASE}/configuracion`);
  await page.getByRole("button", { name: "Nueva empresa" }).click();
  await page.locator("#company-name").fill(EMPRESA);
  await page.locator("#company-period").click();
  await page.getByRole("option", { name: /Quincenal/ }).click();
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("cell", { name: EMPRESA, exact: true }).waitFor();
  const filaEmpresa = page.getByRole("row", { name: EMPRESA });
  check(
    "2. Crear empresa quincenal",
    (await filaEmpresa.textContent())?.includes("Quincenal") ?? false,
  );

  // 3. Crear hospital
  await page.getByRole("tab", { name: "Hospitales" }).click();
  await page.getByRole("button", { name: "Nuevo hospital" }).click();
  await page.locator("#hospital-company").click();
  await page.getByRole("option", { name: EMPRESA }).click();
  await page.locator("#hospital-name").fill(HOSPITAL);
  await page.locator("#hospital-price").fill("100");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("cell", { name: HOSPITAL, exact: true }).waitFor();
  const filaHospital = page.getByRole("row", { name: HOSPITAL });
  check(
    "3. Crear hospital con precio $100.00",
    (await filaHospital.textContent())?.includes("$100.00") ?? false,
    await filaHospital.textContent(),
  );

  // 4. Crear usuario
  await page.getByRole("tab", { name: "Usuarios" }).click();
  check(
    "4a. La pestaña Usuarios muestra el capturista demo",
    await page.getByRole("cell", { name: "demo", exact: true }).isVisible(),
  );
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  await page.locator("#user-name").fill(`Ana Test ${sufijo}`);
  await page.locator("#user-username").fill(USUARIO);
  await page.locator("#user-password").fill("test1234");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("cell", { name: `Ana Test ${sufijo}` }).waitFor();
  check("4b. Crear usuario capturista", true);

  // 5. Captura con cálculos
  const hospitalId = await page.evaluate(async (base) => {
    const response = await fetch(`${base}/captura`, { credentials: "include" });
    const html = await response.text();
    const match = html.match(/\/captura\/(\d+)\?fecha=/);
    return match ? match[1] : null;
  }, BASE);
  check("5a. La lista de captura enlaza a un hospital", hospitalId !== null);

  await page.goto(`${BASE}/captura?fecha=2026-08-20`);
  await page.locator("#filter-empresa").click();
  await page.getByRole("option", { name: EMPRESA }).click();
  await page.getByRole("row", { name: HOSPITAL }).waitFor();
  check(
    "5b. Hospital Prueba aparece pendiente",
    (await page.getByRole("row", { name: HOSPITAL }).textContent())?.includes(
      "Pendiente",
    ) ?? false,
  );

  await page.getByRole("link", { name: "Capturar" }).first().click();
  await page.waitForURL(/\/captura\/\d+\?fecha=2026-08-20/);
  const capturaUrl = page.url();

  await page.locator("#breakfastPatients").fill("10");
  await page.locator("#breakfastStaff").fill("5");
  await page.locator("#lunchPatients").fill("20");
  await page.locator("#lunchStaff").fill("5");
  await page.locator("#dinnerPatients").fill("10");
  await page.locator("#dinnerStaff").fill("0");
  await page.locator("#snackQuantity").fill("5");

  const resumen = page.getByText("Resumen").locator("xpath=ancestor::div[@data-slot='card']");
  const textoResumen = (await resumen.textContent()) ?? "";
  check(
    "5c. Resumen calculado en vivo (55 servidos, $5,500.00)",
    textoResumen.includes("55") && textoResumen.includes("$5,500.00"),
    textoResumen.replace(/\s+/g, " ").slice(0, 220),
  );

  await page.getByRole("button", { name: "Guardar captura" }).click();
  await page.waitForURL(/\/captura\?fecha=2026-08-20/);
  await page.getByRole("row", { name: HOSPITAL }).waitFor();
  check(
    "5d. Tras guardar el hospital queda Completo",
    (await page.getByRole("row", { name: HOSPITAL }).textContent())?.includes(
      "Completo",
    ) ?? false,
  );

  // 6. Cero no es pendiente
  const idHospitalPrueba = capturaUrl.match(/\/captura\/(\d+)/)[1];
  await page.goto(`${BASE}/captura/${idHospitalPrueba}?fecha=2026-08-21`);
  for (const campo of [
    "breakfastPatients",
    "breakfastStaff",
    "lunchPatients",
    "lunchStaff",
    "dinnerPatients",
    "dinnerStaff",
    "snackQuantity",
  ]) {
    await page.locator(`#${campo}`).fill("0");
  }
  await page.getByRole("button", { name: "Guardar captura" }).click();
  await page.waitForURL(/\/captura\?fecha=2026-08-21/);
  const filaCero = page.getByRole("row", { name: HOSPITAL });
  await filaCero.waitFor();
  const textoCero = (await filaCero.textContent()) ?? "";
  check(
    "6. Una captura en ceros queda Completo con importe $0.00",
    textoCero.includes("Completo") && textoCero.includes("$0.00"),
    textoCero.replace(/\s+/g, " "),
  );

  // 7. Duplicado
  await page.goto(`${BASE}/captura/${idHospitalPrueba}?fecha=2026-08-20`);
  check(
    "7. Al reabrir la fecha se edita la captura existente",
    await page.getByText("Ya existe una captura para este hospital y fecha").isVisible(),
  );

  // 8. Modificación
  await page.locator("#snackQuantity").fill("15");
  await page.waitForTimeout(1200);
  check(
    "8a. El valor capturado se mantiene (sin recargas que lo descarten)",
    (await page.locator("#snackQuantity").inputValue()) === "15",
    `valor actual: ${await page.locator("#snackQuantity").inputValue()}`,
  );
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForURL(/\/captura\?fecha=2026-08-20/);
  const filaEditada = page.getByRole("row", { name: HOSPITAL });
  await filaEditada.waitFor();
  check(
    "8b. El importe se recalcula a $6,500.00",
    ((await filaEditada.textContent()) ?? "").includes("$6,500.00"),
    await filaEditada.textContent(),
  );

  // 9. Cambio de precio y precio histórico
  await page.goto(`${BASE}/configuracion`);
  await page.getByRole("tab", { name: "Hospitales" }).click();
  await page
    .getByRole("row", { name: HOSPITAL })
    .getByRole("button", { name: "Editar" })
    .click();
  await page.locator("#hospital-price").fill("200");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("row", { name: HOSPITAL }).filter({ hasText: "$200.00" }).waitFor();

  await page.goto(`${BASE}/captura/${idHospitalPrueba}?fecha=2026-08-20`);
  const resumenHistorico =
    (await page
      .getByText("Resumen")
      .locator("xpath=ancestor::div[@data-slot='card']")
      .textContent()) ?? "";
  check(
    "9. El precio aplicado histórico se conserva ($100.00 y $6,500.00)",
    resumenHistorico.includes("$100.00") && resumenHistorico.includes("$6,500.00"),
    resumenHistorico.replace(/\s+/g, " ").slice(0, 220),
  );

  // 10. Eliminación lógica
  await page.goto(`${BASE}/captura/${idHospitalPrueba}?fecha=2026-08-21`);
  await page.getByRole("button", { name: "Eliminar captura" }).click();
  check(
    "10a. El diálogo avisa que se podrá recuperar",
    await page.getByText("Podrás recuperarla posteriormente").isVisible(),
  );
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.waitForURL(/\/captura\?fecha=2026-08-21/);
  const filaEliminada = page.getByRole("row", { name: HOSPITAL });
  await filaEliminada.waitFor();
  check(
    "10b. Tras eliminar vuelve a Pendiente",
    ((await filaEliminada.textContent()) ?? "").includes("Pendiente"),
    await filaEliminada.textContent(),
  );

  // 11. Pantalla de pendientes
  await page.goto(`${BASE}/pendientes?fecha=2026-08-21`);
  const filaPendiente = page.getByRole("row", { name: HOSPITAL });
  await filaPendiente.waitFor();
  const textoPendiente = (await filaPendiente.textContent()) ?? "";
  check(
    "11. Pendientes indica qué información falta",
    textoPendiente.includes("Desayuno, Comida, Cena, Colación"),
    textoPendiente.replace(/\s+/g, " "),
  );

  // 12-14. Reporte por hospital y exportaciones
  const empresaPruebaId = await page.evaluate(
    async ({ base, empresa }) => {
      const response = await fetch(`${base}/reportes?tipo=hospital`, {
        credentials: "include",
      });
      const html = await response.text();
      const match = html.match(
        new RegExp(`\\\\"value\\\\":\\\\"(\\d+)\\\\",\\\\"label\\\\":\\\\"${empresa}\\\\"`),
      );
      return match ? match[1] : null;
    },
    { base: BASE, empresa: EMPRESA },
  );
  await page.goto(
    `${BASE}/reportes?tipo=hospital&empresa=${empresaPruebaId}&hospital=${idHospitalPrueba}&desde=2026-08-01&hasta=2026-08-31`,
  );
  const tablaHospital = (await page.locator("table").first().textContent()) ?? "";
  check(
    "12. Reporte por hospital con total 65 e importe $6,500.00",
    tablaHospital.includes("65") && tablaHospital.includes("$6,500.00"),
    tablaHospital.replace(/\s+/g, " ").slice(0, 240),
  );

  const excelHospital = await saveDownload(() =>
    page.getByRole("button", { name: "Exportar Excel" }).click(),
  );
  check(
    "13. Descarga de Excel del reporte por hospital",
    excelHospital.endsWith(".xlsx"),
    excelHospital,
  );

  const pdfHospital = await saveDownload(() =>
    page.getByRole("button", { name: "Exportar PDF" }).click(),
  );
  check("14. Descarga de PDF", pdfHospital.endsWith(".pdf"), pdfHospital);

  // 15. Reporte por empresa (semanal) + Excel
  await page.goto(`${BASE}/reportes?tipo=empresa&empresa=1`);
  const periodoSemanal = await textoEstable("#filter-periodo");
  const tablaEmpresa = (await page.locator("table").first().textContent()) ?? "";
  check(
    "15a. Empresa semanal muestra periodos de lunes a domingo",
    /Semana del/.test(periodoSemanal),
    periodoSemanal,
  );
  check(
    "15b. El reporte por empresa incluye la fila TOTAL EMPRESA",
    tablaEmpresa.includes("TOTAL EMPRESA"),
  );
  const excelEmpresa = await saveDownload(() =>
    page.getByRole("button", { name: "Exportar Excel" }).click(),
  );
  check(
    "15c. Descarga de Excel del reporte por empresa",
    excelEmpresa.endsWith(".xlsx"),
    excelEmpresa,
  );

  // 16. Empresa quincenal
  await page.goto(`${BASE}/reportes?tipo=empresa&empresa=2`);
  const periodoQuincenal = await textoEstable("#filter-periodo");
  check(
    "16. Empresa quincenal muestra quincenas",
    /al \d+ de \w+ de \d{4}/.test(periodoQuincenal) && !/Semana del/.test(periodoQuincenal),
    periodoQuincenal,
  );

  // 17-18. Resto de reportes
  await page.goto(`${BASE}/reportes?tipo=pacientes&empresa=1&desde=2026-08-01&hasta=2026-08-31`);
  check(
    "17a. Reporte pacientes vs personal",
    (await page.locator("table").first().textContent())?.includes("TOTAL") ?? false,
  );
  await page.goto(`${BASE}/reportes?tipo=servicio&empresa=1&desde=2026-08-01&hasta=2026-08-31`);
  check(
    "17b. Reporte por servicio",
    (await page.locator("table").first().textContent())?.includes("TOTAL") ?? false,
  );
  await page.goto(`${BASE}/reportes?tipo=pendientes&desde=2026-08-01&hasta=2026-08-31`);
  check(
    "18. Reporte de pendientes",
    (await page.getByText("Pendientes del periodo").isVisible()) ?? false,
  );

  // 19. Responsive
  await page.setViewportSize({ width: 420, height: 900 });
  await page.goto(`${BASE}/reportes?tipo=empresa&empresa=1`);
  check(
    "19. En móvil aparece el menú y no hay desbordamiento horizontal",
    (await page.getByRole("button", { name: "Menú" }).isVisible()) &&
      (await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      )),
  );
  await page.getByRole("button", { name: "Menú" }).click();
  check(
    "19b. El menú móvil abre la navegación",
    await page.getByRole("link", { name: "Configuración" }).isVisible(),
  );

  // 20. Cierre de sesión y protección de rutas
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL(/\/login/);
  await page.goto(`${BASE}/reportes`);
  check(
    "20. Sin sesión, las rutas privadas redirigen al login",
    page.url().includes("/login"),
    page.url(),
  );

  const erroresRelevantes = consoleErrors.filter(
    (error) => !/favicon|Download the React DevTools/i.test(error),
  );
  check(
    "21. Sin errores de consola durante el flujo",
    erroresRelevantes.length === 0,
    erroresRelevantes.slice(0, 3).join(" | "),
  );
} catch (error) {
  failures++;
  results.push(`FALLA ejecución interrumpida — ${error}`);
} finally {
  console.log(results.join("\n"));
  console.log(`\nDescargas en ${downloads}: ${readdirSync(downloads).join(", ") || "ninguna"}`);
  console.log(failures === 0 ? "\nTODO OK" : `\n${failures} prueba(s) con falla`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
}
