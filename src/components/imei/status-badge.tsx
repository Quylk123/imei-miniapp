import { IMEI_BADGE, type IMEIStatus } from "@/types";

interface Props {
  status: IMEIStatus;
  /** Override label, ví dụ "Còn 12 ngày" */
  label?: string;
}

export default function StatusBadge({ status, label }: Props) {
  const meta = IMEI_BADGE[status];
  return (
    <span
      className="inline-flex items-center text-[11px] leading-[1.18] font-semibold rounded-full px-[10px] py-[4px]"
      style={{ color: meta.textColor, backgroundColor: meta.bgColor }}
    >
      {label ?? meta.label}
    </span>
  );
}
