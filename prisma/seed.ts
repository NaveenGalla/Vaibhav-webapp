// ─────────────────────────────────────────────────────────────────────────────
// Seed: Vaibhav Jewellers VFM System
// Creates:
//   • 12 AP/Telangana branches
//   • 4 demo users (Super Admin, 2 Branch Managers, Accounts)
//   • 1 demo driver
//   • 3 demo vehicles
//   • Demo renewals
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const BRANCHES = [
  { name: "Vijayawada Main",        code: "VJA-MAIN", city: "Vijayawada",    state: "Andhra Pradesh" },
  { name: "Vijayawada Ring Road",   code: "VJA-RR",   city: "Vijayawada",    state: "Andhra Pradesh" },
  { name: "Guntur",                 code: "GNT",       city: "Guntur",        state: "Andhra Pradesh" },
  { name: "Visakhapatnam",          code: "VSK",       city: "Visakhapatnam", state: "Andhra Pradesh" },
  { name: "Rajahmundry",            code: "RJY",       city: "Rajahmundry",   state: "Andhra Pradesh" },
  { name: "Nellore",                code: "NLR",       city: "Nellore",       state: "Andhra Pradesh" },
  { name: "Tirupati",               code: "TPT",       city: "Tirupati",      state: "Andhra Pradesh" },
  { name: "Kurnool",                code: "KNL",       city: "Kurnool",       state: "Andhra Pradesh" },
  { name: "Hyderabad KPHB",         code: "HYD-KPHB", city: "Hyderabad",     state: "Telangana" },
  { name: "Hyderabad Ameerpet",     code: "HYD-AMP",  city: "Hyderabad",     state: "Telangana" },
  { name: "Hyderabad Dilsukhnagar", code: "HYD-DLK",  city: "Hyderabad",     state: "Telangana" },
  { name: "Head Office",            code: "HO",        city: "Vijayawada",    state: "Andhra Pradesh" },
];

