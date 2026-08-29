"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { saveUser } from "@/app/(app)/configuracion/actions";
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
import type { UserDTO } from "@/lib/data";

export function UserDialog({
  user,
  trigger,
}: {
  user?: UserDTO;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveUser(formData);
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
          <DialogTitle>{user ? "Editar usuario" : "Nuevo capturista"}</DialogTitle>
          <DialogDescription>
            Todos los capturistas tienen los mismos permisos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={user?.id ?? ""} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-name">Nombre</Label>
            <Input
              id="user-name"
              name="name"
              defaultValue={user?.name ?? ""}
              placeholder="María López"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-username">Usuario</Label>
            <Input
              id="user-username"
              name="username"
              defaultValue={user?.username ?? ""}
              placeholder="maria"
              autoComplete="off"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="user-password">
              Contraseña{user ? " (dejar vacío para conservarla)" : ""}
            </Label>
            <Input
              id="user-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              required={!user}
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
