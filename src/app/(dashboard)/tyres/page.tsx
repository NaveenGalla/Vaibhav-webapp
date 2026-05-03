import { db } from "@/lib/db";
import { formatCurrency, formatDate, formatKm } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export default async function TyresPage() {
  const entries = await db.tyreRecord.findMany({
    include: { vehicle: { select: { vehicleNumber: true, vehicleName: true } }, enteredBy: { select: { name: true } } },
    orderBy: [{ recordDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  const total = entries.reduce((sum, e) => sum + Number(e.cost ?? 0), 0);
  return (
    <Page title="Tyre Records" subtitle={`${entries.length} records`} addHref="/tyres/new">
      <div className="mb-5 grid gap-3 sm:grid-cols-2"><Card label="Tyre Spend" value={formatCurrency(total)} /><Card label="Records" value={String(entries.length)} /></div>
      <Table headers={["Date", "Vehicle", "Position", "Brand / Size", "Qty", "Odometer", "Next Change", "Cost", "By"]}>
        {entries.map((e) => <tr key={e.id}><td>{formatDate(e.recordDate)}</td><td><Vehicle v={e.vehicle} /></td><td>{e.tyrePosition ?? "—"}</td><td>{e.tyreBrand ?? "—"}{e.tyreSize ? ` / ${e.tyreSize}` : ""}</td><td>{e.quantity ?? "—"}</td><td>{formatKm(e.odometer)}</td><td>{formatKm(e.nextChangeKm)}</td><td className="font-semibold">{formatCurrency(Number(e.cost ?? 0))}</td><td>{e.enteredBy?.name ?? "—"}</td></tr>)}
      </Table>
    </Page>
  );
}

function Page({ title, subtitle, addHref, children }: { title: string; subtitle: string; addHref: string; children: ReactNode }) { return <div><div className="mb-5 flex items-center justify-between"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div><Link href={addHref} className="btn-primary">Add</Link></div>{children}</div>; }
function Card({ label, value }: { label: string; value: string }) { return <div className="card py-3"><p className="kpi-label">{label}</p><p className="kpi-value mt-1 text-xl">{value}</p></div>; }
function Table({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="card p-0 overflow-hidden"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>; }
function Vehicle({ v }: { v: { vehicleNumber: string; vehicleName: string | null } }) { return <><p className="font-semibold text-slate-950">{v.vehicleNumber}</p>{v.vehicleName && <p className="text-xs text-gray-400">{v.vehicleName}</p>}</>; }
