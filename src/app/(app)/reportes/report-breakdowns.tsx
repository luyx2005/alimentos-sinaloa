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
import { formatNumber } from "@/lib/calc";
import type { ExportPayload } from "@/lib/export-payload";
import { buildPatientsStaffReport, buildServiceReport } from "@/lib/reports";
import { slug } from "@/lib/slug";

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-8 text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export async function ReportPatientsStaff({
  companyId,
  hospitalId,
  from,
  to,
}: {
  companyId: number;
  hospitalId?: number;
  from: string;
  to: string;
}) {
  const report = await buildPatientsStaffReport({ companyId, hospitalId, from, to });
  if (!report) return <EmptyCard>Selecciona una empresa.</EmptyCard>;

  const { company, rows, totals } = report;

  const payload: ExportPayload = {
    fileName: `pacientes-personal-${slug(company.name)}-${from}-${to}`,
    title: `Pacientes vs personal · ${company.name}`,
    subtitle: `Del ${from} al ${to}`,
    sheets: [
      {
        name: "Pacientes vs personal",
        columns: ["Hospital", "Pacientes", "Personal", "Colaciones", "Total"],
        widths: [22, 12, 12, 12, 12],
        rows: [
          ...rows.map((row) => [
            row.hospital.name,
            row.patients,
            row.staff,
            row.snack,
            row.total,
          ]),
          ["TOTAL", totals.patients, totals.staff, totals.snack, totals.total],
        ],
      },
    ],
    pdf: {
      summary: [
        { label: "Pacientes", value: formatNumber(totals.patients) },
        { label: "Personal", value: formatNumber(totals.staff) },
        { label: "Total", value: formatNumber(totals.total) },
      ],
      sections: [
        {
          columns: ["Hospital", "Pacientes", "Personal", "Colaciones", "Total"],
          rows: [
            ...rows.map((row) => [
              row.hospital.name,
              row.patients,
              row.staff,
              row.snack,
              row.total,
            ]),
            ["TOTAL", totals.patients, totals.staff, totals.snack, totals.total],
          ],
        },
      ],
    },
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Pacientes vs personal</CardTitle>
          <CardDescription>
            La colación se muestra aparte porque no se divide entre pacientes y personal.
          </CardDescription>
        </div>
        <ExportButtons payload={payload} disabled={rows.length === 0} />
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Pacientes" value={formatNumber(totals.patients)} />
          <Metric label="Personal" value={formatNumber(totals.staff)} />
          <Metric label="Total (incluye colación)" value={formatNumber(totals.total)} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead>
                <TableHead className="text-right">Pacientes</TableHead>
                <TableHead className="text-right">Personal</TableHead>
                <TableHead className="text-right">Colaciones</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.hospital.id}>
                  <TableCell className="font-medium">{row.hospital.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.patients)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.staff)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.snack)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">TOTAL</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.patients)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.staff)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.snack)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export async function ReportService({
  companyId,
  hospitalId,
  from,
  to,
}: {
  companyId: number;
  hospitalId?: number;
  from: string;
  to: string;
}) {
  const report = await buildServiceReport({ companyId, hospitalId, from, to });
  if (!report) return <EmptyCard>Selecciona una empresa.</EmptyCard>;

  const { company, rows, totals } = report;

  const payload: ExportPayload = {
    fileName: `servicios-${slug(company.name)}-${from}-${to}`,
    title: `Reporte por servicio · ${company.name}`,
    subtitle: `Del ${from} al ${to}`,
    sheets: [
      {
        name: "Por servicio",
        columns: ["Hospital", "Desayuno", "Comida", "Cena", "Colación", "Total"],
        widths: [22, 12, 12, 12, 12, 12],
        rows: [
          ...rows.map((row) => [
            row.hospital.name,
            row.breakfast,
            row.lunch,
            row.dinner,
            row.snack,
            row.total,
          ]),
          [
            "TOTAL",
            totals.breakfast,
            totals.lunch,
            totals.dinner,
            totals.snack,
            totals.total,
          ],
        ],
      },
    ],
    pdf: {
      summary: [
        { label: "Desayuno", value: formatNumber(totals.breakfast) },
        { label: "Comida", value: formatNumber(totals.lunch) },
        { label: "Cena", value: formatNumber(totals.dinner) },
        { label: "Colación", value: formatNumber(totals.snack) },
      ],
      sections: [
        {
          columns: ["Hospital", "Desayuno", "Comida", "Cena", "Colación", "Total"],
          rows: [
            ...rows.map((row) => [
              row.hospital.name,
              row.breakfast,
              row.lunch,
              row.dinner,
              row.snack,
              row.total,
            ]),
            [
              "TOTAL",
              totals.breakfast,
              totals.lunch,
              totals.dinner,
              totals.snack,
              totals.total,
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
          <CardTitle className="text-base">Cantidades por servicio</CardTitle>
          <CardDescription>
            Desayuno, comida, cena y colación por hospital en el periodo.
          </CardDescription>
        </div>
        <ExportButtons payload={payload} disabled={rows.length === 0} />
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Metric label="Desayuno" value={formatNumber(totals.breakfast)} />
          <Metric label="Comida" value={formatNumber(totals.lunch)} />
          <Metric label="Cena" value={formatNumber(totals.dinner)} />
          <Metric label="Colación" value={formatNumber(totals.snack)} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospital</TableHead>
                <TableHead className="text-right">Desayuno</TableHead>
                <TableHead className="text-right">Comida</TableHead>
                <TableHead className="text-right">Cena</TableHead>
                <TableHead className="text-right">Colación</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.hospital.id}>
                  <TableCell className="font-medium">{row.hospital.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.breakfast)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.lunch)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.dinner)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.snack)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatNumber(row.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">TOTAL</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.breakfast)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.lunch)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.dinner)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.snack)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatNumber(totals.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
