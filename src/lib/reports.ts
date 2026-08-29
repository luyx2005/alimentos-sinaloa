import "server-only";

import {
  addTotals,
  emptyTotals,
  round2,
  type Totals,
} from "@/lib/calc";
import { eachDateISO } from "@/lib/dates";
import {
  getCompany,
  getHospital,
  hospitalStatusesForDate,
  listHospitals,
  listRecords,
  type CompanyDTO,
  type HospitalDTO,
  type RecordDTO,
} from "@/lib/data";
import { getPeriodForDate, type Period } from "@/lib/periods";

export type DateRange = { from: string; to: string };

export type HospitalReport = {
  hospital: HospitalDTO;
  range: DateRange;
  rows: RecordDTO[];
  totals: Totals;
};

export async function buildHospitalReport(options: {
  hospitalId: number;
  from: string;
  to: string;
}): Promise<HospitalReport | null> {
  const hospital = await getHospital(options.hospitalId);
  if (!hospital) return null;

  const rows = await listRecords({
    hospitalId: hospital.id,
    from: options.from,
    to: options.to,
  });

  return {
    hospital,
    range: { from: options.from, to: options.to },
    rows,
    totals: rows.reduce((acc, row) => addTotals(acc, row.totals), emptyTotals()),
  };
}

export type CompanyReportRow = {
  hospital: HospitalDTO;
  totals: Totals;
  /** Precio aplicado en el periodo; null cuando hubo más de uno. */
  appliedPrice: number | null;
  days: number;
};

export type CompanyReport = {
  company: CompanyDTO;
  period: Period;
  rows: CompanyReportRow[];
  totals: Totals;
  records: RecordDTO[];
  pending: PendingRow[];
};

export async function buildCompanyReport(options: {
  companyId: number;
  from: string;
  to: string;
  periodLabel?: string;
}): Promise<CompanyReport | null> {
  const company = await getCompany(options.companyId);
  if (!company) return null;

  const [hospitals, records, pending] = await Promise.all([
    listHospitals({ companyId: company.id }),
    listRecords({ companyId: company.id, from: options.from, to: options.to }),
    buildPendingReport({ companyId: company.id, from: options.from, to: options.to }),
  ]);

  const byHospital = new Map<number, RecordDTO[]>();
  for (const record of records) {
    const list = byHospital.get(record.hospitalId) ?? [];
    list.push(record);
    byHospital.set(record.hospitalId, list);
  }

  const rows: CompanyReportRow[] = hospitals
    .filter((hospital) => hospital.active || byHospital.has(hospital.id))
    .map((hospital) => {
      const hospitalRecords = byHospital.get(hospital.id) ?? [];
      const prices = new Set(hospitalRecords.map((record) => record.appliedPrice));
      return {
        hospital,
        totals: hospitalRecords.reduce(
          (acc, record) => addTotals(acc, record.totals),
          emptyTotals(),
        ),
        appliedPrice:
          prices.size === 1 ? [...prices][0] : prices.size === 0 ? hospital.price : null,
        days: hospitalRecords.length,
      };
    });

  return {
    company,
    period: {
      startDate: options.from,
      endDate: options.to,
      label:
        options.periodLabel ??
        getPeriodForDate(company, options.from).label,
    },
    rows,
    totals: rows.reduce((acc, row) => addTotals(acc, row.totals), emptyTotals()),
    records,
    pending,
  };
}

export type PatientsStaffRow = {
  hospital: HospitalDTO;
  patients: number;
  staff: number;
  snack: number;
  total: number;
};

export type PatientsStaffReport = {
  company: CompanyDTO;
  range: DateRange;
  rows: PatientsStaffRow[];
  totals: { patients: number; staff: number; snack: number; total: number };
};

