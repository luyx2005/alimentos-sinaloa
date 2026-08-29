-- La colación deja de ser un servicio propio y se captura dentro de cada comida.
ALTER TABLE "daily_records"
  ADD COLUMN "breakfast_snack" INTEGER,
  ADD COLUMN "lunch_snack" INTEGER,
  ADD COLUMN "dinner_snack" INTEGER;

-- Las capturas existentes conservan su total (y por lo tanto su importe): la colación
-- del día se queda en la cena y los otros servicios arrancan en cero, de modo que las
-- capturas que estaban completas siguen completas.
UPDATE "daily_records"
SET "breakfast_snack" = CASE WHEN "snack_quantity" IS NULL THEN NULL ELSE 0 END,
    "lunch_snack" = CASE WHEN "snack_quantity" IS NULL THEN NULL ELSE 0 END,
    "dinner_snack" = "snack_quantity";

ALTER TABLE "daily_records" DROP COLUMN "snack_quantity";
