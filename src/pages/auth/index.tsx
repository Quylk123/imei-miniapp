import { Call, User } from "iconsax-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import { authErrorAtom, authLoadingAtom, registerMemberAtom } from "@/state/atoms";

interface AuthLocationState {
  redirectTo?: string;
  reason?: string;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const registerMember = useSetAtom(registerMemberAtom);
  const isLoading = useAtomValue(authLoadingAtom);
  const authError = useAtomValue(authErrorAtom);
  const state = (location.state as AuthLocationState | null) ?? {};

  const onRegister = async () => {
    try {
      await registerMember();
      navigate(state.redirectTo ?? "/", { replace: true });
    } catch {
      // Error is already set in authErrorAtom
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-base text-center">
        {/* Animated icon */}
        <div className="w-28 h-28 rounded-full bg-rausch flex items-center justify-center mb-lg">
          <Call size={56} variant="Bold" className="text-white" />
        </div>

        <h1 className="text-[28px] leading-[1.18] font-bold text-ink">
          Đăng ký thành viên
        </h1>

        <p className="text-[16px] leading-[1.5] text-muted mt-md max-w-[320px]">
          {state.reason ??
            "Đăng ký để nhận ưu đãi, theo dõi IMEI và quản lý đơn hàng dễ dàng"}
        </p>

        {/* Permission explanation */}
        <div className="mt-lg w-full max-w-[320px] space-y-sm">
          <div className="flex items-center gap-sm text-left">
            <span className="w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center shrink-0">
              <User size={16} variant="Linear" className="text-ink" />
            </span>
            <span className="text-[14px] leading-[1.43] text-muted">
              Tên và ảnh đại diện Zalo
            </span>
          </div>
          <div className="flex items-center gap-sm text-left">
            <span className="w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center shrink-0">
              <Call size={16} variant="Linear" className="text-ink" />
            </span>
            <span className="text-[14px] leading-[1.43] text-muted">
              Số điện thoại liên kết Zalo
            </span>
          </div>
        </div>

        {/* Error message */}
        {authError && (
          <div className="mt-md px-base py-sm rounded-md bg-danger/10 text-danger text-[14px] leading-[1.43] max-w-[320px]">
            {authError}
          </div>
        )}
      </div>

      <div className="px-base pt-base pb-[calc(24px+env(safe-area-inset-bottom))]">
        <Button fullWidth onClick={onRegister} disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-sm justify-center">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xử lý...
            </span>
          ) : (
            "Đăng ký thành viên"
          )}
        </Button>
        <p className="text-center text-[13px] leading-[1.23] text-muted mt-md">
          Bằng việc tiếp tục, bạn đồng ý với{" "}
          <span className="text-ink underline">Điều khoản sử dụng</span> và{" "}
          <span className="text-ink underline">Chính sách bảo mật</span>
        </p>
      </div>
    </div>
  );
}
