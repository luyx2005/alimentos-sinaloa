import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";

import { QueryDate, QuerySelect } from "@/components/query-filters";
import { StatusBadge } from "@/components/status-badge";
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
import { SERVICE_LABELS } from "@/lib/calc";
import { addDaysISO, formatLongDate, isISODate, parseISODate, todayISO } from "@/lib/dates";
import { hospitalStatusesForDate, listCompanies } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PendientesPage({
  searchParams,
}: PageProps<"/pendientes">) {
  const params = await searchParams;
  const companies = await listCompanies(true);

  const fecha = isISODate(params.fecha as string)
    ? (params.fecha as string)
    : addDaysISO(todayISO(), -1);
  const empresaParam = Number(params.empresa ?? 0);
  const companyId = companies.find((c) => c.id === empresaParam)?.id;

  const statuses = await hospitalStatusesForDate({ companyId, serviceDate: fecha });
  const pending = statuses.filter((item) => item.status !== "completo");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pendientes</h1>
        <p className="text-muted-foreground">
          Hospitales que todavía no tienen captura completa para la fecha seleccionada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
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
              allLabel="Todas las empresas"
              options={companies.map((company) => ({
                value: String(company.id),
                label: company.name,
              }))}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto sm:pb-2">
              <CircleAlert className="size-4" />
              {pending.length} pendientes de {statuses.length} hospitales
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle</CardTitle>
          <CardDescription>
            &quot;Pendiente&quot; significa que no existe captura; &quot;Incompleto&quot;
            que faltan servicios por capturar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay hospitales activos para esta selección.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hospital</TableHead>
                    <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Información faltante</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses.map(({ hospital, record, status, missing }) => (
                    <TableRow key={hospital.id}>
                      <TableCell className="font-medium">{hospital.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {hospital.companyName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {status === "completo"
                          ? "—"
                          : missing.map((key) => SERVICE_LABELS[key]).join(", ")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/captura/${hospital.id}?fecha=${fecha}`}>
                            {record ? "Completar" : "Capturar"}
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
