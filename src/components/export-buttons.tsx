"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ExportPayload } from "@/lib/export-payload";

export function ExportButtons({
  payload,
  disabled,
}: {
  payload: ExportPayload;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);

  const exportExcel = async () => {
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      for (const sheet of payload.sheets) {
        const worksheet = XLSX.utils.aoa_to_sheet([sheet.columns, ...sheet.rows]);
        worksheet["!cols"] = (
          sheet.widths ?? sheet.columns.map((column) => Math.max(12, column.length + 2))
        ).map((width) => ({ wch: width }));
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
      }

      XLSX.writeFile(workbook, `${payload.fileName}.xlsx`);
      toast.success("Excel generado.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar el Excel.");
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
      doc.setFontSize(14);
      doc.text(payload.title, 40, 40);
      doc.setFontSize(10);
      doc.setTextColor(110);
      if (payload.subtitle) doc.text(payload.subtitle, 40, 58);

      let cursorY = payload.subtitle ? 76 : 60;

      if (payload.pdf.summary?.length) {
        doc.setTextColor(30);
        const line = payload.pdf.summary
          .map((item) => `${item.label}: ${item.value}`)
          .join("    ");
        doc.text(line, 40, cursorY);
        cursorY += 16;
      }

      for (const section of payload.pdf.sections) {
        autoTable(doc, {
          head: [section.columns],
          body: section.rows.map((row) => row.map((cell) => String(cell))),
          startY: cursorY,
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [39, 39, 42], textColor: 255 },
          margin: { left: 40, right: 40 },
          didDrawPage: () => {
            if (section.heading) {
              doc.setFontSize(11);
              doc.setTextColor(30);
            }
          },
        });
        const finalY =
          (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
            ?.finalY ?? cursorY;
        cursorY = finalY + 24;
      }

      doc.save(`${payload.fileName}.pdf`);
      toast.success("PDF generado.");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportExcel}
        disabled={disabled || busy !== null}
      >
        <FileSpreadsheet className="size-4" />
        {busy === "excel" ? "Generando…" : "Exportar Excel"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportPdf}
        disabled={disabled || busy !== null}
      >
        <FileDown className="size-4" />
        {busy === "pdf" ? "Generando…" : "Exportar PDF"}
      </Button>
    </div>
  );
}
