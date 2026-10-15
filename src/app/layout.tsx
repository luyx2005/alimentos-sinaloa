import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alimentos Sinaloa",
  description:
    "Control diario de alimentos servidos por hospital, con reportes por empresa y exportación a Excel y PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-muted/30">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
