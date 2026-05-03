import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import BranchForm from "@/components/branches/BranchForm";

interface PageProps { params: Promise<{ id: string }> }

export default async function EditBranchPage({ params }: PageProps) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/branches");

  const branch = await db.branch.findUnique({ where: { id } });
  if (!branch) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/branches" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Edit Branch</h1>
          <p className="page-subtitle">{branch.name}</p>
        </div>
      </div>
      <BranchForm branchId={id} defaultValues={{
        name:     branch.name,
        code:     branch.code     ?? undefined,
        address:  branch.address  ?? undefined,
        city:     branch.city     ?? undefined,
        state:    branch.state    ?? undefined,
        phone:    branch.phone    ?? undefined,
        email:    branch.email    ?? undefined,
        isActive: branch.isActive,
      }} />
    </div>
  );
}
