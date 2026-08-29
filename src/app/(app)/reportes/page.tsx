import Link from "next/link";

import {
  QueryDate,
  QueryRangeShortcut,
  QuerySelect,
} from "@/components/query-filters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth";
import { isISODate, todayISO } from "@/lib/dates";
import { listCompanies, listHospitals } from "@/lib/data";
import { listRecentPeriods } from "@/lib/periods";
import { cn } from "@/lib/utils";
import { ReportCompany } from "@/app/(app)/reportes/report-company";
import { ReportHospital } from "@/app/(app)/reportes/report-hospital";
import {
  ReportPatientsStaff,
  ReportService,
} from "@/app/(app)/reportes/report-breakdowns";
import { ReportPending } from "@/app/(app)/reportes/report-pending";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "hospital", label: "Por hospital" },
  { key: "empresa", label: "Por empresa" },
  { key: "pacientes", label: "Pacientes vs personal" },
  { key: "servicio", label: "Por servicio" },
  { key: "no-completados", label: "No completados" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function MissingFilters({ items }: { items: string[] }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-medium">Elige los filtros para generar el reporte</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Falta seleccionar: {items.join(", ")}.
        </p>
      </CardContent>
    </Card>
  );
}

export default async function ReportesPage({ searchParams }: PageProps<"/reportes">) {
  await requireAdminSession();

  const params = await searchParams;
  const tipo = (TABS.find((tab) => tab.key === params.tipo)?.key ?? "hospital") as TabKey;

  // Nada viene preseleccionado: los reportes se generan cuando el usuario elige.
  const companies = await listCompanies();
  const empresaParam = Number(params.empresa ?? 0);
  const company = companies.find((item) => item.id === empresaParam);

  const hospitals = company ? await listHospitals({ companyId: company.id }) : [];
  const hospitalParam = Number(params.hospital ?? 0);
  const hospital = hospitals.find((item) => item.id === hospitalParam);

  const today = todayISO();
  // Los periodos de pago son solo un atajo para rellenar el rango de fechas.
  const periods = company ? listRecentPeriods(company, today, 12) : [];

  const desde = isISODate(params.desde as string) ? (params.desde as string) : "";
  const hasta = isISODate(params.hasta as string) ? (params.hasta as string) : "";
  const rango = desde && hasta;
  const matchingPeriod = periods.find(
    (item) => item.startDate === desde && item.endDate === hasta,
  );

  const companyOptions = companies.map((item) => ({
    value: String(item.id),
    label: item.active ? item.name : `${item.name} (inactiva)`,
  }));
  const hospitalOptions = hospitals.map((item) => ({
    value: String(item.id),
    label: item.active ? item.name : `${item.name} (inactivo)`,
  }));

  const buildTabHref = (key: TabKey) => {
    const query = new URLSearchParams();
    query.set("tipo", key);
    if (company) query.set("empresa", String(company.id));
    if (hospital && key !== "empresa" && key !== "no-completados") {
      query.set("hospital", String(hospital.id));
    }
    if (desde) query.set("desde", desde);
    if (hasta) query.set("hasta", hasta);
    return `/reportes?${query.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Elige los filtros para consultar totales por hospital, por empresa y por
          servicio, y expórtalos a Excel o PDF.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={buildTabHref(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tipo === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            {tipo === "empresa"
              ? "Elige la empresa y el rango de fechas. Los periodos de pago son un atajo para rellenar las fechas, pero puedes consultar cualquier rango."
              : "Elige la empresa y el rango de fechas de servicio."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <QuerySelect
              param="empresa"
              value={company ? String(company.id) : ""}
              label="Empresa"
              options={companyOptions}
              placeholder="Selecciona una empresa"
              resetParams={["hospital", "periodo"]}
              allLabel={tipo === "no-completados" ? "Todas las empresas" : undefined}
            />

            {tipo === "hospital" || tipo === "pacientes" || tipo === "servicio" ? (
              <QuerySelect
                param="hospital"
                value={hospital ? String(hospital.id) : ""}
                label="Hospital"
                options={hospitalOptions}
                placeholder={
                  company ? "Selecciona un hospital" : "Elige primero la empresa"
                }
                allLabel={tipo === "hospital" ? undefined : "Todos los hospitales"}
                disabled={hospitals.length === 0}
              />
            ) : null}

            <QueryDate param="desde" value={desde} label="Fecha inicial" />
            <QueryDate param="hasta" value={hasta} label="Fecha final" />

            {tipo === "empresa" ? (
              <QueryRangeShortcut
                label="Periodo de pago (atajo)"
                options={periods.map((item) => ({
                  value: item.startDate,
                  label: item.label,
                  from: item.startDate,
                  to: item.endDate,
                }))}
                from={desde}
                to={hasta}
                placeholder={
                  company ? "Selecciona un periodo" : "Elige primero la empresa"
                }
                disabled={periods.length === 0}
                className="sm:w-auto"
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Crea una empresa en Configuración para generar reportes.
          </CardContent>
        </Card>
      ) : tipo === "hospital" ? (
        company && hospital && rango ? (
          <ReportHospital hospitalId={hospital.id} from={desde} to={hasta} />
        ) : (
          <MissingFilters
            items={[
              ...(company ? [] : ["empresa"]),
              ...(hospital ? [] : ["hospital"]),
              ...(rango ? [] : ["rango de fechas"]),
            ]}
          />
        )
      ) : tipo === "empresa" ? (
        company && rango ? (
          <ReportCompany
            companyId={company.id}
            from={desde}
            to={hasta}
            periodLabel={matchingPeriod?.label ?? "Rango personalizado"}
          />
        ) : (
          <MissingFilters
            items={[
              ...(company ? [] : ["empresa"]),
              ...(rango ? [] : ["rango de fechas"]),
            ]}
          />
        )
      ) : tipo === "pacientes" || tipo === "servicio" ? (
        company && rango ? (
          tipo === "pacientes" ? (
            <ReportPatientsStaff
              companyId={company.id}
              hospitalId={hospital?.id}
              from={desde}
              to={hasta}
            />
          ) : (
            <ReportService
              companyId={company.id}
              hospitalId={hospital?.id}
              from={desde}
              to={hasta}
            />
          )
        ) : (
          <MissingFilters
            items={[...(company ? [] : ["empresa"]), ...(rango ? [] : ["rango de fechas"])]}
          />
        )
      ) : rango ? (
        <ReportPending companyId={company?.id} from={desde} to={hasta} />
      ) : (
        <MissingFilters items={["rango de fechas"]} />
      )}
    </div>
  );
}
