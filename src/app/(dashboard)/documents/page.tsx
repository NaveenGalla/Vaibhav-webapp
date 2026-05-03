import { db } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function DocumentsPage() {
  const docs = await db.vehicleDocument.findMany({
    include: {
      vehicle: { select: { id: true, vehicleNumber: true, vehicleName: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
    take: 150,
  });
  const expired = docs.filter((d) => d.expiryDate && d.expiryDate.getTime() < Date.now()).length;
  const dueSoon = docs.filter((d) => {
    if (!d.expiryDate) return false;
    const days = Math.ceil((d.expiryDate.getTime() - Date.now()) / 86_400_000);
    return days >= 0 && days <= 30;
  }).length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="page-title">Vehicle Documents</h1>
          <p className="page-subtitle">{docs.length} uploaded records</p>
        </div>
        <Link href="/documents/new" className="btn-primary">Add Document</Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Documents" value={String(docs.length)} />
        <Metric label="Expiring in 30 Days" value={String(dueSoon)} />
        <Metric label="Expired" value={String(expired)} tone="red" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Amount</th>
                <th>File</th>
                <th>Uploaded By</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/vehicles/${d.vehicle.id}`} className="font-semibold text-slate-950 hover:underline">{d.vehicle.vehicleNumber}</Link>
                    {d.vehicle.vehicleName && <p className="text-xs text-gray-400">{d.vehicle.vehicleName}</p>}
                  </td>
                  <td><span className="badge badge-blue">{d.documentType.replace(/_/g, " ")}</span></td>
                  <td>{formatDate(d.issueDate)}</td>
                  <td>{formatDate(d.expiryDate)}</td>
                  <td>{formatCurrency(Number(d.amount ?? 0))}</td>
                  <td>{d.fileUrl ? <a href={d.fileUrl} className="text-xs font-medium text-blue-600">Open</a> : <span className="text-gray-400">—</span>}</td>
                  <td>{d.uploadedBy?.name ?? "—"}</td>
                </tr>
              ))}
              {docs.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-400">No documents uploaded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "red" }) {
  return <div className="card py-3"><p className="kpi-label">{label}</p><p className={`kpi-value mt-1 text-xl ${tone === "red" ? "text-red-600" : ""}`}>{value}</p></div>;
}
