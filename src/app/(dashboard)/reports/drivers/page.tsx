import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ branch?: string; status?: string }>;
}

export default async function DriverUsageReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;
  const params = await searchParams;
  const isAdmin = ["Super Admin", "Admin"].includes(user?.role);
  const branchFilter = isAdmin ? (params.branch ? { branchId: params.branch } : {}) : { branchId: user?.branchId ?? undefined };
  const where = { ...branchFilter, ...(params.status === "active" ? { isActive: true } : params.status === "inactive" ? { isActive: false } : {}) };

  const drivers = await db.driver.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      assignedVehicles: { select: { vehicleNumber: true }, take: 3 },
      indentsAssigned: { select: { actualStartKm: true, actualEndKm: true, status: true } },
      fuelEntries: { select: { quantityLitres: true, totalAmount: true } },
      accidentRecords: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });
  const totalTrips = drivers.reduce((sum, d) => sum + d.indentsAssigned.length, 0);
  const totalFuel = drivers.reduce((sum, d) => sum + d.fuelEntries.reduce((s, f) => s + Number(f.totalAmount ?? 0), 0), 0);
  const branches = isAdmin ? await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];

  return (
    <ReportShell title="Driver Usage Report" subtitle={`${drivers.length} drivers`} exportHref={`/api/reports/drivers/export?${new URLSearchParams(params)}`}>
      <div className="card mb-4 py-3"><form method="GET" className="flex flex-wrap gap-3">{isAdmin && <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto"><option value="">All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}<select name="status" defaultValue={params.status ?? ""} className="form-input w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button type="submit" className="btn-primary px-5">Apply</button><Link href="/reports/drivers" className="btn-ghost px-4">Reset</Link></form></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Drivers" value={String(drivers.length)} />
        <Metric label="Assigned Trips" value={String(totalTrips)} />
        <Metric label="Fuel Amount" value={formatCurrency(totalFuel)} />
      </div>
      <Table headers={["Driver", "Branch", "License Expiry", "Assigned Vehicles", "Trips", "Completed", "KM Travelled", "Fuel Litres", "Fuel Amount", "Accidents"]}>
        {drivers.map((d) => {
          const tripKm = d.indentsAssigned.reduce((sum, i) => sum + Math.max(0, (i.actualEndKm ?? 0) - (i.actualStartKm ?? 0)), 0);
          const litres = d.fuelEntries.reduce((sum, f) => sum + Number(f.quantityLitres ?? 0), 0);
          const amount = d.fuelEntries.reduce((sum, f) => sum + Number(f.totalAmount ?? 0), 0);
          return (
            <tr key={d.id}>
              <td><p className="font-semibold text-slate-950">{d.name}</p>{d.employeeId && <p className="text-xs text-gray-400">{d.employeeId}</p>}</td>
              <td>{d.branch?.name ?? "—"}</td>
              <td>{formatDate(d.licenseExpiry)}</td>
              <td>{d.assignedVehicles.length ? d.assignedVehicles.map((v) => v.vehicleNumber).join(", ") : "—"}</td>
              <td>{d.indentsAssigned.length}</td>
              <td>{d.indentsAssigned.filter((i) => ["COMPLETED", "CLOSED"].includes(i.status)).length}</td>
              <td>{formatKm(tripKm)}</td>
              <td>{litres.toFixed(1)} L</td>
              <td className="font-semibold">{formatCurrency(amount)}</td>
              <td>{d.accidentRecords.length}</td>
            </tr>
          );
        })}
      </Table>
    </ReportShell>
  );
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