export async function buildPatientsStaffReport(options: {
  companyId: number;
  hospitalId?: number;
  from: string;
  to: string;
}): Promise<PatientsStaffReport | null> {
  const company = await getCompany(options.companyId);
  if (!company) return null;

  const hospitals = await listHospitals({ companyId: company.id });
  const records = await listRecords({
    companyId: company.id,
    hospitalId: options.hospitalId,
    from: options.from,
    to: options.to,
  });

  const rows: PatientsStaffRow[] = hospitals
    .filter((hospital) => !options.hospitalId || hospital.id === options.hospitalId)
    .map((hospital) => {
      const hospitalRecords = records.filter((r) => r.hospitalId === hospital.id);
      const patients = sum(hospitalRecords.map((r) => r.totals.totalPatients));
      const staff = sum(hospitalRecords.map((r) => r.totals.totalStaff));
      const snack = sum(hospitalRecords.map((r) => r.totals.snack));
      return { hospital, patients, staff, snack, total: patients + staff + snack };
    });

  return {
    company,
    range: { from: options.from, to: options.to },
    rows,
    totals: {
      patients: sum(rows.map((r) => r.patients)),
      staff: sum(rows.map((r) => r.staff)),
      snack: sum(rows.map((r) => r.snack)),
      total: sum(rows.map((r) => r.total)),
    },
  };
}

export type ServiceRow = {
  hospital: HospitalDTO;
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
  total: number;
};

export type ServiceReport = {
  company: CompanyDTO;
  range: DateRange;
  rows: ServiceRow[];
  totals: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
    total: number;
  };
};

export async function buildServiceReport(options: {
  companyId: number;
  hospitalId?: number;
  from: string;
  to: string;
}): Promise<ServiceReport | null> {
  const company = await getCompany(options.companyId);
  if (!company) return null;

  const hospitals = await listHospitals({ companyId: company.id });
  const records = await listRecords({
    companyId: company.id,
    hospitalId: options.hospitalId,
    from: options.from,
    to: options.to,
  });

  const rows: ServiceRow[] = hospitals
    .filter((hospital) => !options.hospitalId || hospital.id === options.hospitalId)
    .map((hospital) => {
      const hospitalRecords = records.filter((r) => r.hospitalId === hospital.id);
      const breakfast = sum(hospitalRecords.map((r) => r.totals.breakfastTotal));
      const lunch = sum(hospitalRecords.map((r) => r.totals.lunchTotal));
      const dinner = sum(hospitalRecords.map((r) => r.totals.dinnerTotal));
      const snack = sum(hospitalRecords.map((r) => r.totals.snack));
      return {
        hospital,
        breakfast,
        lunch,
        dinner,
        snack,
        total: breakfast + lunch + dinner + snack,
      };
    });

  return {
    company,
    range: { from: options.from, to: options.to },
    rows,
    totals: {
      breakfast: sum(rows.map((r) => r.breakfast)),
      lunch: sum(rows.map((r) => r.lunch)),
      dinner: sum(rows.map((r) => r.dinner)),
      snack: sum(rows.map((r) => r.snack)),
      total: sum(rows.map((r) => r.total)),
    },
  };
}

export type PendingRow = {
  serviceDate: string;
  hospitalId: number;
  hospitalName: string;
  companyName: string;
  status: "incompleto" | "sin_captura";
  missing: string[];
};

const SERVICE_NAMES: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Colación",
};

export async function buildPendingReport(options: {
  companyId?: number;
  from: string;
  to: string;
}): Promise<PendingRow[]> {
  const dates = eachDateISO(options.from, options.to);
  const rows: PendingRow[] = [];

  for (const date of dates) {
    const statuses = await hospitalStatusesForDate({
      companyId: options.companyId,
      serviceDate: date,
    });
    for (const item of statuses) {
      if (item.status === "completo") continue;
      rows.push({
        serviceDate: date,
        hospitalId: item.hospital.id,
        hospitalName: item.hospital.name,
        companyName: item.hospital.companyName,
        status: item.status,
        missing: item.missing.map((key) => SERVICE_NAMES[key] ?? key),
      });
    }
  }

  return rows;
}

function sum(values: number[]): number {
  return round2(values.reduce((acc, value) => acc + value, 0));
}
