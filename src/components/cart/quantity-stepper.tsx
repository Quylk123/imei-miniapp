import Icon from "@/components/ui/icon";

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}

/** Stepper: – [n] +. Border hairline, pill-style buttons. */
export default function QuantityStepper({ value, onChange, min = 0, max = 99 }: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center gap-md">
      <button
        onClick={dec}
        disabled={value <= min}
        aria-label="Giảm"
        className="w-8 h-8 rounded-full border border-hairline text-ink flex items-center justify-center disabled:text-muted-soft disabled:border-hairline-soft"
      >
        <Icon name="minus" size={16} />
      </button>
      <span className="text-[16px] leading-[1.25] font-medium text-ink min-w-[20px] text-center">
        {value}
      </span>
      <button
        onClick={inc}
        disabled={value >= max}
        aria-label="Tăng"
        className="w-8 h-8 rounded-full border border-hairline text-ink flex items-center justify-center disabled:text-muted-soft disabled:border-hairline-soft"
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
