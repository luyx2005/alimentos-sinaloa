# Comedores Hospitalarios

Aplicación web para controlar las cantidades de alimentos servidos por hospital: captura
diaria, cálculo automático de importes, reportes por hospital y por empresa, y exportación
a Excel y PDF.

## Qué resuelve

- Un capturista registra, por **hospital y fecha de servicio**, cuántos desayunos, comidas
  y cenas se sirvieron (separando **pacientes** y **personal**) y cuántas **colaciones**.
- El sistema calcula totales e importes usando el precio del hospital.
- Al guardar una captura se copia el precio vigente del hospital en el registro
  (`applied_price`), de modo que un cambio de precio posterior **no altera** los importes
  históricos.
- Los reportes se agrupan por el periodo de pago de cada empresa: **semanal**
  (lunes a domingo) o **quincenal** (1–15 y 16 al último día del mes).

## Reglas de negocio implementadas

- Cada hospital pertenece a una sola empresa y tiene su propio precio, en pesos mexicanos.
- El mismo precio aplica a desayuno, comida, cena y colación, sin importar si es paciente
  o personal.
- La **colación es independiente**: no se suma a pacientes ni a personal, pero sí al total
  servido y por lo tanto al importe.
- Un solo registro activo por hospital + fecha de servicio (índice único parcial en
  PostgreSQL, más validación en la aplicación).
- **Cero es un valor válido**: "no capturado" (campo vacío) y "0" son cosas distintas. Un
  registro está completo cuando tiene datos de desayuno, comida, cena y colación.
- Las capturas se pueden modificar y eliminar. La eliminación es **lógica**
  (`active = false`); los registros eliminados no aparecen en los reportes.
- Se puede capturar cualquier fecha de servicio: el sistema no bloquea fechas.
- Todos los usuarios autenticados tienen los mismos permisos.

### Cálculos

```
desayuno total      = desayuno_pacientes + desayuno_personal
comida total        = comida_pacientes   + comida_personal
cena total          = cena_pacientes     + cena_personal
servicios principales = desayuno + comida + cena
total pacientes     = desayuno_pacientes + comida_pacientes + cena_pacientes
total personal      = desayuno_personal  + comida_personal  + cena_personal
total servido       = servicios principales + colación
importe             = total servido * precio_aplicado
```

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- PostgreSQL + Prisma ORM 7 (driver adapter `@prisma/adapter-pg`)
- Autenticación propia: contraseñas con bcrypt y sesión JWT firmada en cookie httpOnly
- SheetJS (`xlsx`) para Excel y jsPDF + autoTable para PDF

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# edita DATABASE_URL y AUTH_SECRET

# 3. Base de datos: tablas + datos iniciales
npm run db:migrate
npm run db:seed

# 4. Servidor de desarrollo
npm run dev
```

La aplicación queda en `http://localhost:3000` (el script de desarrollo acepta
`-- --port 43137` si necesitas otro puerto).

### Variables de entorno

| Variable       | Descripción                                                  |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL.                            |
| `AUTH_SECRET`  | Cadena aleatoria para firmar las sesiones (mínimo 16 chars). |

### Datos iniciales

El seed crea dos empresas (Empresa A, semanal, con 4 hospitales; Empresa B, quincenal, con
6 hospitales), precios de ejemplo, capturas de los últimos días para poder ver reportes, y
un usuario de demostración:

```
usuario:    demo
contraseña: demo123
```

**Cambia estas credenciales antes de usar la aplicación en producción.**

## Scripts

| Script                | Qué hace                                    |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo.                     |
| `npm run build`       | Build de producción.                        |
| `npm start`           | Servidor de producción.                     |
| `npm run lint`        | ESLint.                                     |
| `npm run typecheck`   | TypeScript sin emitir.                      |
| `npm test`            | Pruebas de cálculos y de periodos.          |
| `npm run test:e2e`    | Prueba del flujo completo en el navegador.  |
| `npm run db:migrate`  | Aplica migraciones en desarrollo.           |
| `npm run db:deploy`   | Aplica migraciones en producción.           |
| `npm run db:seed`     | Carga los datos iniciales.                  |
| `npm run db:studio`   | Prisma Studio.                              |

### Pruebas

`npm test` verifica los cálculos (incluido que la colación no se sume a pacientes ni a
personal y que cero no signifique pendiente) y el cálculo de periodos semanales y
quincenales, con cambios de mes y años bisiestos.

`npm run test:e2e` recorre el flujo completo en Chrome con Playwright: login, alta de
empresa, hospital y usuario, captura con cálculos, captura en ceros, duplicado, edición,
conservación del precio histórico, eliminación lógica, pendientes, los cinco reportes,
descarga de Excel y PDF, vista móvil y cierre de sesión. Requiere el servidor corriendo
(`BASE_URL` apunta a `http://127.0.0.1:43137` por omisión) y **crea datos de prueba en la
base**, así que conviene ejecutarlo contra una base desechable.

## Estructura

```
prisma/
  schema.prisma        Modelos: companies, hospitals, users, daily_records
  migrations/          SQL versionado (incluye el índice único parcial)
  seed.ts              Datos iniciales
src/
  app/
    login/             Pantalla de acceso
    (app)/             Rutas protegidas
      page.tsx         Inicio: accesos rápidos y pendientes del último día
      captura/         Lista por fecha/empresa y formulario de captura
      pendientes/      Hospitales sin captura completa
      reportes/        Hospital, empresa, pacientes vs personal, servicio, pendientes
      configuracion/   Empresas, hospitales y usuarios
  components/          UI compartida (shadcn/ui en components/ui)
  lib/
    calc.ts            Cálculos de totales, importes y estado de captura
    periods.ts         getPeriodForDate: semanal y quincenal
    data.ts            Consultas y serialización a DTOs
    reports.ts         Construcción de los reportes
    auth.ts            Sesión, hash y verificación de credenciales
  proxy.ts             Protege las rutas privadas
```

## Pantallas

- **Inicio**: accesos rápidos (nueva captura, pendientes, reportes, configuración) y una
  tarjeta con los pendientes del último día.
- **Captura**: fecha de servicio + empresa, lista de hospitales activos con su estado, y
  un formulario optimizado para captura rápida con el resumen calculado en vivo.
- **Pendientes**: por fecha y empresa, distinguiendo "sin captura" de "incompleto" e
  indicando qué servicios faltan.
- **Reportes**: cinco reportes con filtros y botones de Exportar Excel / Exportar PDF. El
  Excel del reporte por empresa trae tres hojas: Resumen, Detalle y Pendientes.
- **Configuración**: alta, edición y activación/desactivación de empresas, hospitales
  (con su precio) y capturistas.

## Seguridad

- Contraseñas con hash bcrypt; nunca se guardan en texto plano.
- Sesión firmada (HS256) en cookie `httpOnly`, `sameSite=lax`, y `secure` en producción.
- Todas las rutas privadas se protegen antes de renderizar, y cada acción de servidor
  vuelve a verificar la sesión.
