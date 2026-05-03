import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import BranchForm from "@/components/branches/BranchForm";

export const dynamic = "force-dynamic";

export default async function NewBranchPage() {
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/branches");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/branches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Add New Branch</h1>
          <p className="page-subtitle">Register a new Vaibhav Jewellers branch location</p>
        </div>
      </div>
      <BranchForm />
    </div>
  );
}
