import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";

import { CaptureForm } from "@/app/(app)/captura/[hospitalId]/capture-form";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/calc";
import { addDaysISO, formatLongDate, isISODate, parseISODate, todayISO } from "@/lib/dates";
import { getHospital, getRecord } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CapturaHospitalPage({
  params,
  searchParams,
}: PageProps<"/captura/[hospitalId]">) {
  const { hospitalId } = await params;
  const query = await searchParams;

  const hospital = await getHospital(Number(hospitalId));
  if (!hospital) notFound();

  const fecha = isISODate(query.fecha as string)
    ? (query.fecha as string)
    : addDaysISO(todayISO(), -1);

  const record = await getRecord(hospital.id, fecha);
  const backHref = `/captura?fecha=${fecha}&empresa=${hospital.companyId}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Volver a hospitales
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{hospital.name}</h1>
            <p className="capitalize text-muted-foreground">
              {hospital.companyName} · {hospital.state} ·{" "}
              {formatLongDate(parseISODate(fecha))}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={record ? record.status : "sin_captura"} />
            <span className="text-sm text-muted-foreground">
              Precio {formatCurrency(record ? record.appliedPrice : hospital.price)}
            </span>
          </div>
        </div>

        {record ? (
          <p className="flex items-start gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            Ya existe una captura para este hospital y fecha. Estás editándola; el precio
            aplicado original se conserva.
          </p>
        ) : null}
      </div>

      <CaptureForm
        hospital={hospital}
        serviceDate={fecha}
        record={record}
        backHref={backHref}
      />
    </div>
  );
}
