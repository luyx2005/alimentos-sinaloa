-- La colación es opcional por empresa. WWPL no la maneja en la captura.
ALTER TABLE "companies" ADD COLUMN "uses_snack" BOOLEAN NOT NULL DEFAULT true;
UPDATE "companies" SET "uses_snack" = false WHERE lower(name) = 'wwpl';
