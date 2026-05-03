// ─────────────────────────────────────────────────────────────────────────────
// Reports Hub — links to individual report pages / exports
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";

const REPORTS = [
  {
    href: "/reports/vehicles",
    icon: "V",
    title: "Vehicle Master Report",
    description: "Full list with status, type, branch, insurance and fitness validity",
  },
  {
    href: "/reports/fuel",
    icon: "F",
    title: "Fuel Consumption Report",
    description: "Vehicle-wise, driver-wise, and branch-wise fuel usage and cost",
  },
  {
    href: "/reports/service",
    icon: "S",
    title: "Service & Repair Report",
    description: "Service history, costs, and next-due schedule per vehicle",
  },
  {
    href: "/reports/renewals",
    icon: "R",
    title: "Renewal Due Report",
    description: "Expired and upcoming renewals across all vehicles",
  },
  {
    href: "/reports/indents",
    icon: "I",
    title: "Indent & Approval Report",
    description: "Indent-wise trip log with approval history and actual usage",
  },
  {
    href: "/reports/expenses",
    icon: "E",
    title: "Monthly Expense Report",
    description: "Branch-wise and vehicle-wise total cost breakdown by month",
  },
  {
    href: "/reports/drivers",
    icon: "D",
    title: "Driver Usage Report",
    description: "Driver-wise trip count, km travelled, and fuel consumed",
  },
];

export default async function ReportsPage() {
  const session = await auth();
  const user    = session?.user as any;

  const allowed = ["Super Admin", "Admin", "Auditor", "Accounts User", "Branch Manager"].includes(user?.role);
  if (!allowed) {
    return (
      <div className="card text-center py-16 max-w-md mx-auto">
        <p className="text-gray-500">You do not have access to reports.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Export and analyse vehicle, fuel, service, and expense data</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(({ href, icon, title, description }) => (
          <Link key={href} href={href}
            className="card hover:shadow-md transition-shadow group flex gap-4 items-start">
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100">
              <IconMark label={icon} size="md" tone="gray" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-950 group-hover:underline">
                {title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
              <div className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-500">
                <IconMark label="X" tone="gray" /> Filter and export
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
