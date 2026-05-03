type IconMarkProps = {
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "gold" | "maroon" | "green" | "gray";
};

const tones = {
  gold: "#b8860b",
  maroon: "#6b1d1d",
  green: "#16a34a",
  gray: "#9ca3af",
};

const sizes = {
  sm: "h-4 w-4 text-[11px]",
  md: "h-5 w-5 text-xs",
  lg: "h-10 w-10 text-lg",
};

export default function IconMark({
  label,
  className = "",
  size = "sm",
  tone = "gold",
}: IconMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded font-bold ${sizes[size]} ${className}`}
      style={{ color: tones[tone] }}
    >
      {label}
    </span>
  );
}
