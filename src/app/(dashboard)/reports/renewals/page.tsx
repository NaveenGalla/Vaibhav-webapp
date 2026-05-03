// ─────────────────────────────────────────────────────────────────────────────
// Renewal Due Report — all renewals sorted by urgency
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ branch?: string; type?: string; status?: string }>;
}

function urgencyClass(expiryDate: Date | null): string {
  if (!expiryDate) return "";
  const days = Math.floor((expiryDate.getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return "bg-red-50";
  if (days <= 7)  return "bg-red-50";
  if (days <= 30) return "bg-amber-50";
  return "";
}

function expiryLabel(expiryDate: Date | null): { text: string; cls: string } {
  if (!expiryDate) return { text: "—", cls: "" };
  const days = Math.floor((expiryDate.getTime() - Date.now()) / 86_400_000);
  if (days < 0)   return { text: `Expired ${Math.abs(days)}d ago`, cls: "badge-red" };
  if (days <= 7)  return { text: `${days}d left`, cls: "badge-red" };
  if (days <= 30) return { text: `${days}d left`, cls: "badge-amber" };
  return { text: `${days}d left`, cls: "badge-green" };
}

export default async function RenewalReportPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  const params  = await searchParams;

  const isAdmin      = ["Super Admin", "Admin"].includes(user?.role);
  const branchFilter = isAdmin ? {} : { vehicle: { branchId: user?.branchId ?? undefined } };

  const where: Record<string, unknown> = { ...branchFilter };
  const now  = new Date();
  const in30 = new Date(Date.now() + 30 * 86_400_000);

  if (params.type)   where.renewalType = params.type;
  if (params.status === "EXPIRED")  where.expiryDate = { lt: now };
  if (params.status === "DUE_SOON") where.expiryDate = { gte: now, lte: in30 };

  const renewals = await db.renewal.findMany({
    where,
    include: {
      vehicle: { include: { branch: { select: { name: true } } } },
    },
    orderBy: { expiryDate: "asc" },
  });

  const branches = isAdmin
    ? await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Reports
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Renewal Due Report</h1>
          <p className="page-subtitle">{renewals.length} records</p>
        </div>
        <a href={`/api/reports/renewals/export?${new URLSearchParams(params as any)}`}
          className="btn-secondary flex items-center gap-2 text-sm">
          <IconMark label="X" /> Export Excel
        </a>
      </div>

      {/* Filters */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          {isAdmin && (
            <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto">
              <option value="">All Branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select name="type" defaultValue={params.type ?? ""} className="form-input w-auto">
            <option value="">All Types</option>
            {["INSURANCE","POLLUTION","FITNESS","PERMIT","ROAD_TAX","DRIVER_LICENSE","AMC","OTHER"].map((t: any) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ""} className="form-input w-auto">
            <option value="">All Status</option>
            <option value="EXPIRED">Expired</option>
            <option value="DUE_SOON">Due ≤ 30 Days</option>
          </select>
          <button type="submit" className="btn-primary px-5">Apply</button>
          <Link href="/reports/renewals" className="btn-ghost px-4">Reset</Link>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Branch</th>
                <th>Type</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Policy / Cert No.</th>
                <th>Provider</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((r: any) => {
                const label = expiryLabel(r.expiryDate);
                return (
                  <tr key={r.id} className={urgencyClass(r.expiryDate)}>
                    <td>
                      <Link href={`/vehicles/${r.vehicleId}`}
                        className="font-semibold text-sm text-slate-950 hover:underline">
                        {r.vehicle.vehicleNumber}
                      </Link>
                      {r.vehicle.vehicleName && (
                        <p className="text-xs text-gray-400">{r.vehicle.vehicleName}</p>
                      )}
                    </td>
                    <td className="text-sm text-gray-600">{(r.vehicle as any).branch?.name ?? "—"}</td>
                    <td>
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                        {r.renewalType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">{r.issueDate ? formatDate(r.issueDate) : "—"}</td>
                    <td className="text-sm tabular-nums font-medium">
                      {r.expiryDate ? formatDate(r.expiryDate) : "—"}
                    </td>
                    <td><span className={`badge ${label.cls} text-[10px]`}>{label.text}</span></td>
                    <td className="text-xs font-mono text-gray-500">{r.policyOrCertNo ?? "—"}</td>
                    <td className="text-sm text-gray-500">{r.provider ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
