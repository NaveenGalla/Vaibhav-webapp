import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import LifecycleDecisionPanel from "@/components/operations/LifecycleDecisionPanel";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcurementDetailPage({ params }: PageProps) {
  const { id } = await params;
  const request = await db.vehicleProcurementRequest.findUnique({
    where: { id },
    include: {
      branch: { select: { name: true } },
      requestedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true } },
      vehicleInwards: { include: { vehicle: { select: { vehicleNumber: true, vehicleName: true } } } },
    },
  });
  if (!request) notFound();

  const actions =
    request.status === "DRAFT" ? [{ action: "SUBMIT", label: "Submit Request", tone: "blue" as const }] :
    request.status === "SUBMITTED" ? [
      { action: "APPROVE", label: "Approve", tone: "green" as const },
      { action: "REJECT", label: "Reject", tone: "red" as const },
    ] :
    request.status === "APPROVED" ? [{ action: "FULFILL", label: "Mark Fulfilled", tone: "gray" as const }] :
    [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/procurement" className="text-sm text-gray-500 hover:text-gray-800">Procurement</Link>
        <div>
          <h1 className="page-title">{request.requestNumber}</h1>
          <p className="page-subtitle">{request.branch.name} procurement request</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-950">Request Details</h3>
              <span className={`badge ${request.status === "APPROVED" || request.status === "FULFILLED" ? "badge-green" : request.status === "REJECTED" ? "badge-red" : request.status === "SUBMITTED" ? "badge-blue" : "badge-gray"}`}>
                {request.status}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Vehicle Type" value={request.vehicleType.replace(/_/g, " ")} />
              <Info label="Fuel Type" value={request.fuelType} />
              <Info label="Purpose" value={request.purpose?.replace(/_/g, " ") ?? "—"} />
              <Info label="Preferred Brand" value={request.preferredBrand ?? "—"} />
              <Info label="Required By" value={formatDate(request.requiredByDate)} />
              <Info label="Requested By" value={request.requestedBy.name} />
              <Info label="Approved By" value={request.approvedBy?.name ?? "—"} />
              <Info label="Created" value={formatDate(request.createdAt)} />
            </div>
            {request.remarks && <div className="mt-5 border-t border-gray-100 pt-4"><Info label="Remarks" value={request.remarks} /></div>}
          </div>

          <div className="card">
            <h3 className="mb-4 font-semibold text-slate-950">Vehicle Inward</h3>
            {request.vehicleInwards.length === 0 ? (
              <p className="text-sm text-gray-400">No vehicles have been inwarded against this request yet.</p>
            ) : (
              <div className="space-y-3">
                {request.vehicleInwards.map((inward) => (
                  <div key={inward.id} className="rounded-xl border border-gray-100 px-4 py-3">
                    <p className="font-semibold text-slate-950">{inward.vehicle.vehicleNumber}</p>
                    {inward.vehicle.vehicleName && <p className="text-sm text-gray-500">{inward.vehicle.vehicleName}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <LifecycleDecisionPanel endpoint={`/api/procurement/${request.id}/decision`} allowedActions={actions} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">{value}</p></div>;
}
