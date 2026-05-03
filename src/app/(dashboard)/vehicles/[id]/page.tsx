// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Profile & Life History page
// Shows every record associated with a vehicle in chronological order.
// ─────────────────────────────────────────────────────────────────────────────
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatKm, daysUntil, renewalStatusColor } from "@/lib/utils";
import IconMark from "@/components/ui/IconMark";
import VehicleLifeTimeline from "@/components/vehicles/VehicleLifeTimeline";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ── Pull everything about this vehicle in one shot ──────────────────────────
async function getVehicleFull(id: string) {
  return db.vehicle.findUnique({
    where: { id },
    include: {
      branch: true,
      driver: true,
      documents: {
        orderBy: { expiryDate: "asc" },
      },
      reminders: {
        where: { isAcknowledged: false },
        orderBy: { dueDate: "asc" },
        take: 10,
      },
      fuelEntries: {
        include: { enteredBy: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 20,
      },
      serviceEntries: {
        include: { enteredBy: { select: { name: true } } },
        orderBy: { serviceDate: "desc" },
        take: 10,
      },
      repairEntries: {
        orderBy: { repairDate: "desc" },
        take: 10,
      },
      tyreRecords: {
        orderBy: { recordDate: "desc" },
        take: 10,
      },
      accidentRecords: {
        orderBy: { accidentDate: "desc" },
        take: 10,
      },
      indents: {
        include: {
          requestedBy: { select: { name: true } },
          assignedDriver: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      },
      // Expense aggregate — sum fuel + service + repair
      _count: {
        select: {
          fuelEntries:    true,
          serviceEntries: true,
          repairEntries:  true,
          documents:      true,
          indents:        true,
          accidentRecords: true,
        },
      },
    },
  });
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    ACTIVE:     "badge-green",
    IN_SERVICE: "badge-amber",
    INACTIVE:   "badge-gray",
    DISPOSED:   "badge-red",
  };
  return (
    <span className={`badge ${cls[status] ?? "badge-gray"} text-sm px-3 py-1`}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Document renewal card ─────────────────────────────────────────────────────
function DocRenewalCard({
  label,
  expiryDate,
}: {
  label: string;
  expiryDate: Date | null;
}) {
  if (!expiryDate) {
    return (
      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-400 mt-0.5">Not recorded</p>
      </div>
    );
  }
  const days  = daysUntil(expiryDate) ?? 0;  // null only when date is null, guarded above
  const color = renewalStatusColor(days);
  return (
    <div className={`rounded-xl border p-3 ${color === "red" ? "border-red-200 bg-red-50" : color === "amber" ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5 text-gray-800">
        {formatDate(expiryDate)}
      </p>
      <p className={`mt-0.5 text-xs ${color === "red" ? "text-red-600" : color === "amber" ? "text-amber-700" : "text-green-700"}`}>
        {days < 0
          ? `Expired ${Math.abs(days)} days ago`
          : days === 0
          ? "Expires today!"
          : `${days} days left`}
      </p>
    </div>
  );
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;

  const vehicle = await getVehicleFull(id);
  if (!vehicle) notFound();

  // ── Aggregate cost figures ────────────────────────────────────────────────
  type FuelE    = (typeof vehicle.fuelEntries)[number];
  type ServiceE = (typeof vehicle.serviceEntries)[number];
  type RepairE  = (typeof vehicle.repairEntries)[number];
  type DocE     = (typeof vehicle.documents)[number];

  const totalFuelAmount = vehicle.fuelEntries.reduce(
    (s: number, e: FuelE) => s + Number(e.totalAmount),
    0,
  );
  const totalServiceCost = vehicle.serviceEntries.reduce(
    (s: number, e: ServiceE) => s + Number(e.laborCost ?? 0) + Number(e.partsCost ?? 0),
    0,
  );
  const totalRepairCost = vehicle.repairEntries.reduce(
    (s: number, e: RepairE) => s + Number(e.cost ?? 0),
    0,
  );
  const totalExpense = totalFuelAmount + totalServiceCost + totalRepairCost;

  // ── Fuel efficiency (km per litre) from last 5 entries ───────────────────
  const recentFuel = vehicle.fuelEntries.slice(0, 5);
  const avgKmpl =
    recentFuel.length >= 2
      ? (() => {
          const totalKm =
            Number(recentFuel[0].closingKm ?? recentFuel[0].odometer) -
            Number(recentFuel[recentFuel.length - 1].odometer);
          const totalLitres = recentFuel.reduce(
            (s: number, e: FuelE) => s + Number(e.quantityLitres), 0,
          );
          return totalKm > 0 && totalLitres > 0
            ? (totalKm / totalLitres).toFixed(1)
            : null;
        })()
      : null;

  // ── Get document expiry per type ─────────────────────────────────────────
  const getDocExpiry = (type: string) => {
    const d = vehicle.documents.find((doc: DocE) => doc.documentType === type);
    return d?.expiryDate ?? null;
  };

  const canEdit = ["Super Admin", "Admin", "Vehicle Manager"].includes(user?.role);

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Back + Action bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/vehicles" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back to Vehicles
        </Link>
        {canEdit && (
          <Link href={`/vehicles/${id}/edit`} className="btn-secondary flex items-center gap-1.5">
            <IconMark label="E" /> Edit Vehicle
          </Link>
        )}
      </div>

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <div className="card detail-hero mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#f1f5f9" }}
            >
              <IconMark label="V" size="md" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 tracking-wide">
                {vehicle.vehicleNumber}
              </h1>
              {vehicle.vehicleName && (
                <p className="text-sm detail-hero-muted">
                  {vehicle.vehicleName}
                </p>
              )}
              <p className="text-sm mt-0.5 detail-hero-muted">
                {vehicle.make} {vehicle.model} · {vehicle.yearOfManufacture ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <StatusBadge status={vehicle.status} />
            <div className="text-right">
              <p className="text-xs detail-hero-muted">Odometer</p>
              <p className="text-lg font-bold text-slate-950">{formatKm(vehicle.odometer)}</p>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-200/80">
          {[
            { label: "Branch",   value: vehicle.branch?.name ?? "—", icon: <IconMark label="B" /> },
            { label: "Driver",   value: vehicle.driver?.name  ?? "Unassigned", icon: <IconMark label="D" /> },
            { label: "Fuel Type", value: vehicle.fuelType, icon: <IconMark label="F" /> },
            { label: "Ownership", value: vehicle.ownershipType, icon: <IconMark label="O" /> },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-1 text-xs mb-0.5 detail-hero-muted">
                {s.icon} {s.label}
              </div>
              <p className="text-sm font-semibold text-slate-950">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Expense KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Expense",  value: formatCurrency(totalExpense),   sub: "Fuel + Service + Repair" },
          { label: "Fuel Cost",      value: formatCurrency(totalFuelAmount), sub: `${vehicle._count.fuelEntries} entries` },
          { label: "Service Cost",   value: formatCurrency(totalServiceCost), sub: `${vehicle._count.serviceEntries} services` },
          { label: "Avg Fuel Eff.", value: avgKmpl ? `${avgKmpl} km/L` : "—", sub: "Last 5 fill-ups" },
        ].map((k) => (
          <div key={k.label} className="card py-4">
            <p className="kpi-label">{k.label}</p>
            <p className="kpi-value text-xl mt-1">{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Document Renewals ────────────────────────────────────────────── */}
      <div className="card mb-6">
        <h3 className="section-title mb-4">
          Document Renewals
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <DocRenewalCard label="Insurance"    expiryDate={getDocExpiry("INSURANCE")} />
          <DocRenewalCard label="Pollution"    expiryDate={getDocExpiry("POLLUTION")} />
          <DocRenewalCard label="Fitness"      expiryDate={getDocExpiry("FITNESS")} />
          <DocRenewalCard label="Permit"       expiryDate={getDocExpiry("PERMIT")} />
          <DocRenewalCard label="Road Tax"     expiryDate={getDocExpiry("ROAD_TAX")} />
          <DocRenewalCard label="Registration" expiryDate={vehicle.registrationExpiry} />
        </div>
        <div className="mt-3 flex justify-end">
          <Link href={`/vehicles/${id}/documents`} className="interactive-link text-sm">
            Manage documents
          </Link>
        </div>
      </div>

      {/* ── Active Reminders ─────────────────────────────────────────────── */}
      {vehicle.reminders.length > 0 && (
        <div className="card mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-3">
            <IconMark label="!" />
            <h3 className="font-semibold text-amber-800">
              Active Reminders ({vehicle.reminders.length})
            </h3>
          </div>
          <div className="space-y-2">
            {vehicle.reminders.map((r: (typeof vehicle.reminders)[number]) => (
              <div key={r.id} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-amber-200">
                <span className="font-medium text-gray-700">{r.type.replace(/_/g, " ")}</span>
                <span className="text-amber-700">{formatDate(r.dueDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabbed life-history timeline ──────────────────────────────────── */}
      <VehicleLifeTimeline vehicle={vehicle} />
    </div>
  );
}
