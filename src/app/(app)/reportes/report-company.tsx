import { ExportButtons } from "@/components/export-buttons";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/calc";
import type { ExportPayload } from "@/lib/export-payload";
import { buildCompanyReport } from "@/lib/reports";
import { slug } from "@/lib/slug";

export async function ReportCompany({
  companyId,
  from,
  to,
  periodLabel,
}: {
  companyId: number;
  from: string;
  to: string;
  periodLabel?: string;
}) {
  const report = await buildCompanyReport({ companyId, from, to, periodLabel });

  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Selecciona una empresa para ver su reporte.
        </CardContent>
      </Card>
    );
  }

  const { company, period, rows, totals, records, pending } = report;
  const periodText = `${period.label} (${period.startDate} al ${period.endDate})`;

  const payload: ExportPayload = {
    fileName: `reporte-${slug(company.name)}-${period.startDate}-${period.endDate}`,
    title: `Reporte por empresa · ${company.name}`,
    subtitle: periodText,
    sheets: [
      {
        name: "Resumen",
        columns: [
          "Empresa",
          "Hospital",
          "Periodo",
          "Pacientes",
          "Personal",
          "Desayunos",
          "Comidas",
          "Cenas",
          "Colaciones",
          "Total",
          "Precio",
          "Importe",
        ],
        widths: [18, 20, 34, 12, 12, 12, 12, 12, 12, 12, 12, 14],
        rows: [
          ...rows.map((row) => [
            company.name,
            row.hospital.name,
            periodText,
            row.totals.totalPatients,
            row.totals.totalStaff,
            row.totals.breakfastTotal,
            row.totals.lunchTotal,
            row.totals.dinnerTotal,
            row.totals.snack,
            row.totals.totalServed,
            row.appliedPrice === null ? "Varios" : row.appliedPrice,
            row.totals.amount,
          ]),
          [
            company.name,
            "TOTAL EMPRESA",
            periodText,
            totals.totalPatients,
            totals.totalStaff,
            totals.breakfastTotal,
            totals.lunchTotal,
            totals.dinnerTotal,
            totals.snack,
            totals.totalServed,
            "",
            totals.amount,
          ],
        ],
      },
      {
        name: "Detalle",
        columns: [
          "Fecha",
          "Hospital",
          "Desayuno pacientes",
          "Desayuno personal",
          "Comida pacientes",
          "Comida personal",
          "Cena pacientes",
          "Cena personal",
          "Colación",
          "Total pacientes",
          "Total personal",
          "Total servido",
          "Precio aplicado",
          "Importe",
        ],
        widths: [12, 20, 18, 18, 18, 18, 16, 16, 12, 15, 15, 14, 15, 14],
        rows: records.map((record) => [
          record.serviceDate,
          record.hospitalName,
          record.breakfastPatients ?? "",
          record.breakfastStaff ?? "",
          record.lunchPatients ?? "",
          record.lunchStaff ?? "",
          record.dinnerPatients ?? "",
          record.dinnerStaff ?? "",
          record.snackQuantity ?? "",
          record.totals.totalPatients,
          record.totals.totalStaff,
          record.totals.totalServed,
          record.appliedPrice,
          record.totals.amount,
        ]),
      },
      {
        name: "Pendientes",
        columns: ["Fecha", "Hospital", "Estado", "Información faltante"],
        widths: [12, 20, 14, 34],
        rows: pending.map((row) => [
          row.serviceDate,
          row.hospitalName,
          row.status === "sin_captura" ? "Sin captura" : "Incompleto",
          row.missing.join(", "),
        ]),
      },
    ],
    pdf: {
      summary: [
        { label: "Pacientes", value: formatNumber(totals.totalPatients) },
        { label: "Personal", value: formatNumber(totals.totalStaff) },
        { label: "Total servido", value: formatNumber(totals.totalServed) },
        { label: "Importe", value: formatCurrency(totals.amount) },
      ],
      sections: [
        {
          columns: [
            "Hospital",
            "Pacientes",
            "Personal",
            "Desayunos",
            "Comidas",
            "Cenas",
            "Colaciones",
            "Total",
            "Precio",
            "Importe",
          ],
          rows: [
            ...rows.map((row) => [
              row.hospital.name,
              row.totals.totalPatients,
              row.totals.totalStaff,
              row.totals.breakfastTotal,
              row.totals.lunchTotal,
              row.totals.dinnerTotal,
              row.totals.snack,
              row.totals.totalServed,
              row.appliedPrice === null
                ? "Varios"
                : formatCurrency(row.appliedPrice),
              formatCurrency(row.totals.amount),
            ]),
            [
              "TOTAL EMPRESA",
              totals.totalPatients,
              totals.totalStaff,
              totals.breakfastTotal,
              totals.lunchTotal,
              totals.dinnerTotal,
              totals.snack,
              totals.totalServed,
              "",
              formatCurrency(totals.amount),
            ],
          ],
        },
      ],
    },
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{company.name}</CardTitle>
          <CardDescription>
            {period.label} · {period.startDate} al {period.endDate} ·{" "}
            {pending.length} pendientes en el periodo
          </CardDescription>
        </div>
        <ExportButtons payload={payload} disabled={records.length === 0} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta empresa todavía no tiene hospitales.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital</TableHead>
                  <TableHead className="text-right">Pacientes</TableHead>
                  <TableHead className="text-right">Personal</TableHead>
                  <TableHead className="text-right">Desayunos</TableHead>
                  <TableHead className="text-right">Comidas</TableHead>
                  <TableHead className="text-right">Cenas</TableHead>
                  <TableHead className="text-right">Colaciones</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.hospital.id}>
                    <TableCell className="font-medium">
                      {row.hospital.name}
                      {row.hospital.active ? "" : " (inactivo)"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.totalPatients)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.totalStaff)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.breakfastTotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.lunchTotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.dinnerTotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.snack)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatNumber(row.totals.totalServed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.appliedPrice === null
                        ? "Varios"
                        : formatCurrency(row.appliedPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.totals.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">TOTAL EMPRESA</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.totalPatients)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.totalStaff)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.breakfastTotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.lunchTotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.dinnerTotal)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.snack)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.totalServed)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(totals.amount)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

