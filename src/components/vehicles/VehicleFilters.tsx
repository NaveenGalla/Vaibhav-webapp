// ─────────────────────────────────────────────────────────────────────────────
// VehicleFilters — client component for the filter dropdowns on /vehicles
// ─────────────────────────────────────────────────────────────────────────────
"use client";

interface Branch { id: string; name: string; }

interface Props {
  branches:         Branch[];
  defaultStatus?:   string;
  defaultType?:     string;
  defaultBranch?:   string;
  defaultOwnership?: string;
}

const STATUSES = [
  { value: "",            label: "All statuses" },
  { value: "ACTIVE",      label: "Active" },
  { value: "IN_SERVICE",  label: "In Service" },
  { value: "INACTIVE",    label: "Inactive" },
  { value: "DISPOSED",    label: "Disposed" },
];

const VEHICLE_TYPES = [
  { value: "",             label: "All types" },
  { value: "FOUR_WHEELER", label: "Four Wheeler" },
  { value: "TWO_WHEELER",  label: "Two Wheeler" },
  { value: "VAN",          label: "Van / Tempo" },
  { value: "TRUCK",        label: "Truck" },
  { value: "OTHER",        label: "Other" },
];

const OWNERSHIP_TYPES = [
  { value: "",        label: "All ownership" },
  { value: "OWNED",   label: "Owned" },
  { value: "LEASED",  label: "Leased" },
  { value: "HIRED",   label: "Hired" },
];

export default function VehicleFilters({
  branches,
  defaultStatus,
  defaultType,
  defaultBranch,
  defaultOwnership,
}: Props) {
  return (
    <>
      <select name="status" defaultValue={defaultStatus ?? ""} className="form-input w-auto">
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      <select name="type" defaultValue={defaultType ?? ""} className="form-input w-auto">
        {VEHICLE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <select name="branch" defaultValue={defaultBranch ?? ""} className="form-input w-auto">
        <option value="">All branches</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <select name="ownership" defaultValue={defaultOwnership ?? ""} className="form-input w-auto">
        {OWNERSHIP_TYPES.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </>
  );
}
