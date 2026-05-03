// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Master — list page with search + filters
// Server component; filter params come via URL search params.
// ─────────────────────────────────────────────────────────────────────────────
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import IconMark from "@/components/ui/IconMark";
import VehicleFilters from "@/components/vehicles/VehicleFilters";
import VehicleTable from "@/components/vehicles/VehicleTable";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    branch?: string;
    ownership?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 25;

export default async function VehiclesPage({ searchParams }: PageProps) {
  const session = await auth();
  const user = session?.user as any;

  const params = await searchParams;

  const page   = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.q?.trim() ?? "";

  // ── Build Prisma where clause ────────────────────────────────────────────
  const branchFilter =
    ["Super Admin", "Admin"].includes(user?.role)
      ? {}
      : { branchId: user?.branchId ?? undefined };

  const where: Record<string, unknown> = { ...branchFilter };

  if (search) {
    where.OR = [
      { vehicleNumber: { contains: search, mode: "insensitive" } },
      { vehicleName:   { contains: search, mode: "insensitive" } },
      { make:          { contains: search, mode: "insensitive" } },
      { model:         { contains: search, mode: "insensitive" } },
      { driver:        { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (params.status)    where.status        = params.status;
  if (params.type)      where.vehicleType   = params.type;
  if (params.branch)    where.branchId      = params.branch;
  if (params.ownership) where.ownershipType = params.ownership;

  const [total, vehicles, branches] = await Promise.all([
    db.vehicle.count({ where }),
    db.vehicle.findMany({
      where,
      include: {
        branch:     { select: { id: true, name: true } },
        driver:     { select: { id: true, name: true } },
        _count: {
          select: {
            fuelEntries:    true,
            serviceEntries: true,
            documents:      true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { vehicleNumber: "asc" }],
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    }),
    db.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Vehicle Master</h1>
          <p className="page-subtitle">
            {total} vehicle{total !== 1 ? "s" : ""} in your fleet
          </p>
        </div>
        {["Super Admin", "Admin", "Vehicle Manager"].includes(user?.role) && (
          <Link href="/vehicles/new" className="btn-primary">
            <IconMark label="+" /> Add Vehicle
          </Link>
        )}
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <div className="card mb-4 py-3">
        <form method="GET" className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <IconMark label="S" tone="gray" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search vehicle number, name, make, driver…"
              className="form-input pl-9"
            />
          </div>
          <VehicleFilters
            branches={branches}
            defaultStatus={params.status}
            defaultType={params.type}
            defaultBranch={params.branch}
            defaultOwnership={params.ownership}
          />
          <button type="submit" className="btn-primary px-5">
            Search
          </button>
          {(search || params.status || params.type || params.branch || params.ownership) && (
            <Link href="/vehicles" className="btn-ghost px-4">
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {vehicles.length === 0 ? (
        <div className="card text-center py-16">
          <IconMark label="V" size="lg" className="mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No vehicles found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <VehicleTable vehicles={vehicles} />
      )}

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/vehicles?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="btn-ghost px-3 py-1"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/vehicles?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="btn-ghost px-3 py-1"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
