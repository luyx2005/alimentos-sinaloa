"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortValue = string | number | boolean;

export type SortableColumn = {
  key: string;
  label: string;
  alignRight?: boolean;
  sortable?: boolean;
};

export type SortableRow = {
  id: string | number;
  /** Valor de cada columna ordenable; las celdas visibles van en `cells`. */
  values: Record<string, SortValue>;
  cells: ReactNode;
};

type Direction = "asc" | "desc";

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

export function SortableTable({
  columns,
  rows,
  defaultSortKey,
  emptyMessage,
}: {
  columns: SortableColumn[];
  rows: SortableRow[];
  defaultSortKey: string;
  emptyMessage: string;
}) {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [direction, setDirection] = useState<Direction>("asc");

  const sorted = useMemo(() => {
    const factor = direction === "asc" ? 1 : -1;
    return [...rows].sort(
      (a, b) => compare(a.values[sortKey] ?? "", b.values[sortKey] ?? "") * factor,
    );
  }, [rows, sortKey, direction]);

  const toggle = (key: string) => {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection("asc");
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => {
              const active = column.key === sortKey;
              const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown;

              return (
                <TableHead
                  key={column.key}
                  aria-sort={
                    active
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : column.sortable === false
                        ? undefined
                        : "none"
                  }
                  className={cn(column.alignRight && "text-right")}
                >
                  {column.sortable === false ? (
                    column.label
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggle(column.key)}
                      title={
                        active && direction === "asc"
                          ? `Ordenar ${column.label} en orden descendente`
                          : `Ordenar ${column.label} en orden ascendente`
                      }
                      className={cn(
                        "-mx-2 h-8 font-medium",
                        column.alignRight && "ml-auto",
                        !active && "text-muted-foreground",
                      )}
                    >
                      {column.label}
                      <Icon className="size-3.5" />
                    </Button>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => <TableRow key={row.id}>{row.cells}</TableRow>)
          )}
        </TableBody>
      </Table>
    </div>
  );
}
