// ─────────────────────────────────────────────────────────────────────────────
// Add Driver — server wrapper + client form
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import DriverForm from "@/components/drivers/DriverForm";

export default async function NewDriverPage() {
  const session = await auth();
  const user    = session?.user as any;

  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/drivers");

  const branches = await db.branch.findMany({
    select: { id: true, name: true }, orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/drivers" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Add New Driver</h1>
          <p className="page-subtitle">Enter driver details and license information</p>
        </div>
      </div>
      <DriverForm branches={branches} />
    </div>
  );
}
