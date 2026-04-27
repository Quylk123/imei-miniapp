import { useSetAtom } from "jotai";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { pageHeaderOverrideAtom } from "@/state/atoms";

interface Override {
  title?: string;
  right?: ReactNode;
}

/**
 * Override header runtime cho trang hiện tại (title hoặc right slot).
 * Tự reset khi unmount. Dùng khi tiêu đề phụ thuộc state động (vd
 * "Giỏ hàng (3)", "Đơn #o1001") hoặc cần inject button bên phải.
 */
export function usePageHeader({ title, right }: Override) {
  const set = useSetAtom(pageHeaderOverrideAtom);

  useEffect(() => {
    set({ title, right });
    return () => set({});
    // right thường là JSX phụ thuộc state — page nên memo nếu cần tối ưu
  }, [title, right, set]);
}
