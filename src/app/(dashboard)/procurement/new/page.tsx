import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import OperationForm from "@/components/operations/OperationForm";

export const dynamic = "force-dynamic";

export default async function NewProcurementPage() {
  const branches = await db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <NewShell back="/procurement" title="New Procurement Request"><OperationForm kind="procurement" branches={branches} /></NewShell>;
}

function NewShell({ back, title, children }: { back: string; title: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center gap-3"><Link href={back} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><IconMark label="<" tone="gray" /> Back</Link><div><h1 className="page-title">{title}</h1><p className="page-subtitle">Request a new vehicle for review</p></div></div>{children}</div>;
}
