import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

export default async function AccidentsPage() {
  const entries = await db.accidentRecord.findMany({
    include: { vehicle: { select: { vehicleNumber: true, vehicleName: true } }, driver: { select: { name: true } }, enteredBy: { select: { name: true } } },
    orderBy: [{ accidentDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  const pending = entries.filter(e => e.repairStatus !== "REPAIRED").length;
  return (
    <Page title="Accident Records" subtitle={`${entries.length} incidents`} addHref="/accidents/new">
      <div className="mb-5 grid gap-3 sm:grid-cols-2"><Card label="Open Incidents" value={String(pending)} /><Card label="Repair Cost" value={formatCurrency(entries.reduce((s,e)=>s+Number(e.repairCost??0),0))} /></div>
      <Table headers={["Date", "Vehicle", "Driver", "Location", "Description", "Estimate", "Repair Cost", "Status", "By"]}>
        {entries.map((e) => <tr key={e.id}><td>{formatDate(e.accidentDate)}</td><td><Vehicle v={e.vehicle} /></td><td>{e.driver?.name ?? "—"}</td><td>{e.location ?? "—"}</td><td className="max-w-xs truncate">{e.description}</td><td>{formatCurrency(Number(e.damageEstimate ?? 0))}</td><td className="font-semibold">{formatCurrency(Number(e.repairCost ?? 0))}</td><td><span className={`badge ${e.repairStatus === "REPAIRED" ? "badge-green" : e.repairStatus === "IN_REPAIR" ? "badge-blue" : "badge-amber"}`}>{e.repairStatus.replace("_", " ")}</span></td><td>{e.enteredBy?.name ?? "—"}</td></tr>)}
      </Table>
    </Page>
  );
}

function Page({ title, subtitle, addHref, children }: { title: string; subtitle: string; addHref: string; children: ReactNode }) { return <div><div className="mb-5 flex items-center justify-between"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div><Link href={addHref} className="btn-primary">Add</Link></div>{children}</div>; }
function Card({ label, value }: { label: string; value: string }) { return <div className="card py-3"><p className="kpi-label">{label}</p><p className="kpi-value mt-1 text-xl">{value}</p></div>; }
function Table({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="card p-0 overflow-hidden"><div className="overflow-x-auto"><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>; }
function Vehicle({ v }: { v: { vehicleNumber: string; vehicleName: string | null } }) { return <><p className="font-semibold text-slate-950">{v.vehicleNumber}</p>{v.vehicleName && <p className="text-xs text-gray-400">{v.vehicleName}</p>}</>; }
