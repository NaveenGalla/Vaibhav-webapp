import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import IndentForm from "@/components/indents/IndentForm";

export default async function NewIndentPage() {
  const session = await auth();
  const user    = session?.user as any;

  const [branches, vehicleTypes] = await Promise.all([
    db.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // We only need the distinct vehicle types from the enum
    Promise.resolve(["FOUR_WHEELER", "TWO_WHEELER", "VAN", "TRUCK", "OTHER"]),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/indents" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">New Vehicle Indent</h1>
          <p className="page-subtitle">Submit a vehicle usage request</p>
        </div>
      </div>
      <IndentForm
        branches={branches}
        vehicleTypes={vehicleTypes}
        defaultBranchId={user?.branchId ?? ""}
        userId={user?.id ?? ""}
      />
    </div>
  );
}
