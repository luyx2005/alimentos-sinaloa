import Link from "next/link";

import { QueryDate, QuerySelect } from "@/components/query-filters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isISODate, todayISO } from "@/lib/dates";
import { listCompanies, listHospitals } from "@/lib/data";
import { getPeriodForDate, listRecentPeriods } from "@/lib/periods";
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
  { key: "pendientes", label: "Pendientes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function ReportesPage({ searchParams }: PageProps<"/reportes">) {
  const params = await searchParams;
  const tipo = (TABS.find((tab) => tab.key === params.tipo)?.key ?? "hospital") as TabKey;

  const companies = await listCompanies();
  const empresaParam = Number(params.empresa ?? 0);
  const company =
    companies.find((c) => c.id === empresaParam) ??
    companies.find((c) => c.active) ??
    companies[0];

  const hospitals = company
    ? await listHospitals({ companyId: company.id })
    : [];
  const hospitalParam = Number(params.hospital ?? 0);
  const hospital =
    hospitals.find((h) => h.id === hospitalParam) ??
    (tipo === "hospital" ? hospitals[0] : undefined);

  const today = todayISO();
  const periods = company ? listRecentPeriods(company, today, 12) : [];
  const periodParam = String(params.periodo ?? "");
  const period =
    periods.find((item) => item.startDate === periodParam) ??
    (company ? getPeriodForDate(company, today) : undefined);

  const defaultFrom = period?.startDate ?? today;
  const defaultTo = period?.endDate ?? today;
  const desde = isISODate(params.desde as string) ? (params.desde as string) : defaultFrom;
  const hasta = isISODate(params.hasta as string) ? (params.hasta as string) : defaultTo;

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
    // El reporte de pendientes admite "todas las empresas", así que no se fuerza el filtro.
    if (company && (key !== "pendientes" || empresaParam)) {
      query.set("empresa", String(company.id));
    }
    if (hospital && key !== "empresa" && key !== "pendientes") {
      query.set("hospital", String(hospital.id));
    }
    if (key === "empresa") {
      if (period) query.set("periodo", period.startDate);
    } else {
      query.set("desde", desde);
      query.set("hasta", hasta);
    }
    return `/reportes?${query.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Consulta totales por hospital, por empresa y por servicio, y expórtalos a Excel
          o PDF.
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
              ? "El periodo se calcula automáticamente según la periodicidad de la empresa."
              : "Selecciona el rango de fechas de servicio."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <QuerySelect
              param="empresa"
              value={
                tipo === "pendientes"
                  ? empresaParam
                    ? String(empresaParam)
                    : ""
                  : company
                    ? String(company.id)
                    : ""
              }
              label="Empresa"
              options={companyOptions}
              resetParams={["hospital", "periodo"]}
              allLabel={tipo === "pendientes" ? "Todas las empresas" : undefined}
            />

            {tipo === "hospital" || tipo === "pacientes" || tipo === "servicio" ? (
              <QuerySelect
                param="hospital"
                value={hospital ? String(hospital.id) : ""}
                label="Hospital"
                options={hospitalOptions}
                allLabel={tipo === "hospital" ? undefined : "Todos los hospitales"}
                disabled={hospitals.length === 0}
              />
            ) : null}

            {tipo === "empresa" ? (
              <QuerySelect
                param="periodo"
                value={period ? period.startDate : ""}
                label="Periodo"
                options={periods.map((item) => ({
                  value: item.startDate,
                  label: item.label,
                }))}
                className="sm:w-auto"
              />
            ) : (
              <>
                <QueryDate param="desde" value={desde} label="Fecha inicial" />
                <QueryDate param="hasta" value={hasta} label="Fecha final" />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!company ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Crea una empresa en Configuración para generar reportes.
          </CardContent>
        </Card>
      ) : tipo === "hospital" ? (
        hospital ? (
          <ReportHospital hospitalId={hospital.id} from={desde} to={hasta} />
        ) : (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Esta empresa todavía no tiene hospitales.
            </CardContent>
          </Card>
        )
      ) : tipo === "empresa" && period ? (
        <ReportCompany
          companyId={company.id}
          from={period.startDate}
          to={period.endDate}
          periodLabel={period.label}
        />
      ) : tipo === "pacientes" ? (
        <ReportPatientsStaff
          companyId={company.id}
          hospitalId={hospitalParam || undefined}
          from={desde}
          to={hasta}
        />
      ) : tipo === "servicio" ? (
        <ReportService
          companyId={company.id}
          hospitalId={hospitalParam || undefined}
          from={desde}
          to={hasta}
        />
      ) : (
        <ReportPending
          companyId={empresaParam || undefined}
          from={desde}
          to={hasta}
        />
      )}
    </div>
  );
}
