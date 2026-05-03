import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatKm } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

interface PageProps {
  searchParams: Promise<{ branch?: string; status?: string; type?: string }>;
}

export default async function VehicleReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;
  const params = await searchParams;
  const isAdmin = ["Super Admin", "Admin"].includes(user?.role);
  const where: Record<string, unknown> = isAdmin ? {} : { branchId: user?.branchId ?? undefined };
  if (isAdmin && params.branch) where.branchId = params.branch;
  if (params.status) where.status = params.status;
  if (params.type) where.vehicleType = params.type;

  const vehicles = await db.vehicle.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      driver: { select: { name: true } },
      renewals: { select: { renewalType: true, expiryDate: true } },
      _count: { select: { fuelEntries: true, serviceEntries: true, repairEntries: true, documents: true } },
    },
    orderBy: [{ status: "asc" }, { vehicleNumber: "asc" }],
  });
  const active = vehicles.filter((v) => v.status === "ACTIVE").length;
  const inService = vehicles.filter((v) => v.status === "IN_SERVICE").length;
  const dueSoon = vehicles.filter((v) => v.renewals.some((r) => r.expiryDate && daysLeft(r.expiryDate) <= 30)).length;
  const branches = isAdmin ? await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];

  return (
    <ReportShell title="Vehicle Master Report" subtitle={`${vehicles.length} vehicles`} exportHref={`/api/reports/vehicles/export?${new URLSearchParams(params)}`}>
      <div className="card mb-4 py-3">
        <form method="GET" className="flex flex-wrap gap-3">
          {isAdmin && <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto"><option value="">All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
          <select name="status" defaultValue={params.status ?? ""} className="form-input w-auto"><option value="">All statuses</option>{["ACTIVE","IN_SERVICE","INACTIVE","DISPOSED","SCRAPPED","SOLD"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
          <select name="type" defaultValue={params.type ?? ""} className="form-input w-auto"><option value="">All types</option>{["FOUR_WHEELER","TWO_WHEELER","VAN","TRUCK","OTHER"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}</select>
          <button type="submit" className="btn-primary px-5">Apply</button>
          <Link href="/reports/vehicles" className="btn-ghost px-4">Reset</Link>
        </form>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Active" value={String(active)} />
        <Metric label="In Service" value={String(inService)} />
        <Metric label="Renewal Attention" value={String(dueSoon)} />
      </div>
      <Table headers={["Vehicle", "Branch", "Type", "Fuel", "Ownership", "Odometer", "Driver", "Status", "Insurance", "Fitness", "Activity"]}>
        {vehicles.map((v) => (
          <tr key={v.id}>
            <td><Link href={`/vehicles/${v.id}`} className="font-semibold text-slate-950 hover:underline">{v.vehicleNumber}</Link>{v.vehicleName && <p className="text-xs text-gray-400">{v.vehicleName}</p>}</td>
            <td>{v.branch?.name ?? "—"}</td>
            <td>{v.vehicleType.replace(/_/g, " ")}</td>
            <td><span className="badge badge-gray">{v.fuelType}</span></td>
            <td>{v.ownershipType}</td>
            <td>{formatKm(v.odometer)}</td>
            <td>{v.driver?.name ?? "—"}</td>
            <td><span className={`badge ${v.status === "ACTIVE" ? "badge-green" : v.status === "IN_SERVICE" ? "badge-blue" : "badge-gray"}`}>{v.status.replace(/_/g, " ")}</span></td>
            <td>{formatDate(v.renewals.find((r) => r.renewalType === "INSURANCE")?.expiryDate)}</td>
            <td>{formatDate(v.renewals.find((r) => r.renewalType === "FITNESS")?.expiryDate)}</td>
            <td>{v._count.fuelEntries} fuel / {v._count.serviceEntries + v._count.repairEntries} service</td>
          </tr>
        ))}
      </Table>
    </ReportShell>
  );
}

function daysLeft(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}
function ReportShell({ title, subtitle, exportHref, children }: { title: string; subtitle: string; exportHref: string; children: ReactNode }) {
  return <div><div className="mb-6 flex items-center gap-3"><Link href="/reports" className="text-sm text-gray-500 hover:text-gray-800">Reports</Link><div className="flex-1"><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div><a href={exportHref} className="btn-secondary text-sm">Export CSV</a></div>{children}</div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card py-3"><p className="kpi-label">{label}</p><p className="kpi-value mt-1 text-xl">{value}</p></div>;
}
function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="card p-0 overflow-hidden"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>;
}
