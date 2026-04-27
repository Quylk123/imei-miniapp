import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm" | "pill";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    "bg-rausch text-white active:bg-rausch-active disabled:bg-rausch-disabled disabled:text-white",
  secondary:
    "bg-canvas text-ink border border-ink active:bg-surface-soft disabled:opacity-50",
  ghost: "bg-transparent text-ink active:bg-surface-soft disabled:opacity-50",
  danger: "bg-canvas text-danger border border-danger active:bg-danger/5",
};

const sizeClass: Record<Size, string> = {
  md: "h-12 px-lg rounded-sm text-[16px] font-medium",
  sm: "h-10 px-md rounded-sm text-[14px] font-medium",
  pill: "h-10 px-lg rounded-full text-[14px] font-medium",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  leftIcon,
  rightIcon,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-sm leading-[1.25] transition-colors disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
