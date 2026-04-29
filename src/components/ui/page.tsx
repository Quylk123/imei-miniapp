import { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Bỏ padding ngang mặc định (cho trang full-bleed như scan QR) */
  noPadding?: boolean;
  /** Bỏ padding bottom 96px (khi không hiển thị BottomNav) */
  noBottomNavSpace?: boolean;
  /**
   * Hero zone full-bleed phía trên content (vd <PageHero>). Khi có hero:
   *   - Page bỏ pt-base mặc định (hero tự xử lý safe-area-inset-top).
   *   - Hero render trước nội dung body, không bị bao bởi px-base.
   */
  hero?: ReactNode;
  children?: ReactNode;
}

export default function Page({
  noPadding,
  noBottomNavSpace,
  hero,
  className = "",
  children,
  ...rest
}: Props) {
  const px = noPadding ? "" : "px-base";
  const pb = noBottomNavSpace ? "pb-base" : "pb-[96px]";
  // Khi có hero, nó tự gánh padding top (gồm safe-area). Body content chỉ cần
  // khoảng đệm nhỏ (pt-base) phía dưới hero. Khi không có hero, giữ pt-base
  // như cũ để layout cũ không vỡ.
  const bodyPt = "pt-base";
  return (
    <div
      {...rest}
      className={`min-h-screen bg-canvas text-ink font-sans ${pb} ${className}`}
    >
      {hero}
      <div className={`${px} ${bodyPt}`}>{children}</div>
    </div>
  );
}
