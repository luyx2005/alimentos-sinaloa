/**
 * Prueba de extremo a extremo del flujo del MVP contra un servidor ya corriendo.
 *
 *   BASE_URL=http://127.0.0.1:43137 node tests/e2e.mjs
 *
 * Requiere Google Chrome instalado (se usa el canal "chrome" de Playwright).
 */
import { chromium } from "playwright";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:43137";
// Credenciales de un usuario con rol administrador (por omisión, las del seed).
const ADMIN_USER = process.env.E2E_USER ?? "demo";
const ADMIN_PASSWORD = process.env.E2E_PASSWORD ?? "demo123";
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

// PNG mínimo de 1x1 para adjuntar como foto en las capturas.
const fotos = mkdtempSync(join(tmpdir(), "fotos-"));
const FOTO_PNG = join(fotos, "reporte.png");
writeFileSync(
  FOTO_PNG,
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

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

async function iniciarSesion(usuario, contrasena) {
  await page.goto(`${BASE}/login`);
  await page.locator("#username").fill(usuario);
  await page.locator("#password").fill(contrasena);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${BASE}/`);
}

async function cerrarSesion() {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL(/\/login/);
}

async function esperaVisible(localizador) {
  try {
    await localizador.first().waitFor({ state: "visible", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Espera a que aparezca un texto (por ejemplo, el aviso de una acción de servidor). */
async function esperaTexto(patron) {
  try {
    await page.getByText(patron).first().waitFor({ state: "visible", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function confirmarEliminacion() {
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
}

async function saveDownload(action) {
  const [download] = await Promise.all([page.waitForEvent("download"), action()]);
  const name = download.suggestedFilename();
  await download.saveAs(join(downloads, name));
  return name;
}

try {
  // 1. Login
  await iniciarSesion(ADMIN_USER, ADMIN_PASSWORD);
  check(
    "1. Login y pantalla de inicio",
    await page.getByText("No completados del último día").isVisible(),
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
  check(
    "2c. WWPL no maneja colación",
    ((await page.getByRole("row", { name: /WWPL/ }).first().textContent()) ?? "").includes(
      "No",
    ),
  );

  // 3. Crear hospital
  await page.getByRole("tab", { name: "Hospitales" }).click();
  await page.getByRole("button", { name: "Nuevo hospital" }).click();
  await page.locator("#hospital-company").click();
  await page.getByRole("option", { name: EMPRESA }).click();
  await page.locator("#hospital-name").fill(HOSPITAL);
  await page.locator("#hospital-state").click();
  await page.getByRole("option", { name: "Sinaloa", exact: true }).click();
  await page.locator("#hospital-price").fill("100");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("tab", { name: "Hospitales" }).click();
  await page.getByRole("cell", { name: HOSPITAL, exact: true }).waitFor();
  const filaHospital = page.getByRole("row", { name: HOSPITAL });
  const textoHospital = (await filaHospital.textContent()) ?? "";
  check(
    "3. Crear hospital con estado Sinaloa y precio $100.00",
    textoHospital.includes("$100.00") && textoHospital.includes("Sinaloa"),
    textoHospital.replace(/\s+/g, " "),
  );

  // 4. Crear usuario
  await page.getByRole("tab", { name: "Usuarios" }).click();
  check(
    "4a. La pestaña Usuarios lista las cuentas existentes",
    await esperaVisible(page.getByRole("cell", { name: ADMIN_USER, exact: true })),
  );
  await page.getByRole("button", { name: "Nuevo usuario" }).click();
  await page.locator("#user-name").fill(`Ana Test ${sufijo}`);
  await page.locator("#user-username").fill(USUARIO);
  await page.locator("#user-role").click();
  await page.getByRole("option", { name: "Capturista" }).click();
  await page.locator("#user-password").fill("test1234");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.getByRole("tab", { name: "Usuarios" }).click();
  await page.getByRole("cell", { name: `Ana Test ${sufijo}` }).waitFor();
  const filaUsuario = page.getByRole("row", { name: `Ana Test ${sufijo}` });
  check(
    "4b. Crear usuario con rol capturista",
    ((await filaUsuario.textContent()) ?? "").includes("Capturista"),
    await filaUsuario.textContent(),
  );

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
    "5b. Hospital Prueba aparece sin captura",
    (await page.getByRole("row", { name: HOSPITAL }).textContent())?.includes(
      "Sin captura",
    ) ?? false,
  );

  await page.locator("#filter-empresa").click();
  await page.getByRole("option", { name: "WWPL", exact: true }).click();
  await page.getByRole("row", { name: HOSPITAL }).waitFor({ state: "detached" });
  await page.getByRole("link", { name: /Capturar|Editar/ }).first().click();
  await page.waitForURL(/\/captura\/\d+/);
  check(
    "5bb. En WWPL no aparecen campos de colación",
    (await page.locator("#breakfastSnack").count()) === 0 &&
      (await page.getByText("Total colaciones").count()) === 0,
  );
  await page.goto(`${BASE}/captura?fecha=2026-08-20`);
  await page.locator("#filter-empresa").click();
  await page.getByRole("option", { name: EMPRESA }).click();
  await page.getByRole("row", { name: HOSPITAL }).waitFor();

  await page.getByRole("link", { name: "Capturar" }).first().click();
  await page.waitForURL(/\/captura\/\d+\?fecha=2026-08-20/);
  const capturaUrl = page.url();

  await page.locator("#breakfastPatients").fill("10");
  await page.locator("#breakfastStaff").fill("5");
  await page.locator("#breakfastSnack").fill("3");
  await page.locator("#lunchPatients").fill("20");
  await page.locator("#lunchStaff").fill("5");
  await page.locator("#lunchSnack").fill("2");
  await page.locator("#dinnerPatients").fill("10");
  await page.locator("#dinnerStaff").fill("0");
  await page.locator("#dinnerSnack").fill("0");

  const resumen = page.getByText("Resumen").locator("xpath=ancestor::div[@data-slot='card']");
  const textoResumen = (await resumen.textContent()) ?? "";
  check(
    "5c. Resumen calculado en vivo (55 servidos, $5,500.00)",
    textoResumen.includes("55") && textoResumen.includes("$5,500.00"),
    textoResumen.replace(/\s+/g, " ").slice(0, 220),
  );

  await page.getByRole("button", { name: "Guardar captura" }).click();
  check(
    "5d. Sin la foto del reporte diario no se guarda la captura",
    (await esperaTexto(/Adjunta la foto del reporte diario/)) &&
      new URL(page.url()).pathname.startsWith("/captura/"),
    page.url(),
  );

  await page.locator("#breakfastImage").setInputFiles(FOTO_PNG);
  await page.locator("#reportImage").setInputFiles(FOTO_PNG);
  check(
    "5e. Las fotos adjuntas se previsualizan antes de guardar",
    (await page.locator("img[alt='Foto del reporte diario']").isVisible()) &&
      (await page.locator("img[alt='Foto de desayuno (opcional)']").isVisible()),
  );

  await page.getByRole("button", { name: "Guardar captura" }).click();
  await page.waitForURL(/\/captura\?fecha=2026-08-20/);
  await page.getByRole("row", { name: HOSPITAL }).waitFor();
  check(
    "5f. Tras guardar el hospital queda Completo",
    (await page.getByRole("row", { name: HOSPITAL }).textContent())?.includes(
      "Completo",
    ) ?? false,
  );

  // 6. Cero no es falta de captura
  const idHospitalPrueba = capturaUrl.match(/\/captura\/(\d+)/)[1];
  await page.goto(`${BASE}/captura/${idHospitalPrueba}?fecha=2026-08-21`);
  for (const campo of [
    "breakfastPatients",
    "breakfastStaff",
    "breakfastSnack",
    "lunchPatients",
    "lunchStaff",
    "lunchSnack",
    "dinnerPatients",
    "dinnerStaff",
    "dinnerSnack",
  ]) {
    await page.locator(`#${campo}`).fill("0");
  }
  await page.locator("#reportImage").setInputFiles(FOTO_PNG);
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

  const urlFoto = await page
    .locator("img[alt='Foto del reporte diario']")
    .getAttribute("src");
  const respuestaFoto = await page.request.get(`${BASE}${urlFoto}`);
  check(
    "7b. La foto guardada se muestra y se sirve desde la captura",
    (urlFoto ?? "").includes("/imagen/reportImage") &&
      respuestaFoto.ok() &&
      (respuestaFoto.headers()["content-type"] ?? "").startsWith("image/"),
    `${urlFoto} · ${respuestaFoto.status()}`,
  );

  // 8. Modificación
  await page.locator("#breakfastSnack").fill("13");
  await page.waitForTimeout(1200);
  check(
    "8a. El valor capturado se mantiene (sin recargas que lo descarten)",
    (await page.locator("#breakfastSnack").inputValue()) === "13",
    `valor actual: ${await page.locator("#breakfastSnack").inputValue()}`,
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
    "10b. Tras eliminar vuelve a Sin captura",
    ((await filaEliminada.textContent()) ?? "").includes("Sin captura"),
    await filaEliminada.textContent(),
  );

  // 11. Pantalla de no completados
  await page.goto(`${BASE}/no-completados?fecha=2026-08-21`);
  const filaPendiente = page.getByRole("row", { name: HOSPITAL });
  await filaPendiente.waitFor();
  const textoPendiente = (await filaPendiente.textContent()) ?? "";
  check(
    "11. No completados indica qué información falta",
    textoPendiente.includes("Desayuno, Comida, Cena"),
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

  // 15. Reporte por empresa + Excel
  await page.goto(`${BASE}/reportes?tipo=empresa&empresa=1`);
  await page.locator("#filter-periodo").click();
  const opcionSemanal = page.getByRole("option").first();
  const periodoSemanal = (await opcionSemanal.textContent()) ?? "";
  check(
    "15a. El atajo de periodos ofrece semanas de lunes a domingo",
    /Semana del/.test(periodoSemanal),
    periodoSemanal,
  );
  await opcionSemanal.click();
  await page.waitForURL(/desde=/);
  await page.locator("table").first().waitFor();
  const tablaEmpresa = (await page.locator("table").first().textContent()) ?? "";
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

  // 16. Empresa quincenal y rango libre
  await page.goto(`${BASE}/reportes?tipo=empresa&empresa=2`);
  await page.locator("#filter-periodo").click();
  const periodoQuincenal = (await page.getByRole("option").first().textContent()) ?? "";
  await page.keyboard.press("Escape");
  check(
    "16a. El atajo de la empresa quincenal ofrece quincenas",
    /al \d+ de \w+ de \d{4}/.test(periodoQuincenal) && !/Semana del/.test(periodoQuincenal),
    periodoQuincenal,
  );

  await page.goto(
    `${BASE}/reportes?tipo=empresa&empresa=${empresaPruebaId}&desde=2026-08-19&hasta=2026-08-22`,
  );
  await page.locator("table").first().waitFor();
  const tablaRangoLibre = (await page.locator("table").first().textContent()) ?? "";
  check(
    "16b. El reporte por empresa acepta un rango de fechas libre",
    tablaRangoLibre.includes("TOTAL EMPRESA") &&
      tablaRangoLibre.includes("$6,500.00") &&
      ((await page.locator("main").textContent()) ?? "").includes("Rango personalizado"),
    tablaRangoLibre.replace(/\s+/g, " ").slice(0, 200),
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
  await page.goto(
    `${BASE}/reportes?tipo=no-completados&desde=2026-08-01&hasta=2026-08-31`,
  );
  check(
    "18. Reporte de no completados",
    (await page.getByText("No completados del periodo").isVisible()) ?? false,
  );

  // 18b. Al entrar a reportes no hay filtros preseleccionados
  await page.goto(`${BASE}/reportes`);
  const sinFiltros = (await page.locator("main").textContent()) ?? "";
  check(
    "18b. Reportes abre sin filtros y sin reporte generado",
    sinFiltros.includes("Elige los filtros para generar el reporte") &&
      (await page.locator("table").count()) === 0 &&
      (await page.locator("#filter-desde").inputValue()) === "" &&
      (await page.locator("#filter-hasta").inputValue()) === "",
    sinFiltros.replace(/\s+/g, " ").slice(0, 200),
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
    (await page.getByRole("link", { name: "Configuración" }).isVisible()) &&
      (await page.getByRole("link", { name: "No completados" }).first().isVisible()),
  );

  // 20. La pantalla de login ya no muestra el acceso de demostración
  await cerrarSesion();
  const htmlLogin = (await page.locator("body").textContent()) ?? "";
  check(
    "20. El login no expone credenciales de demostración",
    !/demo123|Acceso de demostración/i.test(htmlLogin),
    htmlLogin.replace(/\s+/g, " ").slice(0, 160),
  );

  // 21. El capturista solo trabaja con capturas
  await iniciarSesion(USUARIO, "test1234");
  await page.goto(`${BASE}/configuracion`);
  check(
    "21a. Configuración redirige al capturista al inicio",
    new URL(page.url()).pathname === "/",
    page.url(),
  );
  await page.goto(`${BASE}/reportes?tipo=empresa&empresa=1`);
  check(
    "21b. Reportes redirige al capturista al inicio",
    new URL(page.url()).pathname === "/",
    page.url(),
  );
  const navegacionCapturista = (await page.locator("header").textContent()) ?? "";
  check(
    "21c. La navegación del capturista no ofrece reportes ni configuración",
    !/Reportes|Configuración/.test(navegacionCapturista) &&
      /Captura/.test(navegacionCapturista),
    navegacionCapturista.replace(/\s+/g, " "),
  );
  check(
    "21d. El capturista sí puede capturar y ver los no completados",
    (await page.getByRole("link", { name: "Nueva captura" }).isVisible()) &&
      (await page.getByRole("link", { name: "Ver no completados" }).isVisible()),
  );
  check(
    "21e. La barra superior muestra el rol",
    navegacionCapturista.includes("Capturista"),
  );
  await cerrarSesion();

  // 22. El administrador sí puede eliminar, con las protecciones del negocio
  await iniciarSesion(ADMIN_USER, ADMIN_PASSWORD);
  await page.goto(`${BASE}/configuracion`);
  check(
    "22a. La barra superior muestra el rol de administrador",
    (await page.locator("header").textContent())?.includes("Administrador") ?? false,
  );

  const nombresHospital = () =>
    page.getByRole("tabpanel").locator("tbody tr td:first-child").allTextContents();
  await page.getByRole("tab", { name: "Hospitales" }).click();
  const ascendente = await nombresHospital();
  await page
    .getByRole("tabpanel")
    .getByRole("columnheader")
    .first()
    .getByRole("button")
    .click();
  const descendente = await nombresHospital();
  check(
    "22b. Las columnas ordenan de forma ascendente y descendente",
    ascendente.length > 1 &&
      JSON.stringify(descendente) === JSON.stringify([...ascendente].reverse()),
    `${ascendente.slice(0, 3).join(", ")} | ${descendente.slice(0, 3).join(", ")}`,
  );

  await page.getByRole("tab", { name: "Usuarios" }).click();
  await page
    .getByRole("row", { name: `Ana Test ${sufijo}` })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await confirmarEliminacion();
  await page.getByRole("row", { name: `Ana Test ${sufijo}` }).waitFor({ state: "detached" });
  check("22c. El administrador elimina un usuario", true);

  await page.getByRole("tab", { name: "Empresas" }).click();
  await page
    .getByRole("row", { name: EMPRESA })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await confirmarEliminacion();
  check(
    "22d. No se elimina una empresa con hospitales",
    await esperaTexto(/No se puede eliminar: la empresa tiene/),
  );

  await page.getByRole("tab", { name: "Hospitales" }).click();
  await page
    .getByRole("row", { name: HOSPITAL })
    .getByRole("button", { name: "Eliminar" })
    .click();
  const avisoBorrado = await page.getByRole("alertdialog").innerText();
  check(
    "22e. El aviso de borrado dice cuántas capturas se pierden",
    /junto con sus \d+ capturas/.test(avisoBorrado),
    avisoBorrado.replace(/\n/g, " "),
  );
  await confirmarEliminacion();
  await page.getByRole("row", { name: HOSPITAL }).waitFor({ state: "detached" });
  check(
    "22f. Se elimina un hospital aunque tenga capturas",
    await esperaTexto(/Hospital eliminado junto con \d+ capturas/),
  );

  // La empresa ya se quedó sin hospitales: se elimina y la prueba no deja rastro.
  await page.getByRole("tab", { name: "Empresas" }).click();
  await page
    .getByRole("row", { name: EMPRESA })
    .getByRole("button", { name: "Eliminar" })
    .click();
  await confirmarEliminacion();
  await page.getByRole("row", { name: EMPRESA }).waitFor({ state: "detached" });
  check("22g. La prueba limpia la empresa que creó", true);

  // 23. Cierre de sesión y protección de rutas
  await page.setViewportSize({ width: 1400, height: 900 });
  await cerrarSesion();
  await page.goto(`${BASE}/reportes`);
  check(
    "23. Sin sesión, las rutas privadas redirigen al login",
    page.url().includes("/login"),
    page.url(),
  );

  const sinSesion = await page.request.get(`${BASE}${urlFoto}`, { maxRedirects: 0 });
  check(
    "23b. Las fotos de las capturas no son públicas",
    [301, 302, 307, 308, 401].includes(sinSesion.status()) &&
      !(sinSesion.headers()["content-type"] ?? "").startsWith("image/"),
    `${sinSesion.status()} · ${sinSesion.headers()["content-type"] ?? ""}`,
  );

  await page.goto(`${BASE}/pitch`);
  check(
    "23c. El pitch se puede ver sin sesión",
    page.url().includes("/pitch") &&
      (await page.getByRole("heading", { name: "Alimentos Sinaloa" }).isVisible()),
    page.url(),
  );

  const erroresRelevantes = consoleErrors.filter(
    (error) => !/favicon|Download the React DevTools/i.test(error),
  );
  check(
    "24. Sin errores de consola durante el flujo",
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
