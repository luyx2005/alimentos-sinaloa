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
import { formatShortDate, parseISODate } from "@/lib/dates";
import type { ExportPayload } from "@/lib/export-payload";
import { buildHospitalReport } from "@/lib/reports";
import { slug } from "@/lib/slug";

export async function ReportHospital({
  hospitalId,
  from,
  to,
}: {
  hospitalId: number;
  from: string;
  to: string;
}) {
  const report = await buildHospitalReport({ hospitalId, from, to });

  if (!report) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Selecciona un hospital para ver su reporte.
        </CardContent>
      </Card>
    );
  }

  const { hospital, rows, totals } = report;

  const payload: ExportPayload = {
    fileName: `reporte-${slug(hospital.name)}-${from}-${to}`,
    title: `Reporte por hospital · ${hospital.name}`,
    subtitle: `${hospital.companyName} · ${hospital.state} · del ${from} al ${to}`,
    sheets: [
      {
        name: "Detalle",
        columns: [
          "Fecha",
          "Desayuno",
          "Comida",
          "Cena",
          "Colación",
          "Pacientes",
          "Personal",
          "Total servido",
          "Precio",
          "Importe",
        ],
        rows: [
          ...rows.map((row) => [
            row.serviceDate,
            row.totals.breakfastTotal,
            row.totals.lunchTotal,
            row.totals.dinnerTotal,
            row.totals.snack,
            row.totals.totalPatients,
            row.totals.totalStaff,
            row.totals.totalServed,
            row.appliedPrice,
            row.totals.amount,
          ]),
          [
            "TOTAL",
            totals.breakfastTotal,
            totals.lunchTotal,
            totals.dinnerTotal,
            totals.snack,
            totals.totalPatients,
            totals.totalStaff,
            totals.totalServed,
            "",
            totals.amount,
          ],
        ],
      },
    ],
    pdf: {
      summary: [
        { label: "Total servido", value: formatNumber(totals.totalServed) },
        { label: "Pacientes", value: formatNumber(totals.totalPatients) },
        { label: "Personal", value: formatNumber(totals.totalStaff) },
        { label: "Importe", value: formatCurrency(totals.amount) },
      ],
      sections: [
        {
          columns: [
            "Fecha",
            "Desayuno",
            "Comida",
            "Cena",
            "Colación",
            "Pacientes",
            "Personal",
            "Total",
            "Precio",
            "Importe",
          ],
          rows: [
            ...rows.map((row) => [
              row.serviceDate,
              row.totals.breakfastTotal,
              row.totals.lunchTotal,
              row.totals.dinnerTotal,
              row.totals.snack,
              row.totals.totalPatients,
              row.totals.totalStaff,
              row.totals.totalServed,
              formatCurrency(row.appliedPrice),
              formatCurrency(row.totals.amount),
            ]),
            [
              "TOTAL",
              totals.breakfastTotal,
              totals.lunchTotal,
              totals.dinnerTotal,
              totals.snack,
              totals.totalPatients,
              totals.totalStaff,
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
          <CardTitle className="text-base">{hospital.name}</CardTitle>
          <CardDescription>
            {hospital.companyName} · {hospital.state} · {rows.length}{" "}
            {rows.length === 1 ? "día capturado" : "días capturados"}
          </CardDescription>
        </div>
        <ExportButtons payload={payload} disabled={rows.length === 0} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay capturas en el rango de fechas seleccionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Desayuno</TableHead>
                  <TableHead className="text-right">Comida</TableHead>
                  <TableHead className="text-right">Cena</TableHead>
                  <TableHead className="text-right">Colación</TableHead>
                  <TableHead className="text-right">Pacientes</TableHead>
                  <TableHead className="text-right">Personal</TableHead>
                  <TableHead className="text-right">Total servido</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatShortDate(parseISODate(row.serviceDate))}
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
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.totalPatients)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.totals.totalStaff)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatNumber(row.totals.totalServed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.appliedPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.totals.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">TOTAL</TableCell>
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
                    {formatNumber(totals.totalPatients)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatNumber(totals.totalStaff)}
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

