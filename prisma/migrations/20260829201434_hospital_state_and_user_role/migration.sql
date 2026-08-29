-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'capturista');

-- AlterTable: se agrega la entidad federativa y se rellenan los hospitales existentes
ALTER TABLE "hospitals" ADD COLUMN "state" TEXT;
UPDATE "hospitals" SET "state" = 'Sinaloa' WHERE "state" IS NULL;
ALTER TABLE "hospitals" ALTER COLUMN "state" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'capturista';

-- El usuario más antiguo queda como administrador para no dejar la configuración sin acceso
UPDATE "users" SET "role" = 'admin' WHERE "id" = (SELECT MIN("id") FROM "users");