async function main() {
  console.log("🌱  Seeding Vaibhav Jewellers VFM database…");

  // ── Branches ──────────────────────────────────────────────────────────────
  const branches = await Promise.all(
    BRANCHES.map((b: any) =>
      db.branch.upsert({
        where:  { code: b.code },
        update: {},
        create: { ...b, isActive: true },
      })
    )
  );
  console.log(`✅  ${branches.length} branches created/verified`);

  const hoBranch  = branches.find((b: any) => b.code === "HO")!;
  const vjaBranch = branches.find((b: any) => b.code === "VJA-MAIN")!;
  const hydBranch = branches.find((b: any) => b.code === "HYD-KPHB")!;

  // ── Users ─────────────────────────────────────────────────────────────────
  const superAdminPwd  = await bcrypt.hash("admin123",  12);
  const branchAdminPwd = await bcrypt.hash("branch123", 12);

  const superAdmin = await db.user.upsert({
    where:  { email: "admin@vaibhavjewellers.com" },
    update: {},
    create: {
      name:     "System Administrator",
      email:    "admin@vaibhavjewellers.com",
      password: superAdminPwd,
      role:     "Super Admin",
      branchId: hoBranch.id,
      isActive: true,
    },
  });

  await db.user.upsert({
    where:  { email: "vja.manager@vaibhavjewellers.com" },
    update: {},
    create: {
      name:     "Vijayawada Branch Manager",
      email:    "vja.manager@vaibhavjewellers.com",
      password: branchAdminPwd,
      role:     "Branch Manager",
      branchId: vjaBranch.id,
      isActive: true,
    },
  });

  await db.user.upsert({
    where:  { email: "hyd.manager@vaibhavjewellers.com" },
    update: {},
    create: {
      name:     "Hyderabad Branch Manager",
      email:    "hyd.manager@vaibhavjewellers.com",
      password: branchAdminPwd,
      role:     "Branch Manager",
      branchId: hydBranch.id,
      isActive: true,
    },
  });

  await db.user.upsert({
    where:  { email: "accounts@vaibhavjewellers.com" },
    update: {},
    create: {
      name:     "Accounts Team",
      email:    "accounts@vaibhavjewellers.com",
      password: branchAdminPwd,
      role:     "Accounts User",
      branchId: hoBranch.id,
      isActive: true,
    },
  });

  console.log(`✅  Users seeded (Super Admin, 2 Branch Managers, Accounts)`);

  // ── Demo Driver ────────────────────────────────────────────────────────────
  const driver = await db.driver.upsert({
    where:  { licenseNumber: "AP09-2019-001234" },
    update: {},
    create: {
      name:          "Ravi Kumar",
      licenseNumber: "AP09-2019-001234",
      licenseType:   "HMV",
      licenseExpiry: new Date("2027-03-31"),
      phone:         "9876543210",
      branchId:      vjaBranch.id,
      isActive:      true,
    },
  });
  console.log(`✅  Demo driver: ${driver.name}`);

  // ── Demo Vehicles ──────────────────────────────────────────────────────────
  // NOTE: vehicleType uses Codex schema enums — FOUR_WHEELER, TWO_WHEELER, VAN, TRUCK, OTHER
  //       yearOfManufacture replaces the old `year` field
  const vehicles = await Promise.all([
    db.vehicle.upsert({
      where:  { vehicleNumber: "AP16BZ5001" },
      update: {},
      create: {
        vehicleNumber:    "AP16BZ5001",
        vehicleName:      "Innova Crysta — HO",
        vehicleType:      "FOUR_WHEELER",
        make:             "Toyota",
        model:            "Innova Crysta",
        yearOfManufacture: 2021,
        fuelType:         "DIESEL",
        ownershipType:    "OWNED",
        odometer:         38250,
        branchId:         hoBranch.id,
        driverId:         driver.id,
        status:           "ACTIVE",
        seatingCapacity:  7,
      },
    }),
    db.vehicle.upsert({
      where:  { vehicleNumber: "AP16BZ5002" },
      update: {},
      create: {
        vehicleNumber:    "AP16BZ5002",
        vehicleName:      "Swift Dzire — VJA",
        vehicleType:      "FOUR_WHEELER",
        make:             "Maruti Suzuki",
        model:            "Swift Dzire",
        yearOfManufacture: 2022,
        fuelType:         "PETROL",
        ownershipType:    "OWNED",
        odometer:         22100,
        branchId:         vjaBranch.id,
        status:           "ACTIVE",
        seatingCapacity:  5,
      },
    }),
    db.vehicle.upsert({
      where:  { vehicleNumber: "TS09EX7123" },
      update: {},
      create: {
        vehicleNumber:    "TS09EX7123",
        vehicleName:      "Bolero Pickup — HYD",
        vehicleType:      "VAN",
        make:             "Mahindra",
        model:            "Bolero Pikup",
        yearOfManufacture: 2020,
        fuelType:         "DIESEL",
        ownershipType:    "OWNED",
        odometer:         61400,
        branchId:         hydBranch.id,
        status:           "ACTIVE",
      },
    }),
  ]);
  console.log(`✅  ${vehicles.length} demo vehicles created`);

  // ── Demo Renewals ──────────────────────────────────────────────────────────
  const renewalData = [
    {
      vehicleId:      vehicles[0].id,
      renewalType:    "INSURANCE" as const,
      issueDate:      new Date("2024-04-01"),
      expiryDate:     new Date("2025-03-31"),   // intentionally expired → red badge
      policyOrCertNo: "NIC/AP/2024/001",
      provider:       "National Insurance",
    },
    {
      vehicleId:      vehicles[0].id,
      renewalType:    "POLLUTION" as const,
      issueDate:      new Date("2025-01-10"),
      expiryDate:     new Date("2025-07-10"),
      policyOrCertNo: "PUC-VJA-2025-0055",
    },
    {
      vehicleId:      vehicles[1].id,
      renewalType:    "INSURANCE" as const,
      issueDate:      new Date("2025-02-15"),
      expiryDate:     new Date("2026-02-14"),
      policyOrCertNo: "NIC/AP/2025/012",
      provider:       "National Insurance",
    },
    {
      vehicleId:      vehicles[2].id,
      renewalType:    "INSURANCE" as const,
      issueDate:      new Date("2025-04-01"),
      expiryDate:     new Date("2026-03-31"),
      policyOrCertNo: "UIIC/TS/2025/334",
      provider:       "United India Insurance",
    },
  ];

  for (const r of renewalData) {
    await db.renewal.upsert({
      where:  { vehicleId_renewalType: { vehicleId: r.vehicleId, renewalType: r.renewalType } },
      update: { expiryDate: r.expiryDate },
      create: { ...r, updatedById: superAdmin.id },
    });
  }
  console.log(`✅  Demo renewals seeded`);

  console.log("\n🎉  Seed complete!");
  console.log("   Super Admin:    admin@vaibhavjewellers.com / admin123");
  console.log("   Branch Manager: vja.manager@vaibhavjewellers.com / branch123");
  console.log("   Accounts:       accounts@vaibhavjewellers.com / branch123");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
