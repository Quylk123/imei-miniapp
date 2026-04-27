import { ReactNode, useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Hiển thị handle bar trên cùng */
  handle?: boolean;
  /** Cho phép đóng khi tap backdrop */
  maskClosable?: boolean;
}

/**
 * Bottom sheet — slide-up từ đáy, backdrop scrim rgba(0,0,0,0.5),
 * panel canvas trắng, bo `rounded.lg` 20px ở 2 góc trên.
 * Tuân thủ DESIGN.md "Modal scrim" + "rounded.lg".
 */
export default function Sheet({
  open,
  onClose,
  children,
  title,
  handle = true,
  maskClosable = true,
}: Props) {
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // mount → next tick → slide-up
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={() => maskClosable && onClose()}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute left-0 right-0 bottom-0 bg-canvas rounded-t-lg shadow-card transition-transform duration-200 ease-out ${show ? "translate-y-0" : "translate-y-full"}`}
      >
        {handle && (
          <div className="flex justify-center pt-md pb-xs">
            <div className="w-9 h-1 rounded-full bg-hairline" />
          </div>
        )}
        {title && (
          <div className="px-base pb-md text-[20px] leading-[1.2] font-semibold text-ink tracking-[-0.18px]">
            {title}
          </div>
        )}
        <div className="max-h-[85vh] overflow-y-auto pb-base">{children}</div>
      </div>
    </div>
  );
}
