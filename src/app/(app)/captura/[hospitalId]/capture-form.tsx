"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Save, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { deleteRecord, saveRecord } from "@/app/(app)/captura/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { computeTotals, formatCurrency, formatNumber } from "@/lib/calc";
import type { HospitalDTO, RecordDTO } from "@/lib/data";

type FieldName =
  | "breakfastPatients"
  | "breakfastStaff"
  | "breakfastSnack"
  | "lunchPatients"
  | "lunchStaff"
  | "lunchSnack"
  | "dinnerPatients"
  | "dinnerStaff"
  | "dinnerSnack";

type FormValues = Record<FieldName, string>;

const EMPTY: FormValues = {
  breakfastPatients: "",
  breakfastStaff: "",
  breakfastSnack: "",
  lunchPatients: "",
  lunchStaff: "",
  lunchSnack: "",
  dinnerPatients: "",
  dinnerStaff: "",
  dinnerSnack: "",
};

const SERVICES = [
  {
    title: "Desayuno",
    description: "Pacientes, personal y colación servidos en el desayuno.",
    patients: "breakfastPatients",
    staff: "breakfastStaff",
    snack: "breakfastSnack",
  },
  {
    title: "Comida",
    description: "Pacientes, personal y colación servidos en la comida.",
    patients: "lunchPatients",
    staff: "lunchStaff",
    snack: "lunchSnack",
  },
  {
    title: "Cena",
    description: "Pacientes, personal y colación servidos en la cena.",
    patients: "dinnerPatients",
    staff: "dinnerStaff",
    snack: "dinnerSnack",
  },
] as const satisfies readonly {
  title: string;
  description: string;
  patients: FieldName;
  staff: FieldName;
  snack: FieldName;
}[];

function toFormValues(record: RecordDTO | null): FormValues {
  if (!record) return EMPTY;
  const value = (n: number | null) => (n === null ? "" : String(n));
  return {
    breakfastPatients: value(record.breakfastPatients),
    breakfastStaff: value(record.breakfastStaff),
    breakfastSnack: value(record.breakfastSnack),
    lunchPatients: value(record.lunchPatients),
    lunchStaff: value(record.lunchStaff),
    lunchSnack: value(record.lunchSnack),
    dinnerPatients: value(record.dinnerPatients),
    dinnerStaff: value(record.dinnerStaff),
    dinnerSnack: value(record.dinnerSnack),
  };
}

function toNumberOrNull(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function QuantityField({
  id,
  label,
  value,
  onChange,
}: {
  id: FieldName;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        value={value}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="0"
        autoComplete="off"
        className="text-right text-lg tabular-nums"
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d]/g, "");
          onChange(next);
        }}
      />
    </div>
  );
}

export function CaptureForm({
  hospital,
  serviceDate,
  record,
  backHref,
}: {
  hospital: HospitalDTO;
  serviceDate: string;
  record: RecordDTO | null;
  backHref: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => toFormValues(record));
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const appliedPrice = record ? record.appliedPrice : hospital.price;

  const totals = useMemo(
    () =>
      computeTotals(
        {
          breakfastPatients: toNumberOrNull(values.breakfastPatients),
          breakfastStaff: toNumberOrNull(values.breakfastStaff),
          breakfastSnack: toNumberOrNull(values.breakfastSnack),
          lunchPatients: toNumberOrNull(values.lunchPatients),
          lunchStaff: toNumberOrNull(values.lunchStaff),
          lunchSnack: toNumberOrNull(values.lunchSnack),
          dinnerPatients: toNumberOrNull(values.dinnerPatients),
          dinnerStaff: toNumberOrNull(values.dinnerStaff),
          dinnerSnack: toNumberOrNull(values.dinnerSnack),
        },
        appliedPrice,
      ),
    [values, appliedPrice],
  );

  const setField = (field: FieldName) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("hospitalId", String(hospital.id));
    formData.set("serviceDate", serviceDate);
    if (record) formData.set("recordId", String(record.id));
    for (const [field, value] of Object.entries(values)) formData.set(field, value);

    startTransition(async () => {
      const result = await saveRecord(formData);
      if (result.ok) {
        toast.success(result.message ?? "Captura guardada.");
        router.push(backHref);
        router.refresh();
        return;
      }
      if (result.duplicate && result.recordId) {
        toast.error(result.message ?? "Ya existe una captura para este hospital y fecha.", {
          description: "Se abrirá la captura existente para que la edites.",
        });
        router.refresh();
        return;
      }
      toast.error(result.message ?? "No se pudo guardar la captura.");
    });
  };

  const onDelete = () => {
    if (!record) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("recordId", String(record.id));
      const result = await deleteRecord(formData);
      if (result.ok) {
        toast.success(result.message ?? "Captura eliminada.");
        setConfirmDelete(false);
        router.push(backHref);
        router.refresh();
      } else {
        toast.error(result.message ?? "No se pudo eliminar.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {SERVICES.map((service) => (
          <Card key={service.title}>
            <CardHeader>
              <CardTitle className="text-base">{service.title}</CardTitle>
              <CardDescription>{service.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <QuantityField
                id={service.patients}
                label="Pacientes"
                value={values[service.patients]}
                onChange={setField(service.patients)}
              />
              <QuantityField
                id={service.staff}
                label="Personal"
                value={values[service.staff]}
                onChange={setField(service.staff)}
              />
              <QuantityField
                id={service.snack}
                label="Colación"
                value={values[service.snack]}
                onChange={setField(service.snack)}
              />
            </CardContent>
          </Card>
        ))}

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          Deja un campo vacío si todavía no tienes el dato. El cero se guarda como cero y
          cuenta como capturado.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
            <CardDescription>Se calcula automáticamente.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Desayuno total" value={formatNumber(totals.breakfastTotal)} />
            <Row label="Comida total" value={formatNumber(totals.lunchTotal)} />
            <Row label="Cena total" value={formatNumber(totals.dinnerTotal)} />
            <Separator className="my-1" />
            <Row label="Total pacientes" value={formatNumber(totals.totalPatients)} />
            <Row label="Total personal" value={formatNumber(totals.totalStaff)} />
            <Row label="Total colaciones" value={formatNumber(totals.snack)} />
            <Separator className="my-1" />
            <Row
              label="Total servido"
              value={formatNumber(totals.totalServed)}
              strong
            />
            <Row label="Precio aplicado" value={formatCurrency(appliedPrice)} />
            <Separator className="my-1" />
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Importe</span>
              <span className="text-xl font-semibold tabular-nums">
                {formatCurrency(totals.amount)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={pending} size="lg">
            <Save className="size-4" />
            {pending ? "Guardando…" : record ? "Guardar cambios" : "Guardar captura"}
          </Button>
          {record ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              <Trash2 className="size-4" />
              Eliminar captura
            </Button>
          ) : null}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deseas eliminar esta captura?</AlertDialogTitle>
            <AlertDialogDescription>
              Podrás recuperarla posteriormente: la eliminación es lógica y el registro
              se conserva en la base de datos, pero deja de aparecer en los reportes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                onDelete();
              }}
              disabled={pending}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}
