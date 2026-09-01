"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Camera, ImageIcon, Save, Trash2, TriangleAlert, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { computeTotals, formatCurrency, formatNumber } from "@/lib/calc";
import type { HospitalDTO, RecordDTO } from "@/lib/data";
import type { ImageField } from "@/lib/uploads";

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
    meal: "el desayuno",
    patients: "breakfastPatients",
    staff: "breakfastStaff",
    snack: "breakfastSnack",
    image: "breakfastImage",
  },
  {
    title: "Comida",
    meal: "la comida",
    patients: "lunchPatients",
    staff: "lunchStaff",
    snack: "lunchSnack",
    image: "lunchImage",
  },
  {
    title: "Cena",
    meal: "la cena",
    patients: "dinnerPatients",
    staff: "dinnerStaff",
    snack: "dinnerSnack",
    image: "dinnerImage",
  },
] as const satisfies readonly {
  title: string;
  meal: string;
  patients: FieldName;
  staff: FieldName;
  snack: FieldName;
  image: ImageField;
}[];

const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/heic";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
  const [images, setImages] = useState<Partial<Record<ImageField, File>>>({});
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const savedImages = record?.images;
  const usesSnack = hospital.usesSnack;
  const hasReportImage = Boolean(images.reportImage || savedImages?.reportImage);
  // La foto es obligatoria en cada captura nueva. Las capturas registradas antes de
  // esta función se pueden seguir corrigiendo, pidiendo la foto sin bloquear.
  const blocksSave = !record && !hasReportImage;

  const selectImage = (field: ImageField) => (file: File | null) => {
    setImages((prev) => {
      const next = { ...prev };
      if (file) next[field] = file;
      else delete next[field];
      return next;
    });
  };

  const appliedPrice = record ? record.appliedPrice : hospital.price;

  const totals = useMemo(
    () =>
      computeTotals(
        {
          breakfastPatients: toNumberOrNull(values.breakfastPatients),
          breakfastStaff: toNumberOrNull(values.breakfastStaff),
          breakfastSnack: usesSnack ? toNumberOrNull(values.breakfastSnack) : 0,
          lunchPatients: toNumberOrNull(values.lunchPatients),
          lunchStaff: toNumberOrNull(values.lunchStaff),
          lunchSnack: usesSnack ? toNumberOrNull(values.lunchSnack) : 0,
          dinnerPatients: toNumberOrNull(values.dinnerPatients),
          dinnerStaff: toNumberOrNull(values.dinnerStaff),
          dinnerSnack: usesSnack ? toNumberOrNull(values.dinnerSnack) : 0,
        },
        appliedPrice,
      ),
    [values, appliedPrice, usesSnack],
  );

  const setField = (field: FieldName) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blocksSave) {
      toast.error("Adjunta la foto del reporte diario para guardar la captura.");
      return;
    }

    const formData = new FormData();
    formData.set("hospitalId", String(hospital.id));
    formData.set("serviceDate", serviceDate);
    if (record) formData.set("recordId", String(record.id));
    for (const [field, value] of Object.entries(values)) {
      if (
        !usesSnack &&
        (field === "breakfastSnack" || field === "lunchSnack" || field === "dinnerSnack")
      ) {
        continue;
      }
      formData.set(field, value);
    }
    for (const [field, file] of Object.entries(images)) formData.set(field, file);

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
              <CardDescription>
                {usesSnack
                  ? `Pacientes, personal y colación servidos en ${service.meal}.`
                  : `Pacientes y personal servidos en ${service.meal}.`}
              </CardDescription>
            </CardHeader>
            <CardContent
              className={
                usesSnack
                  ? "grid grid-cols-2 gap-4 sm:grid-cols-3"
                  : "grid grid-cols-2 gap-4"
              }
            >
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
              {usesSnack ? (
                <QuantityField
                  id={service.snack}
                  label="Colación"
                  value={values[service.snack]}
                  onChange={setField(service.snack)}
                />
              ) : null}
              <PhotoField
                field={service.image}
                label={`Foto de ${service.title.toLowerCase()} (opcional)`}
                file={images[service.image] ?? null}
                savedUrl={
                  record && savedImages?.[service.image]
                    ? `/api/capturas/${record.id}/imagen/${service.image}`
                    : null
                }
                onSelect={selectImage(service.image)}
                className={usesSnack ? "col-span-2 sm:col-span-3" : "col-span-2"}
              />
            </CardContent>
          </Card>
        ))}

        <Card className={hasReportImage ? undefined : "border-primary/50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Reporte diario
              <span className="text-xs font-normal text-muted-foreground">
                Obligatorio
              </span>
            </CardTitle>
            <CardDescription>Adjunta la foto del reporte diario firmado</CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoField
              field="reportImage"
              label="Foto del reporte diario"
              file={images.reportImage ?? null}
              savedUrl={
                record && savedImages?.reportImage
                  ? `/api/capturas/${record.id}/imagen/reportImage`
                  : null
              }
              onSelect={selectImage("reportImage")}
            />
          </CardContent>
        </Card>

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
            {usesSnack ? (
              <Row label="Total colaciones" value={formatNumber(totals.snack)} />
            ) : null}
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
          {hasReportImage ? null : (
            <p className="text-xs text-muted-foreground">
              {blocksSave
                ? "Falta la foto del reporte diario."
                : "Esta captura no tiene foto del reporte diario. Adjúntala cuando la tengas."}
            </p>
          )}
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

function PhotoField({
  field,
  label,
  file,
  savedUrl,
  onSelect,
  className,
}: {
  field: ImageField;
  label: string;
  file: File | null;
  savedUrl: string | null;
  onSelect: (file: File | null) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shownUrl = preview ?? savedUrl;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={field} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <input
        ref={inputRef}
        id={field}
        name={field}
        type="file"
        accept={ACCEPTED_IMAGES}
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0] ?? null;
          if (!selected) return;
          if (!ACCEPTED_IMAGES.split(",").includes(selected.type)) {
            toast.error("La foto debe ser JPG, PNG, WEBP o HEIC.");
            event.target.value = "";
            return;
          }
          if (selected.size > MAX_IMAGE_BYTES) {
            toast.error("La foto pesa más de 8 MB. Usa una imagen más ligera.");
            event.target.value = "";
            return;
          }
          onSelect(selected);
        }}
      />

      {shownUrl ? (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shownUrl}
            alt={label}
            className="size-16 shrink-0 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              {file ? file.name : "Foto guardada en esta captura"}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <Camera className="size-4" />
                Cambiar
              </Button>
              {file ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (inputRef.current) inputRef.current.value = "";
                    onSelect(null);
                  }}
                >
                  <X className="size-4" />
                  Quitar
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <a href={savedUrl ?? "#"} target="_blank" rel="noreferrer">
                    <ImageIcon className="size-4" />
                    Ver
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="justify-start border-dashed"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="size-4" />
          Adjuntar foto
        </Button>
      )}
    </div>
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
