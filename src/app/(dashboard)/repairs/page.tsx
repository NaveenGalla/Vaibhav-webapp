import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export default async function RepairsPage() {
  const entries = await db.repairEntry.findMany({
    include: { vehicle: { select: { vehicleNumber: true, vehicleName: true } }, createdBy: { select: { name: true } } },
    orderBy: [{ repairDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  const total = entries.reduce((sum, e) => sum + Number(e.cost ?? 0), 0);
  return (
    <ModulePage title="Repair Records" subtitle={`${entries.length} records`} addHref="/repairs/new">
      <Summary total={formatCurrency(total)} label="Repair Spend" count={entries.length} />
      <Table headers={["Date", "Vehicle", "Type", "Odometer", "Vendor", "Invoice", "Cost", "By"]}>
        {entries.map((e) => <tr key={e.id}><td>{formatDate(e.repairDate)}</td><td><Vehicle v={e.vehicle} /></td><td>{e.repairType ?? "—"}</td><td>{formatKm(e.odometer)}</td><td>{e.vendor ?? "—"}</td><td className="font-mono text-xs">{e.invoiceNumber ?? "—"}</td><td className="font-semibold">{formatCurrency(Number(e.cost ?? 0))}</td><td>{e.createdBy?.name ?? "—"}</td></tr>)}
      </Table>
    </ModulePage>
  );
}

function ModulePage({ title, subtitle, addHref, children }: { title: string; subtitle: string; addHref: string; children: ReactNode }) {
  return <div><div className="mb-5 flex items-center justify-between"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div><Link href={addHref} className="btn-primary">Add</Link></div>{children}</div>;
}
function Summary({ total, label, count }: { total: string; label: string; count: number }) { return <div className="mb-5 grid gap-3 sm:grid-cols-2"><div className="card py-3"><p className="kpi-label">{label}</p><p className="kpi-value mt-1 text-xl">{total}</p></div><div className="card py-3"><p className="kpi-label">Total Records</p><p className="kpi-value mt-1 text-xl">{count}</p></div></div>; }
function Table({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="card p-0 overflow-hidden"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>; }
function Vehicle({ v }: { v: { vehicleNumber: string; vehicleName: string | null } }) { return <><p className="font-semibold text-slate-950">{v.vehicleNumber}</p>{v.vehicleName && <p className="text-xs text-gray-400">{v.vehicleName}</p>}</>; }
