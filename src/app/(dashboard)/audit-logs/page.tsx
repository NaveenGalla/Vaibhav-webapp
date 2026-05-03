// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs — paginated log of all important actions
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    q?: string; module?: string; action?: string; user?: string;
    from?: string; to?: string; page?: string;
  }>;
}

const PAGE_SIZE = 50;

const MODULES = ["VEHICLE", "DRIVER", "BRANCH", "USER", "INDENT", "FUEL_ENTRY", "SERVICE_ENTRY", "RENEWAL", "FILE"];
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "ASSIGN_VEHICLE", "SUBMIT", "START", "COMPLETE", "CLOSE", "CANCEL"];

function actionBadgeClass(action: string): string {
  if (["CREATE", "APPROVE"].includes(action))  return "badge-green";
  if (["DELETE", "REJECT", "CANCEL"].includes(action)) return "badge-red";
  if (["UPDATE"].includes(action)) return "badge-amber";
  return "badge-gray";
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const session = await auth();
  const user    = session?.user as any;

  // Only admins and auditors can access
  if (!["Super Admin", "Admin", "Auditor"].includes(user?.role)) {
    return (
      <div className="card text-center py-16 max-w-md mx-auto">
        <p className="text-gray-500">Access restricted — Admins and Auditors only.</p>
      </div>
    );
  }

  const params = await searchParams;
  const page   = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.q?.trim() ?? "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { entityType: { contains: search, mode: "insensitive" } },
      { entityId:   { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (params.module) where.module = params.module;
  if (params.action) where.action = params.action;
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to   ? { lte: new Date(params.to + "T23:59:59") } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(107,29,29,0.1)" }}>
          <IconMark label="A" size="md" tone="maroon" />
        </div>
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{total.toLocaleString("en-IN")} records</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" name="q" defaultValue={search}
              placeholder="Search entity, user…" className="form-input pl-9" />
          </div>
          <select name="module" defaultValue={params.module ?? ""} className="form-input w-auto">
            <option value="">All Modules</option>
            {MODULES.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
          </select>
          <select name="action" defaultValue={params.action ?? ""} className="form-input w-auto">
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </select>
          <input type="date" name="from" defaultValue={params.from ?? ""} className="form-input w-auto" title="From" />
          <input type="date" name="to"   defaultValue={params.to   ?? ""} className="form-input w-auto" title="To" />
          <button type="submit" className="btn-primary px-5">Filter</button>
          {(search || params.module || params.action || params.from || params.to) && (
            <Link href="/audit-logs" className="btn-ghost px-4">Clear</Link>
          )}
        </form>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="A" size="lg" tone="gray" className="mx-auto mb-3" />
          <p className="text-gray-500">No audit log entries found</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit", hour12: true,
                      })}
                    </td>
                    <td>
                      <p className="text-sm font-medium">{log.user?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{log.user?.email ?? ""}</p>
                    </td>
                    <td>
                      <span className={`badge ${actionBadgeClass(log.action)} text-[10px] uppercase tracking-wide`}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {log.module.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-xs font-mono text-gray-500">
                      {log.entityType} <span className="text-gray-300">·</span> {log.entityId?.slice(0, 8)}…
                    </td>
                    <td className="max-w-[300px]">
                      {log.newValue && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-400 hover:text-gray-600">View</summary>
                          <pre className="mt-1 text-[10px] bg-gray-50 rounded p-2 overflow-auto max-h-24 text-gray-600">
                            {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString("en-IN")}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/audit-logs?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="btn-ghost px-3 py-1">← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={`/audit-logs?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="btn-ghost px-3 py-1">Next →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
