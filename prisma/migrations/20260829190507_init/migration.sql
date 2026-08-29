-- CreateEnum
CREATE TYPE "PaymentPeriodType" AS ENUM ('weekly', 'biweekly');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "payment_period_type" "PaymentPeriodType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_records" (
    "id" SERIAL NOT NULL,
    "hospital_id" INTEGER NOT NULL,
    "service_date" DATE NOT NULL,
    "breakfast_patients" INTEGER,
    "breakfast_staff" INTEGER,
    "lunch_patients" INTEGER,
    "lunch_staff" INTEGER,
    "dinner_patients" INTEGER,
    "dinner_staff" INTEGER,
    "snack_quantity" INTEGER,
    "applied_price" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hospitals_company_id_idx" ON "hospitals"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "daily_records_hospital_id_service_date_idx" ON "daily_records"("hospital_id", "service_date");

-- CreateIndex
CREATE INDEX "daily_records_service_date_idx" ON "daily_records"("service_date");

-- AddForeignKey
ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un solo registro activo por hospital y fecha de servicio (indice unico parcial)
CREATE UNIQUE INDEX "daily_records_hospital_id_service_date_active_key"
  ON "daily_records"("hospital_id", "service_date")
  WHERE "active" = true;
