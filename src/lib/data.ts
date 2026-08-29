import "server-only";

import { prisma } from "@/lib/prisma";
import { parseISODate, toISODate } from "@/lib/dates";
import {
  captureStatus,
  computeTotals,
  missingServices,
  type CaptureStatus,
  type ServiceKey,
  type Totals,
} from "@/lib/calc";
import type { PaymentPeriodType } from "@/lib/periods";

export type CompanyDTO = {
  id: number;
  name: string;
  paymentPeriodType: PaymentPeriodType;
  active: boolean;
};

export type HospitalDTO = {
  id: number;
  companyId: number;
  companyName: string;
  name: string;
  price: number;
  active: boolean;
};

export type UserDTO = {
  id: number;
  name: string;
  username: string;
  active: boolean;
};

export type RecordDTO = {
  id: number;
  hospitalId: number;
  hospitalName: string;
  companyId: number;
  companyName: string;
  serviceDate: string;
  breakfastPatients: number | null;
  breakfastStaff: number | null;
  lunchPatients: number | null;
  lunchStaff: number | null;
  dinnerPatients: number | null;
  dinnerStaff: number | null;
  snackQuantity: number | null;
  appliedPrice: number;
  totals: Totals;
  status: CaptureStatus;
  missing: ServiceKey[];
};

type RecordRow = {
  id: number;
  hospitalId: number;
  serviceDate: Date;
  breakfastPatients: number | null;
  breakfastStaff: number | null;
  lunchPatients: number | null;
  lunchStaff: number | null;
  dinnerPatients: number | null;
  dinnerStaff: number | null;
  snackQuantity: number | null;
  appliedPrice: unknown;
  hospital: { id: number; name: string; companyId: number; company: { name: string } };
};

function toRecordDTO(row: RecordRow): RecordDTO {
  const quantities = {
    breakfastPatients: row.breakfastPatients,
    breakfastStaff: row.breakfastStaff,
    lunchPatients: row.lunchPatients,
    lunchStaff: row.lunchStaff,
    dinnerPatients: row.dinnerPatients,
    dinnerStaff: row.dinnerStaff,
    snackQuantity: row.snackQuantity,
  };
  const appliedPrice = Number(row.appliedPrice);

  return {
    id: row.id,
    hospitalId: row.hospitalId,
    hospitalName: row.hospital.name,
    companyId: row.hospital.companyId,
    companyName: row.hospital.company.name,
    serviceDate: toISODate(row.serviceDate),
    ...quantities,
    appliedPrice,
    totals: computeTotals(quantities, appliedPrice),
    status: captureStatus(quantities),
    missing: missingServices(quantities),
  };
}

const recordInclude = {
  hospital: { include: { company: { select: { name: true } } } },
} as const;

export async function listCompanies(activeOnly = false): Promise<CompanyDTO[]> {
  const rows = await prisma.company.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    paymentPeriodType: row.paymentPeriodType as PaymentPeriodType,
    active: row.active,
  }));
}

export async function getCompany(id: number): Promise<CompanyDTO | null> {
  const row = await prisma.company.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    paymentPeriodType: row.paymentPeriodType as PaymentPeriodType,
    active: row.active,
  };
}

export async function listHospitals(options?: {
  companyId?: number;
  activeOnly?: boolean;
}): Promise<HospitalDTO[]> {
  const rows = await prisma.hospital.findMany({
    where: {
      ...(options?.companyId ? { companyId: options.companyId } : {}),
      ...(options?.activeOnly ? { active: true } : {}),
    },
    include: { company: { select: { name: true } } },
    orderBy: [{ companyId: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    name: row.name,
    price: Number(row.price),
    active: row.active,
  }));
}

export async function getHospital(id: number): Promise<HospitalDTO | null> {
  const row = await prisma.hospital.findUnique({
    where: { id },
    include: { company: { select: { name: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    name: row.name,
    price: Number(row.price),
    active: row.active,
  };
}

export async function listUsers(): Promise<UserDTO[]> {
  const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    active: row.active,
  }));
}

export async function getRecord(
  hospitalId: number,
  serviceDate: string,
): Promise<RecordDTO | null> {
  const row = await prisma.dailyRecord.findFirst({
    where: { hospitalId, serviceDate: parseISODate(serviceDate), active: true },
    include: recordInclude,
  });
  return row ? toRecordDTO(row) : null;
}

export async function getRecordById(id: number): Promise<RecordDTO | null> {
  const row = await prisma.dailyRecord.findFirst({
    where: { id, active: true },
    include: recordInclude,
  });
  return row ? toRecordDTO(row) : null;
}

export async function listRecords(options: {
  companyId?: number;
  hospitalId?: number;
  from: string;
  to: string;
}): Promise<RecordDTO[]> {
  const rows = await prisma.dailyRecord.findMany({
    where: {
      active: true,
      serviceDate: { gte: parseISODate(options.from), lte: parseISODate(options.to) },
      ...(options.hospitalId ? { hospitalId: options.hospitalId } : {}),
      ...(options.companyId ? { hospital: { companyId: options.companyId } } : {}),
    },
    include: recordInclude,
    orderBy: [{ serviceDate: "asc" }, { hospitalId: "asc" }],
  });
  return rows.map(toRecordDTO);
}

export type HospitalDayStatus = {
  hospital: HospitalDTO;
  record: RecordDTO | null;
  status: CaptureStatus;
  missing: ServiceKey[];
};

/** Estado de captura de cada hospital activo de una empresa para una fecha. */
export async function hospitalStatusesForDate(options: {
  companyId?: number;
  serviceDate: string;
}): Promise<HospitalDayStatus[]> {
  const hospitals = await listHospitals({
    companyId: options.companyId,
    activeOnly: true,
  });
  if (hospitals.length === 0) return [];

  const rows = await prisma.dailyRecord.findMany({
    where: {
      active: true,
      serviceDate: parseISODate(options.serviceDate),
      hospitalId: { in: hospitals.map((h) => h.id) },
    },
    include: recordInclude,
  });
  const byHospital = new Map(rows.map((row) => [row.hospitalId, toRecordDTO(row)]));

  return hospitals.map((hospital) => {
    const record = byHospital.get(hospital.id) ?? null;
    return {
      hospital,
      record,
      status: record ? record.status : "sin_captura",
      missing: record ? record.missing : ["breakfast", "lunch", "dinner", "snack"],
    };
  });
}
