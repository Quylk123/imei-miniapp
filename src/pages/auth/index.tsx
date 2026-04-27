import { useSetAtom } from "jotai";
import { useLocation, useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { linkZaloAtom } from "@/state/atoms";

interface AuthLocationState {
  redirectTo?: string;
  reason?: string;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const linkZalo = useSetAtom(linkZaloAtom);
  const state = (location.state as AuthLocationState | null) ?? {};

  const onLink = () => {
    linkZalo();
    navigate(state.redirectTo ?? "/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-base text-center">
        <div className="w-28 h-28 rounded-full bg-rausch flex items-center justify-center mb-lg">
          <Icon name="phone" size={56} className="text-white" />
        </div>
        <h1 className="text-[28px] leading-[1.18] font-bold text-ink">
          Xác nhận thông tin
        </h1>
        <p className="text-[16px] leading-[1.5] text-muted mt-md max-w-[320px]">
          {state.reason ??
            "Chúng tôi cần số điện thoại của bạn để giao hàng và quản lý lịch sử đơn hàng"}
        </p>
      </div>

      <div className="px-base pt-base pb-[calc(24px+env(safe-area-inset-bottom))]">
        <Button fullWidth onClick={onLink}>
          Đăng ký thành viên
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
