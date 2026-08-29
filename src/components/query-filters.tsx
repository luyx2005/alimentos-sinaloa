"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__all__";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return { setParams, pending };
}

export function QueryDate({
  param,
  value,
  label,
  className,
}: {
  param: string;
  value: string;
  label: string;
  className?: string;
}) {
  const { setParams, pending } = useSetParam();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={`filter-${param}`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={`filter-${param}`}
        type="date"
        value={value}
        disabled={pending}
        onChange={(event) => setParams({ [param]: event.target.value })}
        className="w-full sm:w-44"
      />
    </div>
  );
}

export function QuerySelect({
  param,
  value,
  label,
  options,
  placeholder = "Selecciona",
  allLabel,
  resetParams = [],
  className,
  disabled,
}: {
  param: string;
  value: string;
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** Si se define, agrega una opción para no filtrar por este campo. */
  allLabel?: string;
  /** Parámetros que se limpian al cambiar este filtro. */
  resetParams?: string[];
  className?: string;
  disabled?: boolean;
}) {
  const { setParams, pending } = useSetParam();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={`filter-${param}`} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value || (allLabel ? ALL : "")}
        disabled={disabled || pending}
        onValueChange={(next) => {
          const updates: Record<string, string | null> = {
            [param]: next === ALL ? null : next,
          };
          for (const reset of resetParams) updates[reset] = null;
          setParams(updates);
        }}
      >
        <SelectTrigger id={`filter-${param}`} className="w-full sm:w-56">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allLabel ? <SelectItem value={ALL}>{allLabel}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
