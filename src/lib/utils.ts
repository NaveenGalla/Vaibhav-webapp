import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for conditionally merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency in INR
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date as DD MMM YYYY
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// Format odometer reading with commas
export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return `${km.toLocaleString("en-IN")} km`;
}

// Get days remaining until a date (negative = overdue)
export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Renewal status badge colour based on days remaining
export function renewalStatusColor(days: number | null): string {
  if (days === null) return "gray";
  if (days < 0) return "red";
  if (days <= 7) return "red";
  if (days <= 30) return "amber";
  return "green";
}

// Generate a sequential reference number: PREFIX-YYYY-NNNNN
export function generateRefNumber(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(5, "0");
  return `${prefix}-${year}-${seq}`;
}

// Check if a user has a specific permission
export function hasPermission(
  permissions: Record<string, Record<string, boolean>> | undefined,
  module: string,
  action: string
): boolean {
  return permissions?.[module]?.[action] === true;
}
