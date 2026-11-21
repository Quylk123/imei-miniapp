import { Call, User } from "iconsax-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import { authErrorAtom, authLoadingAtom, authInitializedAtom, authBootstrapErrorAtom, authNeedsSignInAtom, autoLoginAtom, customerAtom, registerMemberAtom } from "@/state/atoms";

interface AuthLocationState {
  redirectTo?: string;
  reason?: string;
}

export default function AuthPage({ embedded = false, reason }: { embedded?: boolean; reason?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const registerMember = useSetAtom(registerMemberAtom);
  const isLoading = useAtomValue(authLoadingAtom);
  const authError = useAtomValue(authErrorAtom);
  const initialized = useAtomValue(authInitializedAtom);
  const bootstrapError = useAtomValue(authBootstrapErrorAtom);
  const needsSignIn = useAtomValue(authNeedsSignInAtom);
  const customer = useAtomValue(customerAtom);
  const retryAuth = useSetAtom(autoLoginAtom);
  const state = (location.state as AuthLocationState | null) ?? {};
  const destination = state.redirectTo ?? "/";
  useEffect(() => {
    if (!embedded && initialized && customer && !bootstrapError) {
      navigate(destination, { replace: true });
    }
  }, [bootstrapError, customer, destination, embedded, initialized, navigate]);

  const onRegister = async () => {
    try {
      await registerMember();
    } catch {
      // Error is already set in authErrorAtom
    }
  };

  if (!initialized || (!embedded && customer && !bootstrapError)) {
    return <p role="status" className="py-xxl text-center text-muted">Đang khôi phục phiên đăng nhập…</p>;
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-base text-center">
        {/* Animated icon */}
        <div className="w-28 h-28 rounded-full bg-brand flex items-center justify-center mb-lg">
          <Call size={56} variant="Bold" className="text-white" />
        </div>

        <h1 className="text-[28px] leading-[1.18] font-bold text-ink">
          {needsSignIn ? "Đăng nhập lại bằng Zalo" : "Tiếp tục bằng Zalo"}
        </h1>

        <p className="text-[16px] leading-[1.5] text-muted mt-md max-w-[320px]">
          {needsSignIn ? "Đăng nhập bằng tài khoản Zalo của bạn để tiếp tục xem SIM và đơn hàng." : reason ?? state.reason ??
            "Dùng tài khoản Zalo để xem SIM, đơn hàng và ưu đãi của bạn."}
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

        {bootstrapError && <div role="alert" className="mt-md max-w-[320px] text-danger">
          <p>{bootstrapError}</p>
          <Button onClick={() => void retryAuth()} disabled={isLoading || !initialized}>Thử khôi phục phiên</Button>
        </div>}
        {/* Error message */}
        {authError && (
          <div className="mt-md px-base py-sm rounded-md bg-danger/10 text-danger text-[14px] leading-[1.43] max-w-[320px]">
            {authError}
          </div>
        )}
      </div>

      <div
        className="shrink-0 px-base pt-base"
        style={{
          // Embedded /my-imei keeps the fixed 64px bottom navigation.
          paddingBottom: `calc(${embedded ? 88 : 24}px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        <Button fullWidth onClick={onRegister} disabled={isLoading || !initialized}>
          {isLoading ? (
            <span className="flex items-center gap-sm justify-center">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xử lý...
            </span>
          ) : (
            "Đăng nhập bằng Zalo"
          )}
        </Button>
      </div>
    </div>
  );
}
