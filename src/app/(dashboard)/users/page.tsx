// ─────────────────────────────────────────────────────────────────────────────
// User Management — list page (Admin / Super Admin only)
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string; role?: string; branch?: string }>;
}

const ROLE_BADGE: Record<string, string> = {
  "Super Admin":    "badge-maroon",
  "Admin":          "badge-red",
  "Branch Manager": "badge-amber",
  "Approver":       "badge-blue",
  "Vehicle Manager":"badge-gold",
  "Accounts User":  "badge-green",
  "Auditor":        "badge-gray",
  "Normal User":    "badge-gray",
};

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/dashboard");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name:       { contains: search, mode: "insensitive" } },
      { email:      { contains: search, mode: "insensitive" } },
      { employeeId: { contains: search, mode: "insensitive" } },
    ];
  }
  if (params.role)   where.role     = params.role;
  if (params.branch) where.branchId = params.branch;

  const [users, branches] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        branch: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const roles = Object.keys(ROLE_BADGE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/users/new" className="btn-primary">
          <IconMark label="+" /> Add User
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" name="q" defaultValue={search}
              placeholder="Search name, email, employee ID…"
              className="form-input pl-9" />
          </div>
          <select name="role" defaultValue={params.role ?? ""} className="form-input w-auto">
            <option value="">All roles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select name="branch" defaultValue={params.branch ?? ""} className="form-input w-auto">
            <option value="">All branches</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button type="submit" className="btn-primary px-5">Search</button>
          {(search || params.role || params.branch) && (
            <Link href="/users" className="btn-ghost px-4">Clear</Link>
          )}
        </form>
      </div>

      {users.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="U" size="lg" className="mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No users found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: "#111827" }}>
                          {u.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-mono text-sm text-gray-600">{u.employeeId ?? "—"}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role ?? ""] ?? "badge-gray"}`}>
                        {u.role ?? "—"}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">{u.branch?.name ?? "—"}</td>
                    <td className="text-sm text-gray-500">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? "badge-green" : "badge-gray"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <Link href={`/users/${u.id}/edit`}
                        className="interactive-link text-xs">
                        Edit
                      </Link>
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
