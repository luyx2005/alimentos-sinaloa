-- Fotos de la captura: una opcional por servicio y la del reporte diario.
ALTER TABLE "daily_records"
  ADD COLUMN "breakfast_image" TEXT,
  ADD COLUMN "lunch_image" TEXT,
  ADD COLUMN "dinner_image" TEXT,
  ADD COLUMN "report_image" TEXT;
