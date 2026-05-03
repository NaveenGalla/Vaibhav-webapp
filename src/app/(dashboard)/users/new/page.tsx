import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import UserForm from "@/components/users/UserForm";

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

export default async function NewUserPage() {
  const session = await auth();
  const user    = session?.user as any;
  if (!["Super Admin", "Admin"].includes(user?.role)) redirect("/users");

  const branches = await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/users" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          <IconMark label="<" tone="gray" /> Back
        </Link>
        <div>
          <h1 className="page-title">Add New User</h1>
          <p className="page-subtitle">Create a VFM system account</p>
        </div>
      </div>
      <UserForm roles={ROLES} branches={branches} />
    </div>
  );
}
