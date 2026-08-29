import Link from "next/link";
import { ArrowRight, CalendarDays, CircleCheck, CircleDashed } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { QueryDate, QuerySelect } from "@/components/query-filters";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SERVICE_LABELS, formatCurrency, formatNumber } from "@/lib/calc";
import { formatLongDate, isISODate, parseISODate, todayISO, addDaysISO } from "@/lib/dates";
import { hospitalStatusesForDate, listCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CapturaPage({ searchParams }: PageProps<"/captura">) {
  const params = await searchParams;
  const companies = await listCompanies(true);

  const fecha = isISODate(params.fecha as string)
    ? (params.fecha as string)
    : addDaysISO(todayISO(), -1);
  const empresaParam = Number(params.empresa ?? 0);
  const companyId =
    companies.find((c) => c.id === empresaParam)?.id ?? companies[0]?.id ?? 0;

  const statuses = companyId
    ? await hospitalStatusesForDate({ companyId, serviceDate: fecha })
    : [];
  const completos = statuses.filter((item) => item.status === "completo").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Captura diaria</h1>
        <p className="text-muted-foreground">
          Elige la fecha de servicio y la empresa, y captura hospital por hospital.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-muted-foreground" />
            Fecha y empresa
          </CardTitle>
          <CardDescription className="capitalize">
            {formatLongDate(parseISODate(fecha))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <QueryDate param="fecha" value={fecha} label="Fecha de servicio" />
            <QuerySelect
              param="empresa"
              value={companyId ? String(companyId) : ""}
              label="Empresa"
              options={companies.map((company) => ({
                value: String(company.id),
                label: company.name,
              }))}
              placeholder="Selecciona una empresa"
            />
            {statuses.length > 0 ? (
              <p className="text-sm text-muted-foreground sm:ml-auto sm:pb-2">
                {completos} de {statuses.length} hospitales completos
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hospitales</CardTitle>
          <CardDescription>
            Solo se muestran hospitales activos de la empresa seleccionada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay empresas activas. Crea una en Configuración.
            </p>
          ) : statuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta empresa no tiene hospitales activos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hospital</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell">Falta</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Total servido
                    </TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      Importe
                    </TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses.map(({ hospital, record, status, missing }) => (
                    <TableRow key={hospital.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {status === "completo" ? (
                            <CircleCheck className="size-4 text-emerald-600" />
                          ) : (
                            <CircleDashed className="size-4 text-muted-foreground" />
                          )}
                          {hospital.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {status === "completo"
                          ? "—"
                          : missing.map((key) => SERVICE_LABELS[key]).join(", ")}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {record ? formatNumber(record.totals.totalServed) : "—"}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {record ? formatCurrency(record.totals.amount) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant={record ? "outline" : "default"}>
                          <Link
                            href={`/captura/${hospital.id}?fecha=${fecha}`}
                          >
                            {record ? "Editar" : "Capturar"}
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
