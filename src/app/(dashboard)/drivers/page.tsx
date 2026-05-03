// ─────────────────────────────────────────────────────────────────────────────
// Driver Master — list page
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; branch?: string }>;
}

export default async function DriversPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  const params  = await searchParams;

  const canManage = ["Super Admin", "Admin"].includes(user?.role);
  const branchFilter = canManage ? {} : { branchId: user?.branchId ?? undefined };

  const search = params.q?.trim() ?? "";
  const where: Record<string, unknown> = { ...branchFilter };

  if (search) {
    where.OR = [
      { name:         { contains: search, mode: "insensitive" } },
      { licenseNumber:{ contains: search, mode: "insensitive" } },
      { phone:        { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.status === "active")   where.isActive = true;
  if (params.status === "inactive") where.isActive = false;
  if (params.branch) where.branchId = params.branch;

  const [drivers, branches] = await Promise.all([
    db.driver.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        assignedVehicles: {
          where: { status: "ACTIVE" },
          select: { vehicleNumber: true, vehicleName: true },
          take: 3,
        },
      },
      orderBy: { name: "asc" },
    }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Driver Master</h1>
          <p className="page-subtitle">{drivers.length} driver{drivers.length !== 1 ? "s" : ""}</p>
        </div>
        {canManage && (
          <Link href="/drivers/new" className="btn-primary">
            <IconMark label="+" /> Add Driver
          </Link>
        )}
      </div>

      {/* Search + Filter */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" name="q" defaultValue={search}
              placeholder="Search name, license, phone…"
              className="form-input pl-9" />
          </div>
          <select name="status" defaultValue={params.status ?? ""} className="form-input w-auto">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {canManage && (
            <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto">
              <option value="">All branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button type="submit" className="btn-primary px-5">Search</button>
          {(search || params.status || params.branch) && (
            <Link href="/drivers" className="btn-ghost px-4">Clear</Link>
          )}
        </form>
      </div>

      {/* Table */}
      {drivers.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="D" size="lg" className="mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No drivers found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>License</th>
                  <th>License Expiry</th>
                  <th>Phone</th>
                  <th>Branch</th>
                  <th>Assigned Vehicle(s)</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d: any) => (
                  <tr key={d.id}>
                    <td>
                      <p className="font-semibold text-gray-800">{d.name}</p>
                      {d.employeeId && <p className="text-xs text-gray-400">{d.employeeId}</p>}
                    </td>
                    <td className="font-mono text-sm text-gray-700">{d.licenseNumber ?? "—"}</td>
                    <td className="text-sm text-gray-600">
                      {d.licenseExpiry ? formatDate(d.licenseExpiry) : "—"}
                    </td>
                    <td className="text-sm text-gray-600">{d.phone ?? "—"}</td>
                    <td className="text-sm text-gray-600">{d.branch?.name ?? "—"}</td>
                    <td className="text-xs text-gray-500">
                      {d.assignedVehicles.length === 0
                        ? <span className="text-gray-300 italic">None</span>
                        : d.assignedVehicles.map((v: any) =>
                            <span key={v.vehicleNumber} className="badge badge-blue mr-1">
                              {v.vehicleNumber}
                            </span>
                          )}
                    </td>
                    <td>
                      <span className={`badge ${d.isActive ? "badge-green" : "badge-gray"}`}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      {canManage && (
                        <Link href={`/drivers/${d.id}/edit`}
                          className="interactive-link text-xs">
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
