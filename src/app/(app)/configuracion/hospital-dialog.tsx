"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { saveHospital } from "@/app/(app)/configuracion/actions";
import { Button } from "@/components/ui/button";
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
import type { CompanyDTO, HospitalDTO } from "@/lib/data";
import { DEFAULT_STATE, MEXICAN_STATES } from "@/lib/mexican-states";

export function HospitalDialog({
  hospital,
  companies,
  trigger,
}: {
  hospital?: HospitalDTO;
  companies: CompanyDTO[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [companyId, setCompanyId] = useState(
    String(hospital?.companyId ?? companies[0]?.id ?? ""),
  );
  const [state, setState] = useState<string>(hospital?.state ?? DEFAULT_STATE);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("companyId", companyId);
    formData.set("state", state);
    startTransition(async () => {
      const result = await saveHospital(formData);
      if (result.ok) {
        toast.success(result.message ?? "Guardado.");
        setOpen(false);
      } else {
        toast.error(result.message ?? "No se pudo guardar.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hospital ? "Editar hospital" : "Nuevo hospital"}</DialogTitle>
          <DialogDescription>
            El precio se aplica igual a desayuno, comida, cena y colación. Al cambiarlo
            no se modifican las capturas ya guardadas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={hospital?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="hospital-company">Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="hospital-company">
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                    {company.active ? "" : " (inactiva)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="hospital-name">Nombre</Label>
            <Input
              id="hospital-name"
              name="name"
              defaultValue={hospital?.name ?? ""}
              placeholder="Hospital 1"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="hospital-state">Estado</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="hospital-state">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {MEXICAN_STATES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="hospital-price">Precio por comida (MXN)</Label>
            <Input
              id="hospital-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={hospital ? String(hospital.price) : ""}
              placeholder="85.00"
              required
            />
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
