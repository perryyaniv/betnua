interface BadgeProps {
  label: string;
  color?: string; // hex; falls back to a neutral gray
}

export default function Badge({ label, color = '#9CA3AF' }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
