declare module "@hookform/resolvers/zod" {
  export function zodResolver(...args: unknown[]): any;
}

declare module "lucide-react" {
  import type { ComponentType, SVGProps } from "react";

  export type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

  export const LayoutDashboard: LucideIcon;
  export const Car: LucideIcon;
  export const Users: LucideIcon;
  export const MapPin: LucideIcon;
  export const UserCheck: LucideIcon;
  export const Fuel: LucideIcon;
  export const Wrench: LucideIcon;
  export const FileText: LucideIcon;
  export const Bell: LucideIcon;
  export const BarChart2: LucideIcon;
  export const ClipboardList: LucideIcon;
  export const Shield: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const LogOut: LucideIcon;
  export const Settings: LucideIcon;
  export const Truck: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const PackagePlus: LucideIcon;
  export const Trash2: LucideIcon;
  export const CircleDot: LucideIcon;
  export const X: LucideIcon;
  export const BellIcon: LucideIcon;
  export const Menu: LucideIcon;
  export const Search: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const User: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Loader2: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const XCircle: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Send: LucideIcon;
  export const Play: LucideIcon;
  export const Flag: LucideIcon;
  export const Lock: LucideIcon;
  export const ClipboardCheck: LucideIcon;
}
