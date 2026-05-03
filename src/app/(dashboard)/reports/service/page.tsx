import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; branch?: string; vehicle?: string }>;
}

export default async function ServiceRepairReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;
  const params = await searchParams;
  const isAdmin = ["Super Admin", "Admin"].includes(user?.role);
  const selectedBranch = isAdmin ? params.branch : user?.branchId;
  const branchFilter = selectedBranch ? { branchId: selectedBranch } : {};
  const dateFilter = params.from || params.to
    ? { gte: params.from ? new Date(params.from) : undefined, lte: params.to ? new Date(`${params.to}T23:59:59`) : undefined }
    : undefined;

  const [services, repairs] = await Promise.all([
    db.serviceEntry.findMany({
      where: { ...branchFilter, ...(params.vehicle ? { vehicleId: params.vehicle } : {}), ...(dateFilter ? { serviceDate: dateFilter } : {}) },
      include: { vehicle: { select: { vehicleNumber: true, vehicleName: true, branch: { select: { name: true } } } } },
      orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
    db.repairEntry.findMany({
      where: { ...(dateFilter ? { repairDate: dateFilter } : {}), ...(params.vehicle ? { vehicleId: params.vehicle } : {}), vehicle: branchFilter },
      include: { vehicle: { select: { vehicleNumber: true, vehicleName: true, branch: { select: { name: true } } } } },
      orderBy: [{ repairDate: "desc" }, { createdAt: "desc" }],
      take: 100,
    }),
  ]);
  const serviceCost = services.reduce((sum, s) => sum + Number(s.cost ?? 0), 0);
  const repairCost = repairs.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);
  const [branches, vehicles] = await Promise.all([
    isAdmin ? db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.vehicle.findMany({ where: branchFilter, select: { id: true, vehicleNumber: true }, orderBy: { vehicleNumber: "asc" } }),
  ]);

  const rows = [
    ...services.map((s) => ({
      id: s.id,
      date: s.serviceDate,
      kind: "Service",
      vehicle: s.vehicle,
      type: s.serviceType,
      odometer: s.odometer,
      vendor: s.vendor,
      invoice: s.invoiceNumber,
      cost: Number(s.cost ?? 0),
      nextDue: s.nextServiceDate ? formatDate(s.nextServiceDate) : formatKm(s.nextServiceKm),
    })),
    ...repairs.map((r) => ({
      id: r.id,
      date: r.repairDate,
      kind: "Repair",
      vehicle: r.vehicle,
      type: r.repairType ?? "Repair",
      odometer: r.odometer,
      vendor: r.vendor,
      invoice: r.invoiceNumber,
      cost: Number(r.cost ?? 0),
      nextDue: "—",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 150);

  return (
    <ReportShell title="Service & Repair Report" subtitle={`${rows.length} recent records`} exportHref={`/api/reports/service/export?${new URLSearchParams(params)}`}>
      <FilterForm params={params} reset="/reports/service" branches={branches} vehicles={vehicles} showBranch={isAdmin} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Service Cost" value={formatCurrency(serviceCost)} />
        <Metric label="Repair Cost" value={formatCurrency(repairCost)} />
        <Metric label="Total Cost" value={formatCurrency(serviceCost + repairCost)} />
      </div>
      <Table headers={["Date", "Vehicle", "Branch", "Kind", "Type", "Odometer", "Vendor", "Invoice", "Cost", "Next Due"]}>
        {rows.map((r) => (
          <tr key={`${r.kind}-${r.id}`}>
            <td>{formatDate(r.date)}</td>
            <td><p className="font-semibold text-slate-950">{r.vehicle.vehicleNumber}</p>{r.vehicle.vehicleName && <p className="text-xs text-gray-400">{r.vehicle.vehicleName}</p>}</td>
            <td>{r.vehicle.branch?.name ?? "—"}</td>
            <td><span className={`badge ${r.kind === "Service" ? "badge-blue" : "badge-amber"}`}>{r.kind}</span></td>
            <td>{r.type}</td>
            <td>{formatKm(r.odometer)}</td>
            <td>{r.vendor ?? "—"}</td>
            <td className="font-mono text-xs">{r.invoice ?? "—"}</td>
            <td className="font-semibold">{formatCurrency(r.cost)}</td>
            <td>{r.nextDue}</td>
          </tr>
        ))}
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
function FilterForm({ params, reset, branches, vehicles, showBranch }: { params: { from?: string; to?: string; branch?: string; vehicle?: string }; reset: string; branches: { id: string; name: string }[]; vehicles: { id: string; vehicleNumber: string }[]; showBranch: boolean }) {
  return <div className="card mb-4 py-3"><form method="GET" className="flex flex-wrap gap-3"><input type="date" name="from" defaultValue={params.from ?? ""} className="form-input w-auto" /><input type="date" name="to" defaultValue={params.to ?? ""} className="form-input w-auto" />{showBranch && <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto"><option value="">All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}<select name="vehicle" defaultValue={params.vehicle ?? ""} className="form-input w-auto"><option value="">All vehicles</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}</select><button type="submit" className="btn-primary px-5">Apply</button><Link href={reset} className="btn-ghost px-4">Reset</Link></form></div>;
}
