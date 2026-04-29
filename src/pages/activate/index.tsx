import { Call, CloseSquare, ScanBarcode, User, Warning2 } from "iconsax-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { fetchIMEIByNumber } from "@/data/supabase";
import { linkIMEI } from "@/data/supabase";
import {
  customerAtom,
  myImeisAtom,
  authLoadingAtom,
  registerMemberAtom,
} from "@/state/atoms";
import { fetchMyIMEIs } from "@/data/supabase";
import type { IMEI } from "@/types";

type ActivateStep = "loading" | "imei_info" | "linking" | "success" | "error";

interface ErrorInfo {
  title: string;
  description: string;
  canRetry?: boolean;
}

export default function ActivatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imeiNumber = searchParams.get("imei") ?? "";

  const customer = useAtomValue(customerAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const registerMember = useSetAtom(registerMemberAtom);
  const setMyImeis = useSetAtom(myImeisAtom);

  const [step, setStep] = useState<ActivateStep>("loading");
  const [imei, setImei] = useState<IMEI | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Step 0: Wait for auth, redirect to login if not authenticated
  useEffect(() => {
    if (isAuthLoading) return; // chờ autoLogin xong

    if (!customer) {
      // Chưa đăng nhập → chuyển sang trang auth, giữ lại redirect URL
      navigate("/auth", {
        replace: true,
        state: {
          redirectTo: `/activate?imei=${encodeURIComponent(imeiNumber)}`,
          reason: "Vui lòng đăng ký thành viên để kích hoạt IMEI thiết bị của bạn",
        },
      });
    }
  }, [isAuthLoading, customer, imeiNumber, navigate]);

  // Step 1: Fetch IMEI info (chỉ khi đã đăng nhập)
  useEffect(() => {
    if (isAuthLoading || !customer) return; // chưa sẵn sàng

    if (!imeiNumber) {
      setError({
        title: "Mã QR không hợp lệ",
        description: "Không tìm thấy thông tin IMEI từ mã QR. Vui lòng thử quét lại.",
      });
      setStep("error");
      return;
    }

    setStep("loading");
    fetchIMEIByNumber(imeiNumber)
      .then((data) => {
        if (!data) {
          setError({
            title: "IMEI không tồn tại",
            description: `Không tìm thấy IMEI "${imeiNumber}" trong hệ thống.`,
          });
          setStep("error");
          return;
        }

        // Check status validity
        if (data.status === "recalled") {
          setError({
            title: "Mã QR không còn hiệu lực",
            description: "IMEI này đã bị thu hồi. Vui lòng liên hệ hỗ trợ.",
          });
          setStep("error");
          return;
        }

        if (data.status === "new") {
          setError({
            title: "IMEI chưa sẵn sàng",
            description: "IMEI này chưa được phân phối. Vui lòng liên hệ đại lý.",
          });
          setStep("error");
          return;
        }

        // Already linked to someone
        if (data.customer_id && data.status !== "sold") {
          // Check if same customer
          if (data.customer_id === customer.id) {
            // Same customer → redirect to IMEI detail
            navigate(`/my-imei/${data.id}`, { replace: true });
            return;
          }
          setError({
            title: "QR đã được liên kết",
            description:
              "IMEI này đã được liên kết bởi tài khoản khác. Vui lòng liên hệ hỗ trợ nếu bạn tin đây là nhầm lẫn.",
          });
          setStep("error");
          return;
        }

        // Status must be 'sold' to link
        if (data.status !== "sold") {
          setError({
            title: "Không thể kích hoạt",
            description: `Trạng thái IMEI hiện tại không cho phép kích hoạt (${data.status}).`,
          });
          setStep("error");
          return;
        }

        setImei(data);
        setStep("imei_info");
      })
      .catch((err) => {
        console.error("[activate] Fetch IMEI failed:", err);
        setError({
          title: "Lỗi kết nối",
          description: "Không thể kiểm tra thông tin IMEI. Vui lòng thử lại.",
          canRetry: true,
        });
        setStep("error");
      });
  }, [isAuthLoading, customer, imeiNumber]);

  // Step 2: Handle confirm — link IMEI (user is already logged in)
  const handleConfirm = async () => {
    if (!imei || !customer) return;

    setIsLinking(true);
    try {
      // Link IMEI
      setStep("linking");
      const result = await linkIMEI(imei.imei_number, customer.id);

      // Refresh myImeis list
      const freshImeis = await fetchMyIMEIs(customer.id);
      setMyImeis(freshImeis);

      // Navigate to packages selection
      navigate(`/my-imei/${result.imei.id}/packages`, { replace: true });
    } catch (err: any) {
      console.error("[activate] Link failed:", err);
      if (err?.message?.includes("409") || err?.message?.includes("Already linked")) {
        setError({
          title: "QR đã được liên kết",
          description: "IMEI này đã được liên kết bởi tài khoản khác.",
        });
      } else {
        setError({
          title: "Liên kết thất bại",
          description: err?.message ?? "Đã xảy ra lỗi. Vui lòng thử lại.",
          canRetry: true,
        });
      }
      setStep("error");
    } finally {
      setIsLinking(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setStep("loading");
    // Re-trigger by re-mounting
    window.location.reload();
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-base pt-base pb-md">
        <button
          onClick={() => navigate("/", { replace: true })}
          aria-label="Đóng"
          className="w-9 h-9 rounded-full bg-surface-strong flex items-center justify-center"
        >
          <CloseSquare size={20} variant="Linear" />
        </button>
        <div className="text-[16px] leading-[1.25] font-semibold text-ink">
          Kích hoạt IMEI
        </div>
        <div className="w-9 h-9" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-base text-center">
        {/* Loading */}
        {step === "loading" && (
          <div className="space-y-md">
            <div className="w-16 h-16 rounded-full bg-rausch/10 flex items-center justify-center mx-auto">
              <span className="w-6 h-6 border-2 border-rausch/30 border-t-rausch rounded-full animate-spin" />
            </div>
            <p className="text-[16px] leading-[1.25] font-semibold text-ink">
              Đang kiểm tra IMEI...
            </p>
            <p className="text-[14px] leading-[1.43] text-muted">
              {imeiNumber}
            </p>
          </div>
        )}

        {/* IMEI Info — Ready to link */}
        {step === "imei_info" && imei && (
          <div className="w-full max-w-[360px] space-y-lg">
            <div className="w-20 h-20 rounded-full bg-rausch flex items-center justify-center mx-auto">
              <ScanBarcode size={40} variant="Bold" className="text-white" />
            </div>

            <div>
              <h1 className="text-[24px] leading-[1.18] font-bold text-ink">
                Liên kết IMEI
              </h1>
              <p className="text-[16px] leading-[1.5] text-muted mt-xs">
                Xác nhận liên kết IMEI này với tài khoản Zalo của bạn
              </p>
            </div>

            {/* IMEI Card */}
            <div className="rounded-md border border-hairline p-base text-left">
              <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
                Mã IMEI
              </div>
              <div className="text-[20px] leading-[1.2] font-semibold text-ink font-mono tracking-[-0.18px] mt-xxs break-all">
                {imei.imei_number.replace(/(\d{4})(?=\d)/g, "$1 ")}
              </div>
            </div>

            {/* Permission info */}
            {!customer && (
              <div className="space-y-sm text-left">
                <p className="text-[13px] leading-[1.23] text-muted">
                  Chúng tôi cần xác minh thông tin Zalo của bạn:
                </p>
                <div className="flex items-center gap-sm">
                  <span className="w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center shrink-0">
                    <User size={16} variant="Linear" className="text-ink" />
                  </span>
                  <span className="text-[14px] leading-[1.43] text-muted">
                    Tên và ảnh đại diện Zalo
                  </span>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="w-8 h-8 rounded-full bg-surface-strong flex items-center justify-center shrink-0">
                    <Call size={16} variant="Linear" className="text-ink" />
                  </span>
                  <span className="text-[14px] leading-[1.43] text-muted">
                    Số điện thoại liên kết Zalo
                  </span>
                </div>
              </div>
            )}

            {customer && (
              <div className="rounded-md bg-surface-soft p-base text-left">
                <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
                  Tài khoản
                </div>
                <div className="flex items-center gap-sm mt-xs">
                  {customer.avatar_url && (
                    <img
                      src={customer.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="text-[16px] leading-[1.25] font-semibold text-ink">
                      {customer.name}
                    </div>
                    {customer.phone && (
                      <div className="text-[13px] leading-[1.23] text-muted">
                        {customer.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Linking in progress */}
        {step === "linking" && (
          <div className="space-y-md">
            <div className="w-16 h-16 rounded-full bg-rausch/10 flex items-center justify-center mx-auto">
              <span className="w-6 h-6 border-2 border-rausch/30 border-t-rausch rounded-full animate-spin" />
            </div>
            <p className="text-[16px] leading-[1.25] font-semibold text-ink">
              Đang liên kết IMEI...
            </p>
            <p className="text-[14px] leading-[1.43] text-muted">
              Vui lòng chờ trong giây lát
            </p>
          </div>
        )}

        {/* Error */}
        {step === "error" && error && (
          <div className="w-full max-w-[320px] space-y-lg">
            <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
              <Warning2 size={40} variant="Bold" className="text-danger" />
            </div>
            <div>
              <h1 className="text-[24px] leading-[1.18] font-bold text-ink">
                {error.title}
              </h1>
              <p className="text-[16px] leading-[1.5] text-muted mt-xs">
                {error.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-base pt-base pb-[calc(24px+env(safe-area-inset-bottom))]">
        {step === "imei_info" && (
          <Button
            fullWidth
            onClick={handleConfirm}
            disabled={isLinking || isAuthLoading}
          >
            {isLinking || isAuthLoading ? (
              <span className="flex items-center gap-sm justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : customer ? (
              "Xác nhận liên kết"
            ) : (
              "Đăng ký & Liên kết IMEI"
            )}
          </Button>
        )}

        {step === "error" && error?.canRetry && (
          <Button fullWidth onClick={handleRetry}>
            Thử lại
          </Button>
        )}

        {step === "error" && !error?.canRetry && (
          <Button
            fullWidth
            variant="ghost"
            onClick={() => navigate("/", { replace: true })}
          >
            Về trang chủ
          </Button>
        )}
      </div>
    </div>
  );
}
