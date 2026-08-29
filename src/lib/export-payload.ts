export type Cell = string | number;

export type SheetSpec = {
  name: string;
  columns: string[];
  rows: Cell[][];
  /** Anchos aproximados por columna, en caracteres. */
  widths?: number[];
};

export type PdfSection = {
  heading?: string;
  columns: string[];
  rows: Cell[][];
};

export type ExportPayload = {
  fileName: string;
  title: string;
  subtitle?: string;
  sheets: SheetSpec[];
  pdf: {
    summary?: { label: string; value: string }[];
    sections: PdfSection[];
  };
};
