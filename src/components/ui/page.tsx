import { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Bỏ padding ngang mặc định (cho trang full-bleed như scan QR) */
  noPadding?: boolean;
  /** Bỏ padding bottom 96px (khi không hiển thị BottomNav) */
  noBottomNavSpace?: boolean;
  children?: ReactNode;
}

export default function Page({
  noPadding,
  noBottomNavSpace,
  className = "",
  children,
  ...rest
}: Props) {
  const px = noPadding ? "" : "px-base";
  const pb = noBottomNavSpace ? "pb-base" : "pb-[96px]";
  return (
    <div
      {...rest}
      className={`min-h-screen bg-canvas text-ink font-sans ${px} pt-base ${pb} ${className}`}
    >
      {children}
    </div>
  );
}
