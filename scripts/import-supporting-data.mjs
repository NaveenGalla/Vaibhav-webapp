import fs from "node:fs/promises";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node scripts/import-supporting-data.mjs /path/to/supporting-data.json");
  process.exit(1);
}

function stableId(prefix, parts) {
  const hash = crypto.createHash("sha1").update(parts.map((p) => String(p ?? "")).join("|")).digest("hex");
  return `${prefix}_${hash.slice(0, 28)}`;
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function decimal(value, fallback = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
  return Number(value);
}

function branchCity(code) {
  const normalized = String(code || "").toUpperCase();
  if (["VSKP", "VIZAG"].includes(normalized)) return "Visakhapatnam";
  if (normalized.startsWith("HYD") || ["DSNR", "AMP"].includes(normalized)) return "Hyderabad";
  if (normalized === "HO") return "Vijayawada";
  return normalized || "Unknown";
}

async function ensureBaseline() {
  const superRole = await db.role.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: { name: "Super Admin", permissions: { all: true } },
  });
  const adminRole = await db.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin", permissions: { fleet: true, approvals: true } },
  });
  const managerRole = await db.role.upsert({
    where: { name: "Branch Manager" },
    update: {},
    create: { name: "Branch Manager", permissions: { branch: true } },
  });

  const ho = await db.branch.upsert({
    where: { code: "HO" },
    update: { name: "Head Office", city: "Vijayawada", state: "Andhra Pradesh", isActive: true },
    create: { name: "Head Office", code: "HO", city: "Vijayawada", state: "Andhra Pradesh", isActive: true },
  });

  const password = await bcrypt.hash("admin123", 12);
  await db.user.upsert({
    where: { email: "admin@vaibhavjewellers.com" },
    update: {
      password,
      role: "Super Admin",
      roleId: superRole.id,
      branchId: ho.id,
      isActive: true,
    },
    create: {
      name: "System Administrator",
      email: "admin@vaibhavjewellers.com",
      password,
      role: "Super Admin",
      roleId: superRole.id,
      branchId: ho.id,
      isActive: true,
    },
  });

  await db.user.upsert({
    where: { email: "fleet.admin@vaibhavjewellers.com" },
    update: { role: "Admin", roleId: adminRole.id, branchId: ho.id, isActive: true },
    create: {
      name: "Fleet Admin",
      email: "fleet.admin@vaibhavjewellers.com",
      password,
      role: "Admin",
      roleId: adminRole.id,
      branchId: ho.id,
      isActive: true,
    },
  });

  return { ho, managerRole };
}

async function main() {
  const payload = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const { ho, managerRole } = await ensureBaseline();

  const branchCodes = [...new Set(payload.vehicles.map((v) => v.branchCode).filter(Boolean))];
  const branches = new Map();
  for (const code of branchCodes) {
    const branch = await db.branch.upsert({
      where: { code },
      update: { name: code, city: branchCity(code), isActive: true },
      create: { name: code, code, city: branchCity(code), state: null, isActive: true },
    });
    branches.set(code, branch);

    const email = `${String(code).toLowerCase().replace(/[^a-z0-9]+/g, ".")}.manager@vaibhavjewellers.com`;
    const password = await bcrypt.hash("branch123", 12);
    await db.user.upsert({
      where: { email },
      update: {
        role: "Branch Manager",
        roleId: managerRole.id,
        branchId: branch.id,
        isActive: true,
      },
      create: {
        name: `${code} Branch Manager`,
        email,
        password,
        role: "Branch Manager",
        roleId: managerRole.id,
        branchId: branch.id,
        isActive: true,
      },
    });
  }

  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@vaibhavjewellers.com" } });

  for (const v of payload.vehicles) {
    const branch = branches.get(v.branchCode) ?? ho;
    await db.vehicle.upsert({
      where: { vehicleNumber: v.vehicleNumber },
      update: {
        vehicleName: v.vehicleName,
        make: v.make,
        model: v.model,
        vehicleType: v.vehicleType,
        fuelType: v.fuelType,
        purposeOfUsage: v.purposeOfUsage,
        registrationDate: asDate(v.registrationDate),
        odometer: v.odometer ?? 0,
        fastagNumber: v.fastagNumber ? String(v.fastagNumber) : null,
        remarks: v.remarks,
        status: v.status,
        branchId: branch.id,
      },
      create: {
        vehicleNumber: v.vehicleNumber,
        vehicleName: v.vehicleName,
        make: v.make,
        model: v.model,
        vehicleType: v.vehicleType,
        fuelType: v.fuelType,
        ownershipType: "OWNED",
        purposeOfUsage: v.purposeOfUsage,
        registrationDate: asDate(v.registrationDate),
        odometer: v.odometer ?? 0,
        fastagNumber: v.fastagNumber ? String(v.fastagNumber) : null,
        remarks: v.remarks,
        status: v.status,
        branchId: branch.id,
      },
    });
  }

  let fuelImported = 0;
  for (const f of payload.fuelEntries) {
    const vehicle = await db.vehicle.findUnique({ where: { vehicleNumber: f.vehicleNumber } });
    if (!vehicle) continue;
    const branchCode = f.location || null;
    const branch = branchCode ? branches.get(branchCode) : null;
    const monthMap = { APR: 3, MAY: 4, JUN: 5, JUNE: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10 };
    const monthIndex = monthMap[String(f.month || "").toUpperCase()] ?? 3;
    const date = new Date(2025, monthIndex, 15);
    const id = stableId("fuel", [
      f.vehicleNumber,
      f.month,
      f.openingKm,
      f.closingKm,
      f.quantityLitres,
      f.totalAmount,
    ]);
    await db.fuelEntry.upsert({
      where: { id },
      update: {},
      create: {
        id,
        vehicleId: vehicle.id,
        branchId: branch?.id ?? vehicle.branchId,
        date,
        fuelType: f.fuelType,
        quantityLitres: decimal(f.quantityLitres),
        ratePerLitre: decimal(f.ratePerLitre, decimal(f.totalAmount) / Math.max(decimal(f.quantityLitres), 1)),
        totalAmount: decimal(f.totalAmount),
        odometer: f.closingKm ?? f.openingKm ?? vehicle.odometer,
        openingKm: f.openingKm,
        closingKm: f.closingKm,
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        enteredById: admin.id,
        approvedById: admin.id,
        remarks: `Imported from fuel sheet (${f.month} 2025).`,
      },
    });
    fuelImported += 1;
  }

  const counts = {
    branches: await db.branch.count(),
    users: await db.user.count(),
    vehicles: await db.vehicle.count(),
    fuelEntries: await db.fuelEntry.count(),
  };

  console.log(JSON.stringify({ importedVehicles: payload.vehicles.length, importedFuelRows: fuelImported, counts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
