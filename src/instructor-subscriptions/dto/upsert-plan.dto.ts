export interface UpsertPlanDto {
  name: string;
  price: number;
  durationMonths: number;
  courseLimit: number;
  storageLimitGb?: number | null;
  studentsLimit?: number | null;
  features?: string[];
  isActive?: boolean;
}
