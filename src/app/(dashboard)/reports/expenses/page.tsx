import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type ExpenseRow = {
  vehicle: string;
  branch: string;
  fuel: number;
  service: number;
  repair: number;
  tyres: number;
};

interface PageProps {
  searchParams: Promise<{ month?: string; branch?: string; vehicle?: string }>;
}

export default async function ExpenseReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;
  const params = await searchParams;
  const isAdmin = ["Super Admin", "Admin"].includes(user?.role);
  const selectedBranch = isAdmin ? params.branch : user?.branchId;
  const branchFilter = selectedBranch ? { branchId: selectedBranch } : {};
  const now = params.month ? new Date(`${params.month}-01`) : new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [fuel, services, repairs, tyres] = await Promise.all([
    db.fuelEntry.findMany({ where: { ...branchFilter, ...(params.vehicle ? { vehicleId: params.vehicle } : {}), date: { gte: from, lte: to } }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
    db.serviceEntry.findMany({ where: { ...branchFilter, ...(params.vehicle ? { vehicleId: params.vehicle } : {}), serviceDate: { gte: from, lte: to } }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
    db.repairEntry.findMany({ where: { ...(params.vehicle ? { vehicleId: params.vehicle } : {}), repairDate: { gte: from, lte: to }, vehicle: branchFilter }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
    db.tyreRecord.findMany({ where: { ...(params.vehicle ? { vehicleId: params.vehicle } : {}), recordDate: { gte: from, lte: to }, vehicle: branchFilter }, include: { vehicle: { select: { vehicleNumber: true, branch: { select: { name: true } } } } } }),
  ]);
  const [branches, vehicles] = await Promise.all([
    isAdmin ? db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.vehicle.findMany({ where: branchFilter, select: { id: true, vehicleNumber: true }, orderBy: { vehicleNumber: "asc" } }),
  ]);

  const map = new Map<string, ExpenseRow>();
  const ensure = (vehicle: string, branch: string) => {
    if (!map.has(vehicle)) map.set(vehicle, { vehicle, branch, fuel: 0, service: 0, repair: 0, tyres: 0 });
    return map.get(vehicle)!;
  };
  fuel.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "—").fuel += Number(e.totalAmount ?? 0));
  services.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "—").service += Number(e.cost ?? 0));
  repairs.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "—").repair += Number(e.cost ?? 0));
  tyres.forEach((e) => ensure(e.vehicle.vehicleNumber, e.vehicle.branch?.name ?? "—").tyres += Number(e.cost ?? 0));
  const rows = Array.from(map.values()).sort((a, b) => total(b) - total(a));
  const grand = rows.reduce((sum, row) => sum + total(row), 0);

  return (
    <ReportShell title="Monthly Expense Report" subtitle={`Month from ${from.toLocaleDateString("en-IN")}`} exportHref={`/api/reports/expenses/export?${new URLSearchParams(params)}`}>
      <div className="card mb-4 py-3"><form method="GET" className="flex flex-wrap gap-3"><input type="month" name="month" defaultValue={params.month ?? from.toISOString().slice(0, 7)} className="form-input w-auto" />{isAdmin && <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto"><option value="">All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}<select name="vehicle" defaultValue={params.vehicle ?? ""} className="form-input w-auto"><option value="">All vehicles</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}</select><button type="submit" className="btn-primary px-5">Apply</button><Link href="/reports/expenses" className="btn-ghost px-4">Reset</Link></form></div>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Total Expense" value={formatCurrency(grand)} />
        <Metric label="Fuel" value={formatCurrency(rows.reduce((s, r) => s + r.fuel, 0))} />
        <Metric label="Service & Repair" value={formatCurrency(rows.reduce((s, r) => s + r.service + r.repair, 0))} />
        <Metric label="Tyres" value={formatCurrency(rows.reduce((s, r) => s + r.tyres, 0))} />
      </div>
      <Table headers={["Vehicle", "Branch", "Fuel", "Service", "Repair", "Tyres", "Total"]}>
        {rows.map((r) => (
          <tr key={r.vehicle}>
            <td className="font-semibold text-slate-950">{r.vehicle}</td>
            <td>{r.branch}</td>
            <td>{formatCurrency(r.fuel)}</td>
            <td>{formatCurrency(r.service)}</td>
            <td>{formatCurrency(r.repair)}</td>
            <td>{formatCurrency(r.tyres)}</td>
            <td className="font-semibold">{formatCurrency(total(r))}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-400">No expenses this month.</td></tr>}
      </Table>
    </ReportShell>
  );
}

function total(row: ExpenseRow) {
  return row.fuel + row.service + row.repair + row.tyres;
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
