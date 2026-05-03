import { db } from "@/lib/db";
import { formatCurrency, formatKm } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DisposalPage() {
  const requests = await db.vehicleDisposalRequest.findMany({
    include: {
      vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true, status: true } },
      branch: { select: { name: true } },
      requestedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  const requested = requests.filter((r) => r.status === "REQUESTED").length;
  const saleTotal = requests.reduce((sum, r) => sum + Number(r.saleAmount ?? 0), 0);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="page-title">Vehicle Disposal</h1>
          <p className="page-subtitle">{requests.length} disposal requests</p>
        </div>
        <Link href="/disposal/new" className="btn-primary">New Request</Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Open Requests" value={String(requested)} />
        <Metric label="Sale Value" value={formatCurrency(saleTotal)} />
        <Metric label="Total Requests" value={String(requests.length)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Vehicle</th>
                <th>Branch</th>
                <th>Reason</th>
                <th>Odometer</th>
                <th>Sale Amount</th>
                <th>Buyer</th>
                <th>Status</th>
                <th>Requested By</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/disposal/${r.id}`} className="font-mono text-xs font-semibold hover:underline">{r.requestNumber}</Link></td>
                  <td>
                    <Link href={`/vehicles/${r.vehicle.id}`} className="font-semibold text-slate-950 hover:underline">{r.vehicle.vehicleNumber}</Link>
                    {r.vehicle.vehicleName && <p className="text-xs text-gray-400">{r.vehicle.vehicleName}</p>}
                  </td>
                  <td>{r.branch?.name ?? "—"}</td>
                  <td>{r.reason.replace(/_/g, " ")}</td>
                  <td>{formatKm(r.odometerAtDisposal)}</td>
                  <td className="font-semibold">{formatCurrency(Number(r.saleAmount ?? 0))}</td>
                  <td className="max-w-xs truncate">{r.buyerDetails ?? "—"}</td>
                  <td><span className={`badge ${r.status === "APPROVED" ? "badge-green" : r.status === "REJECTED" ? "badge-red" : r.status === "COMPLETED" ? "badge-blue" : "badge-amber"}`}>{r.status}</span></td>
                  <td>{r.requestedBy.name}</td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-gray-400">No disposal requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card py-3"><p className="kpi-label">{label}</p><p className="kpi-value mt-1 text-xl">{value}</p></div>;
}
