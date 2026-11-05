import "server-only";

import type { BookingService } from "@/lib/booking-services";

import { getPool } from "./db";

type ServiceRow = {
  id: string;
  code: string;
  category: BookingService["category"];
  label: string;
  english: string;
  duration_label: string;
  duration_hours: number;
  price_per_kg: number | null;
  min_kg: number;
  note: string;
  icon_key: string;
  active: boolean;
  sort_order: number;
};

export function toBookingService(row: ServiceRow): BookingService {
  return {
    id: row.id,
    code: row.code,
    category: row.category,
    label: row.label,
    english: row.english,
    duration: row.duration_label,
    durationHours: row.duration_hours,
    pricePerKg: row.price_per_kg,
    minKg: row.min_kg,
    note: row.note,
    iconKey: row.icon_key,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

export async function listBookingServices(activeOnly = false): Promise<BookingService[]> {
  const result = await getPool().query<ServiceRow>(
    `SELECT id, code, category, label, english, duration_label, duration_hours,
            price_per_kg, min_kg, note, icon_key, active, sort_order
     FROM newwash_services ${activeOnly ? "WHERE active = true" : ""}
     ORDER BY sort_order, created_at, id`,
  );
  return result.rows.map(toBookingService);
}
