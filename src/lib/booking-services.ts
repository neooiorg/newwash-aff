export type ServiceCategory = "laundry" | "other";

export type BookingService = {
  id: string;
  code: string;
  category: ServiceCategory;
  label: string;
  english: string;
  duration: string;
  durationHours: number;
  pricePerKg: number | null;
  minKg: number;
  note: string;
  iconKey: string;
  active: boolean;
  sortOrder: number;
};
