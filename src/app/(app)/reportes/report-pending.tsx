import Link from "next/link";

import { ExportButtons } from "@/components/export-buttons";
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
import { formatShortDate, parseISODate } from "@/lib/dates";
import type { ExportPayload } from "@/lib/export-payload";
import { buildPendingReport } from "@/lib/reports";

export async function ReportPending({
  companyId,
  from,
  to,
}: {
  companyId?: number;
  from: string;
  to: string;
}) {
  const rows = await buildPendingReport({ companyId, from, to });

  const payload: ExportPayload = {
    fileName: `pendientes-${from}-${to}`,
    title: "Reporte de pendientes",
    subtitle: `Del ${from} al ${to}`,
    sheets: [
      {
        name: "Pendientes",
        columns: ["Fecha", "Empresa", "Hospital", "Estado", "Información faltante"],
        widths: [12, 18, 20, 14, 34],
        rows: rows.map((row) => [
          row.serviceDate,
          row.companyName,
          row.hospitalName,
          row.status === "sin_captura" ? "Sin captura" : "Incompleto",
          row.missing.join(", "),
        ]),
      },
    ],
    pdf: {
      summary: [{ label: "Pendientes", value: String(rows.length) }],
      sections: [
        {
          columns: ["Fecha", "Empresa", "Hospital", "Estado", "Falta"],
          rows: rows.map((row) => [
            row.serviceDate,
            row.companyName,
            row.hospitalName,
            row.status === "sin_captura" ? "Sin captura" : "Incompleto",
            row.missing.join(", "),
          ]),
        },
      ],
    },
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Pendientes del periodo</CardTitle>
          <CardDescription>
            Hospitales sin captura completa entre el {from} y el {to}.
          </CardDescription>
        </div>
        <ExportButtons payload={payload} disabled={rows.length === 0} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            No hay pendientes: todos los hospitales tienen su captura completa.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Falta</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.serviceDate}-${row.hospitalId}`}>
                    <TableCell className="whitespace-nowrap">
                      {formatShortDate(parseISODate(row.serviceDate))}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {row.companyName}
                    </TableCell>
                    <TableCell className="font-medium">{row.hospitalName}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.missing.join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/captura/${row.hospitalId}?fecha=${row.serviceDate}`}
                        >
                          Capturar
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
  );
}
