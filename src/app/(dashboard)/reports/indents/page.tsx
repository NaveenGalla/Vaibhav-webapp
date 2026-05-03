import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; branch?: string; vehicle?: string }>;
}

export default async function IndentReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;
  const params = await searchParams;
  const isAdmin = ["Super Admin", "Admin"].includes(user?.role);
  const selectedBranch = isAdmin ? params.branch : user?.branchId;
  const branchFilter = selectedBranch ? { branchId: selectedBranch } : {};
  const where: Record<string, unknown> = { ...branchFilter };
  if (params.from || params.to) where.vehicleReqDate = { gte: params.from ? new Date(params.from) : undefined, lte: params.to ? new Date(`${params.to}T23:59:59`) : undefined };
  if (params.vehicle) where.assignedVehicleId = params.vehicle;

  const indents = await db.indent.findMany({
    where,
    include: {
      branch: { select: { name: true } },
      requestedBy: { select: { name: true } },
      assignedVehicle: { select: { vehicleNumber: true } },
      assignedDriver: { select: { name: true } },
      approvals: { select: { status: true, actionedAt: true } },
    },
    orderBy: [{ vehicleReqDate: "desc" }, { createdAt: "desc" }],
    take: 150,
  });
  const open = indents.filter((i) => !["CLOSED", "CANCELLED", "REJECTED"].includes(i.status)).length;
  const km = indents.reduce((sum, i) => sum + Math.max(0, (i.actualEndKm ?? 0) - (i.actualStartKm ?? 0)), 0);
  const expense = indents.reduce((sum, i) => sum + Number(i.actualExpense ?? 0), 0);
  const [branches, vehicles] = await Promise.all([
    isAdmin ? db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.vehicle.findMany({ where: branchFilter, select: { id: true, vehicleNumber: true }, orderBy: { vehicleNumber: "asc" } }),
  ]);

  return (
    <ReportShell title="Indent & Approval Report" subtitle={`${indents.length} indent records`} exportHref={`/api/reports/indents/export?${new URLSearchParams(params)}`}>
      <FilterForm params={params} reset="/reports/indents" branches={branches} vehicles={vehicles} showBranch={isAdmin} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Open Trips" value={String(open)} />
        <Metric label="Actual KM" value={formatKm(km)} />
        <Metric label="Trip Expense" value={formatCurrency(expense)} />
      </div>
      <Table headers={["Indent", "Date", "Branch", "Purpose", "Destination", "Status", "Vehicle", "Driver", "Estimated KM", "Actual KM", "Approvals"]}>
        {indents.map((i) => {
          const actualKm = i.actualStartKm != null && i.actualEndKm != null ? i.actualEndKm - i.actualStartKm : null;
          return (
            <tr key={i.id}>
              <td><Link href={`/indents/${i.id}`} className="font-mono text-xs font-semibold hover:underline">{i.indentNumber}</Link></td>
              <td>{formatDate(i.vehicleReqDate)}</td>
              <td>{i.branch.name}</td>
              <td className="max-w-xs truncate">{i.purpose}</td>
              <td>{i.destination ?? "—"}</td>
              <td><span className={`badge ${i.status === "APPROVED" || i.status === "ASSIGNED" ? "badge-green" : i.status === "REJECTED" ? "badge-red" : i.status === "IN_USE" ? "badge-blue" : "badge-gray"}`}>{i.status.replace(/_/g, " ")}</span></td>
              <td>{i.assignedVehicle?.vehicleNumber ?? "—"}</td>
              <td>{i.assignedDriver?.name ?? "—"}</td>
              <td>{formatKm(i.estimatedKm)}</td>
              <td>{formatKm(actualKm)}</td>
              <td>{i.approvals.filter((a) => a.status === "APPROVED").length}/{i.approvals.length}</td>
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
function FilterForm({ params, reset, branches, vehicles, showBranch }: { params: { from?: string; to?: string; branch?: string; vehicle?: string }; reset: string; branches: { id: string; name: string }[]; vehicles: { id: string; vehicleNumber: string }[]; showBranch: boolean }) {
  return <div className="card mb-4 py-3"><form method="GET" className="flex flex-wrap gap-3"><input type="date" name="from" defaultValue={params.from ?? ""} className="form-input w-auto" /><input type="date" name="to" defaultValue={params.to ?? ""} className="form-input w-auto" />{showBranch && <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto"><option value="">All branches</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}<select name="vehicle" defaultValue={params.vehicle ?? ""} className="form-input w-auto"><option value="">All vehicles</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}</select><button type="submit" className="btn-primary px-5">Apply</button><Link href={reset} className="btn-ghost px-4">Reset</Link></form></div>;
}
