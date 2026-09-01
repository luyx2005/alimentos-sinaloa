"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { saveCompany } from "@/app/(app)/configuracion/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanyDTO } from "@/lib/data";

export function CompanyDialog({
  company,
  trigger,
}: {
  company?: CompanyDTO;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [periodType, setPeriodType] = useState(
    company?.paymentPeriodType ?? "weekly",
  );
  const [usesSnack, setUsesSnack] = useState(company?.usesSnack ?? true);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("paymentPeriodType", periodType);
    formData.set("usesSnack", usesSnack ? "1" : "0");
    startTransition(async () => {
      const result = await saveCompany(formData);
      if (result.ok) {
        toast.success(result.message ?? "Guardado.");
        setOpen(false);
      } else {
        toast.error(result.message ?? "No se pudo guardar.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) {
        setPeriodType(company?.paymentPeriodType ?? "weekly");
        setUsesSnack(company?.usesSnack ?? true);
      }
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{company ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
          <DialogDescription>
            La periodicidad define cómo se agrupan los reportes por periodo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={company?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="company-name">Nombre</Label>
            <Input
              id="company-name"
              name="name"
              defaultValue={company?.name ?? ""}
              placeholder="Empresa A"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="company-period">Periodicidad de pago</Label>
            <Select
              value={periodType}
              onValueChange={(value) =>
                setPeriodType(value as "weekly" | "biweekly")
              }
            >
              <SelectTrigger id="company-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal (lunes a domingo)</SelectItem>
                <SelectItem value="biweekly">
                  Quincenal (1-15 y 16 a fin de mes)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="company-uses-snack"
              checked={usesSnack}
              onCheckedChange={(checked) => setUsesSnack(checked === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="company-uses-snack" className="leading-none">
                Maneja colación
              </Label>
              <p className="text-xs text-muted-foreground">
                Si se desactiva, la captura de sus hospitales solo pide pacientes y
                personal. WWPL no maneja colación.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
