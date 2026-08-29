# Alimentos Sinaloa

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
- Cada empresa tiene un periodo de pago, **semanal** (lunes a domingo) o **quincenal**
  (1–15 y 16 al último día del mes), que se ofrece como atajo en los reportes sin limitar
  la consulta a esos rangos.

## Reglas de negocio implementadas

- Cada hospital pertenece a una sola empresa, se ubica en un estado de la República
  Mexicana y tiene su propio precio, en pesos mexicanos.
- El mismo precio aplica a todo lo servido, sin importar si es paciente, personal o
  colación.
- La **colación se captura dentro de cada servicio** (desayuno, comida y cena), junto a
  pacientes y personal: no es un servicio aparte. No se suma a pacientes ni a personal,
  pero sí al total de su servicio y por lo tanto al importe.
- Un solo registro activo por hospital + fecha de servicio (índice único parcial en
  PostgreSQL, más validación en la aplicación).
- **Cero es un valor válido**: "no capturado" (campo vacío) y "0" son cosas distintas. Un
  registro está completo cuando desayuno, comida y cena tienen sus tres cantidades
  (pacientes, personal y colación).
- Cada servicio admite **una foto opcional** (la charola, la lista firmada, lo que
  documente el turno) y toda captura nueva exige la **foto del reporte diario**. Las
  capturas registradas antes de esta función se pueden seguir corrigiendo sin foto: la
  pantalla la pide, pero no bloquea el guardado.
- Las capturas se pueden modificar y eliminar. La eliminación es **lógica**
  (`active = false`); los registros eliminados no aparecen en los reportes.
- Se puede capturar cualquier fecha de servicio: el sistema no bloquea fechas.
- Hay dos roles: **capturista** y **administrador**. El capturista solo ve Inicio, Captura
  y No completados; Reportes y Configuración son exclusivos de los administradores, tanto en la
  navegación como al entrar por URL directa. Siempre debe quedar al menos un administrador
  activo.
- Empresas, hospitales y usuarios se pueden eliminar de forma definitiva. Al eliminar un
  hospital se borra también su historial de capturas y las fotos de esas capturas, y el
  aviso de confirmación dice cuántas se van a perder; si solo quieres dejar de usarlo,
  desactívalo. No se borra una empresa que todavía tiene hospitales (elimínalos o
  desactívala) ni el usuario con el que estás trabajando.

### Cálculos

```
desayuno total  = desayuno_pacientes + desayuno_personal + desayuno_colación
comida total    = comida_pacientes   + comida_personal   + comida_colación
cena total      = cena_pacientes     + cena_personal     + cena_colación
total pacientes = desayuno_pacientes + comida_pacientes  + cena_pacientes
total personal  = desayuno_personal  + comida_personal   + cena_personal
total colaciones = desayuno_colación + comida_colación   + cena_colación
total servido   = desayuno total + comida total + cena total
importe         = total servido * precio_aplicado
```

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui
- PostgreSQL + Prisma ORM 7 (driver adapter `@prisma/adapter-pg`)
- Autenticación propia: contraseñas con bcrypt, sesión JWT firmada en cookie httpOnly y
  dos roles (administrador y capturista)
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

### Fotos de las capturas

Las imágenes se guardan en disco, fuera de `public/`, dentro de la carpeta indicada por
`UPLOADS_DIR` (por omisión `./uploads`, ignorada por git). En la base solo se guarda la
ruta relativa. Se sirven por `GET /api/capturas/[id]/imagen/[campo]`, que exige sesión
iniciada: un enlace directo sin cookie no devuelve la imagen. Se aceptan JPG, PNG, WEBP y
HEIC de hasta 8 MB; al reemplazar una foto se borra la anterior del disco.

Para respaldar el sistema hay que copiar la base de datos **y** esa carpeta.

### Variables de entorno

| Variable       | Descripción                                                  |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL.                            |
| `AUTH_SECRET`  | Cadena aleatoria para firmar las sesiones (mínimo 16 chars). |
| `UPLOADS_DIR`  | Carpeta de las fotos de las capturas (por omisión `./uploads`). |

### Datos iniciales

El seed crea dos empresas (Empresa A, semanal, con 4 hospitales; Empresa B, quincenal, con
6 hospitales), sus estados y precios de ejemplo, capturas de los últimos días para poder
ver reportes, y un usuario **administrador** inicial:

```
usuario:    demo
contraseña: demo123
```

**Cambia estas credenciales en cuanto entres por primera vez.** La pantalla de acceso no
muestra ninguna credencial: desde Configuración → Usuarios puedes renombrar esa cuenta,
cambiarle la contraseña y dar de alta al resto del equipo con el rol que corresponda.

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
personal y que cero no signifique falta de captura) y el cálculo de periodos semanales y
quincenales, con cambios de mes y años bisiestos.

`npm run test:e2e` recorre el flujo completo en Chrome con Playwright: login, alta de
empresa, hospital y usuario, captura con cálculos, captura en ceros, duplicado, edición,
conservación del precio histórico, eliminación lógica, no completados, los cinco reportes,
descarga de Excel y PDF, alcance del rol capturista, ordenamiento de columnas, borrado con
sus protecciones, vista móvil y cierre de sesión. Requiere el servidor corriendo (`BASE_URL`, por omisión
`http://127.0.0.1:43137`) y credenciales de un administrador (`E2E_USER` y `E2E_PASSWORD`,
por omisión las del seed). **Crea datos de prueba en la base**, así que conviene
ejecutarlo contra una base desechable.

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
      page.tsx         Inicio: accesos rápidos y no completados del último día
      captura/         Lista por fecha/empresa y formulario de captura
      no-completados/  Hospitales sin captura completa
      reportes/        Hospital, empresa, pacientes vs personal, servicio, no completados
      configuracion/   Empresas, hospitales y usuarios
    pitch/             Deck de presentación (público)
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

- **Inicio**: accesos rápidos (nueva captura, no completados, reportes, configuración) y
  una tarjeta con los no completados del último día.
- **Captura**: fecha de servicio + empresa, lista de hospitales activos con su estado, y
  un formulario optimizado para captura rápida con el resumen calculado en vivo.
- **No completados**: por fecha y empresa, distinguiendo "sin captura" de "incompleto" e
  indicando qué servicios faltan.
- **Reportes**: cinco reportes con filtros y botones de Exportar Excel / Exportar PDF. El
  Excel del reporte por empresa trae tres hojas: Resumen, Detalle y No completados. Al
  entrar a Reportes no hay ningún filtro preseleccionado: el reporte se genera cuando
  eliges empresa, hospital y fechas. Todos los reportes, incluido el de empresa, usan un
  rango de fechas libre; los periodos de pago de la empresa aparecen como atajo para
  rellenar ese rango.
- **Configuración**: alta, edición y activación/desactivación de empresas, hospitales
  (con su estado y precio) y usuarios. Toda la sección requiere rol de administrador y
  cada columna se puede ordenar de forma ascendente o descendente desde su encabezado.
- **Pitch** (`/pitch`): diapositivas de presentación, públicas, con flechas o clic para
  avanzar. Desde el navegador se pueden imprimir a PDF.

## Seguridad

- Contraseñas con hash bcrypt; nunca se guardan en texto plano.
- Sesión firmada (HS256) en cookie `httpOnly`, `sameSite=lax`, y `secure` en producción.
- Todas las rutas privadas se protegen antes de renderizar, y cada acción de servidor
  vuelve a verificar la sesión y el rol; ocultar los botones en la interfaz no es la única
  defensa.
