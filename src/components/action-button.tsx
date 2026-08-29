"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

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

type ActionResult = { ok: boolean; message?: string };

export function ActionButton({
  action,
  values,
  children,
  variant = "outline",
  size = "sm",
  className,
  disabled,
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirmar",
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  values: Record<string, string | number>;
  children: ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  disabled?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  confirmLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const run = () => {
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(values)) {
        formData.set(key, String(value));
      }
      const result = await action(formData);
      if (result.ok) {
        toast.success(result.message ?? "Listo.");
      } else {
        toast.error(result.message ?? "No se pudo completar la acción.");
      }
      setOpen(false);
    });
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || pending}
      onClick={confirmTitle ? () => setOpen(true) : run}
      type="button"
    >
      {children}
    </Button>
  );

  if (!confirmTitle) return button;

  return (
    <>
      {button}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            {confirmDescription ? (
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                run();
              }}
              disabled={pending}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
