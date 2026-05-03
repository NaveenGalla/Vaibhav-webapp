// ─────────────────────────────────────────────────────────────────────────────
// Branch Master — list page (Super Admin / Admin only)
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const session = await auth();
  const user    = session?.user as any;

  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/dashboard");

  const branches = await db.branch.findMany({
    include: {
      _count: { select: { vehicles: true, users: true, drivers: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Branch Master</h1>
          <p className="page-subtitle">{branches.length} branch{branches.length !== 1 ? "es" : ""}</p>
        </div>
        <Link href="/branches/new" className="btn-primary">
          <IconMark label="+" /> Add Branch
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b: any) => (
          <div key={b.id} className="card card-hover">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#fef9c3" }}>
                  <IconMark label="B" size="md" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{b.name}</p>
                  {b.code && <p className="text-xs text-gray-400 font-mono">{b.code}</p>}
                </div>
              </div>
              <Link href={`/branches/${b.id}/edit`} className="interactive-link text-xs">
                Edit
              </Link>
            </div>

            {b.address && (
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">{b.address}</p>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4"
              style={{ borderTop: "1px solid rgba(17,24,39,0.08)" }}>
              {[
                { label: "Vehicles", count: b._count.vehicles },
                { label: "Users",    count: b._count.users },
                { label: "Drivers",  count: b._count.drivers },
              ].map((s: any) => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-slate-950">{s.count}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
