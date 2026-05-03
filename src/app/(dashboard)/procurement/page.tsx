import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const requests = await db.vehicleProcurementRequest.findMany({
    include: {
      branch: { select: { name: true } },
      requestedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      _count: { select: { vehicleInwards: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 150,
  });
  const submitted = requests.filter((r) => r.status === "SUBMITTED").length;
  const approved = requests.filter((r) => r.status === "APPROVED").length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="page-title">Vehicle Procurement</h1>
          <p className="page-subtitle">{requests.length} lifecycle requests</p>
        </div>
        <Link href="/procurement/new" className="btn-primary">New Request</Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Requests" value={String(requests.length)} />
        <Metric label="Submitted" value={String(submitted)} />
        <Metric label="Approved" value={String(approved)} />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Branch</th>
                <th>Vehicle</th>
                <th>Fuel</th>
                <th>Purpose</th>
                <th>Required By</th>
                <th>Status</th>
                <th>Requested By</th>
                <th>Inward</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/procurement/${r.id}`} className="font-mono text-xs font-semibold hover:underline">{r.requestNumber}</Link></td>
                  <td>{r.branch.name}</td>
                  <td>{r.preferredBrand ? `${r.preferredBrand} ` : ""}{r.vehicleType.replace(/_/g, " ")}</td>
                  <td><span className="badge badge-gray">{r.fuelType}</span></td>
                  <td>{r.purpose?.replace(/_/g, " ") ?? "—"}</td>
                  <td>{formatDate(r.requiredByDate)}</td>
                  <td><span className={`badge ${r.status === "APPROVED" ? "badge-green" : r.status === "REJECTED" ? "badge-red" : r.status === "SUBMITTED" ? "badge-blue" : "badge-gray"}`}>{r.status}</span></td>
                  <td>{r.requestedBy.name}</td>
                  <td>{r._count.vehicleInwards}</td>
                </tr>
              ))}
              {requests.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-gray-400">No procurement requests yet.</td></tr>}
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
