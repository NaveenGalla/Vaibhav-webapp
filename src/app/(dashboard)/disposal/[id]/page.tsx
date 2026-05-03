import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatCurrency, formatKm } from "@/lib/utils";
import LifecycleDecisionPanel from "@/components/operations/LifecycleDecisionPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DisposalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const request = await db.vehicleDisposalRequest.findUnique({
    where: { id },
    include: {
      vehicle: { select: { vehicleNumber: true, vehicleName: true, status: true } },
      branch: { select: { name: true } },
      requestedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });
  if (!request) notFound();

  const actions =
    request.status === "REQUESTED" ? [
      { action: "APPROVE", label: "Approve", tone: "green" as const },
      { action: "REJECT", label: "Reject", tone: "red" as const },
    ] :
    request.status === "APPROVED" ? [{ action: "COMPLETE", label: "Complete Disposal", tone: "gray" as const }] :
    [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/disposal" className="text-sm text-gray-500 hover:text-gray-800">Disposal</Link>
        <div>
          <h1 className="page-title">{request.requestNumber}</h1>
          <p className="page-subtitle">{request.vehicle.vehicleNumber} disposal request</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-950">Request Details</h3>
              <span className={`badge ${request.status === "APPROVED" || request.status === "COMPLETED" ? "badge-green" : request.status === "REJECTED" ? "badge-red" : "badge-amber"}`}>
                {request.status}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Vehicle" value={`${request.vehicle.vehicleNumber}${request.vehicle.vehicleName ? ` - ${request.vehicle.vehicleName}` : ""}`} />
              <Info label="Vehicle Status" value={request.vehicle.status.replace(/_/g, " ")} />
              <Info label="Branch" value={request.branch?.name ?? "—"} />
              <Info label="Reason" value={request.reason.replace(/_/g, " ")} />
              <Info label="Odometer" value={formatKm(request.odometerAtDisposal)} />
              <Info label="Sale Amount" value={formatCurrency(Number(request.saleAmount ?? 0))} />
              <Info label="Requested By" value={request.requestedBy.name} />
              <Info label="Approved By" value={request.approvedBy?.name ?? "—"} />
            </div>
            {request.buyerDetails && <div className="mt-5 border-t border-gray-100 pt-4"><Info label="Buyer Details" value={request.buyerDetails} /></div>}
            {request.remarks && <div className="mt-5 border-t border-gray-100 pt-4"><Info label="Remarks" value={request.remarks} /></div>}
          </div>
        </div>
        <LifecycleDecisionPanel endpoint={`/api/disposal/${request.id}/decision`} allowedActions={actions} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">{value}</p></div>;
}
