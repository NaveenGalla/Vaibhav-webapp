import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import UserForm from "@/components/users/UserForm";

export const dynamic = "force-dynamic";

interface PageProps { params: Promise<{ id: string }> }

const ROLES = [
  "Super Admin",
  "Admin",
  "Branch Manager",
  "Department Head",
  "Approver",
  "Vehicle Manager",
  "Driver",
  "Normal User",
  "Accounts User",
  "Auditor",
];

export default async function EditUserPage({ params }: PageProps) {
  const { id }  = await params;
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/users");

  const [target, branches] = await Promise.all([
    db.user.findUnique({ where: { id } }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!target) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/users" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Edit User</h1>
          <p className="page-subtitle">{target.name}</p>
        </div>
      </div>
      <UserForm
        roles={ROLES}
        branches={branches}
        userId={id}
        defaultValues={{
          name:       target.name ?? "",
          email:      target.email,
          employeeId: target.employeeId ?? undefined,
          phone:      target.phone ?? undefined,
          role:       target.role,
          branchId:   target.branchId ?? "",
          isActive:   target.isActive,
        }}
      />
    </div>
  );
}
