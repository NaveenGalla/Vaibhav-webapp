// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — main overview page
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Inline types (mirrors the Prisma query result shapes — avoids dependency on
// generated @prisma/client types before "prisma generate" has been run)
type RecentIndent = {
  id: string;
  indentNumber: string;
  vehicleReqDate: Date;
  status: string;
  requestedBy: { name: string | null };
  assignedVehicle: { vehicleNumber: string } | null;
};

type RecentFuelEntry = {
  id: string;
  date: Date;
  quantityLitres: unknown; // Prisma Decimal — convert with Number()
  totalAmount: unknown;
  approvalStatus: string;
  vehicle: { vehicleNumber: string; vehicleName: string | null };
};

// Fetch all KPI data server-side
async function getDashboardData(userId: string, role: string, branchId: string | null) {
  // Branch filter — non-admin roles only see their own branch
  const branchFilter = ["Super Admin", "Admin"].includes(role)
    ? {}
    : { branchId: branchId ?? undefined };

  const [
    totalVehicles,
    activeVehicles,
    inServiceVehicles,
    pendingIndents,
    pendingApprovals,
    pendingFuelApprovals,
    expiringDocs,
    recentFuel,
    recentIndents,
  ] = await Promise.all([
    // Total vehicles
    db.vehicle.count({ where: branchFilter }),

    // Active vehicles
    db.vehicle.count({ where: { ...branchFilter, status: "ACTIVE" } }),

    // Vehicles under service
    db.vehicle.count({ where: { ...branchFilter, status: "IN_SERVICE" } }),

    // Pending indents (submitted, not yet approved)
    db.indent.count({
      where: {
        ...branchFilter,
        status: { in: ["SUBMITTED", "CORRECTION"] },
      },
    }),

    // Pending approvals for this user's branch
    db.indentApproval.count({
      where: {
        status: "PENDING",
        indent: { ...branchFilter },
      },
    }),

    // Pending fuel approvals
    db.fuelEntry.count({
      where: {
        ...branchFilter,
        approvalStatus: "PENDING",
      },
    }),

    // Documents expiring in next 30 days
    db.vehicleDocument.count({
      where: {
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        vehicle: branchFilter,
      },
    }),

    // Recent fuel entries (last 5)
    db.fuelEntry.findMany({
      where: branchFilter,
      include: { vehicle: { select: { vehicleNumber: true, vehicleName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // Recent indents (last 5)
    db.indent.findMany({
      where: branchFilter,
      include: {
        requestedBy: { select: { name: true } },
        assignedVehicle: { select: { vehicleNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalVehicles,
    activeVehicles,
    inServiceVehicles,
    pendingIndents,
    pendingApprovals,
    pendingFuelApprovals,
    expiringDocs,
    recentFuel,
    recentIndents,
  };
}

// Status badge helper
function IndentStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "badge-gray",
    SUBMITTED: "badge-blue",
    CORRECTION: "badge-amber",
    APPROVED: "badge-green",
    REJECTED: "badge-red",
    ASSIGNED: "badge-gold",
    IN_USE: "badge-maroon",
    COMPLETED: "badge-green",
    CLOSED: "badge-gray",
    CANCELLED: "badge-gray",
  };
  const label: Record<string, string> = {
    DRAFT: "Draft", SUBMITTED: "Submitted", CORRECTION: "Correction",
    APPROVED: "Approved", REJECTED: "Rejected", ASSIGNED: "Assigned",
    IN_USE: "In Use", COMPLETED: "Completed", CLOSED: "Closed", CANCELLED: "Cancelled",
  };
  return <span className={`badge ${map[status] ?? "badge-gray"}`}>{label[status] ?? status}</span>;
}

function IconMark({ label, color }: { label: string; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold"
      style={{ color }}
    >
      {label}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;

  const data = await getDashboardData(user?.id, user?.role, user?.branchId);

  const fleetHealth = data.totalVehicles > 0
    ? Math.round((data.activeVehicles / data.totalVehicles) * 100)
    : 0;
  const attentionCount = data.inServiceVehicles + data.pendingApprovals + data.pendingFuelApprovals + data.expiringDocs;

  const kpis = [
    {
      label: "Vehicles",
      value: data.totalVehicles,
      sub: `${data.activeVehicles} active · ${data.inServiceVehicles} in service`,
      icon: <IconMark label="V" color="#111827" />,
      iconBg: "#f4f4f5",
      href: "/vehicles",
    },
    {
      label: "Approvals",
      value: data.pendingApprovals,
      sub: `${data.pendingIndents} indent(s) awaiting action`,
      icon: <IconMark label="A" color="#1e40af" />,
      iconBg: "#eff6ff",
      href: "/approvals",
    },
    {
      label: "Fuel Queue",
      value: data.pendingFuelApprovals,
      sub: "Fuel entries awaiting approval",
      icon: <IconMark label="F" color="#067647" />,
      iconBg: "#ecfdf3",
      href: "/fuel",
    },
    {
      label: "Renewals",
      value: data.expiringDocs,
      sub: "Documents expiring in 30 days",
      icon: <IconMark label="R" color="#b54708" />,
      iconBg: "#fffaeb",
      href: "/renewals",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Fleet Command</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">Good to see you, {user?.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            A calmer operating view for vehicles, fuel, approvals, and renewals.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vehicles" className="btn-secondary">View Fleet</Link>
          <Link href="/indents/new" className="btn-primary">New Indent</Link>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <section className="card overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
            <div className="p-6 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">Fleet health</p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-6xl font-semibold tracking-normal text-slate-950">{fleetHealth}%</p>
                    <span className="mb-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {attentionCount === 0 ? "All clear" : `${attentionCount} items need attention`}
                    </span>
                  </div>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                  {data.activeVehicles}/{data.totalVehicles} active
                </div>
              </div>

              <div className="mt-8 h-44 rounded-[1.5rem] bg-[linear-gradient(135deg,#eef4ff,#ffffff_50%,#edfdf4)] p-5">
                <div className="relative h-full">
                  <div className="absolute left-3 top-[56%] h-2 w-[86%] rounded-full bg-slate-900/10" />
                  {[
                    ["left-[6%] top-[34%] h-14 w-14", `${data.activeVehicles} active`],
                    ["left-[43%] top-[18%] h-20 w-20", `${data.pendingFuelApprovals} fuel`],
                    ["right-[8%] top-[38%] h-16 w-16", `${data.expiringDocs} docs`],
                  ].map(([position, label]) => (
                    <div key={label} className={`absolute ${position} flex items-center justify-center rounded-[1.35rem] bg-white text-center text-xs font-semibold text-slate-700 shadow-md ring-1 ring-slate-200`}>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 p-5 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Next Actions</p>
              <div className="mt-4 space-y-3">
                {[
                  ["Approve fuel bills", data.pendingFuelApprovals, "/fuel"],
                  ["Review indents", data.pendingIndents, "/approvals"],
                  ["Check renewals", data.expiringDocs, "/renewals"],
                ].map(([label, value, href]) => (
                  <Link key={label as string} href={href as string} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200/70 hover:bg-slate-50">
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{value}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="card flex items-start gap-4 p-5 transition-transform hover:-translate-y-0.5">
              <div className="kpi-icon" style={{ background: kpi.iconBg }}>
                {kpi.icon}
              </div>
              <div>
                <p className="kpi-label">{kpi.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{kpi.value}</p>
                <p className="mt-1 text-xs text-slate-400">{kpi.sub}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-slate-950">Recent Indents</p>
              <p className="text-xs text-slate-400">Latest trip requests and statuses</p>
            </div>
            <Link href="/indents" className="text-xs font-semibold text-slate-500 hover:text-slate-950">
              View all
            </Link>
          </div>
          {data.recentIndents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No indents yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentIndents.map((indent: RecentIndent) => (
                <Link
                  key={indent.id}
                  href={`/indents/${indent.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 p-3 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {indent.indentNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {indent.requestedBy.name} · {formatDate(indent.vehicleReqDate)}
                    </p>
                  </div>
                  <IndentStatusBadge status={indent.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-slate-950">Recent Fuel</p>
              <p className="text-xs text-slate-400">Latest entries from imported and live data</p>
            </div>
            <Link href="/fuel" className="text-xs font-semibold text-slate-500 hover:text-slate-950">
              View all
            </Link>
          </div>
          {data.recentFuel.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No fuel entries yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recentFuel.map((entry: RecentFuelEntry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {entry.vehicle.vehicleName ?? entry.vehicle.vehicleNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Number(entry.quantityLitres).toFixed(1)} L · {formatDate(entry.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {formatCurrency(Number(entry.totalAmount))}
                    </p>
                    <span className={`badge text-[10px] ${entry.approvalStatus === "APPROVED" ? "badge-green" : entry.approvalStatus === "REJECTED" ? "badge-red" : "badge-amber"}`}>
                      {entry.approvalStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Add Fuel Entry",    href: "/fuel/new",         icon: "F" },
          { label: "Add Service",       href: "/service/new",      icon: "S" },
          { label: "View Reports",      href: "/reports",          icon: "R" },
          { label: "Renewal Alerts",    href: "/renewals",         icon: "!" },
        ].map((ql) => (
          <Link
            key={ql.label}
            href={ql.href}
            className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <IconMark label={ql.icon} color="#111827" />
            {ql.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
