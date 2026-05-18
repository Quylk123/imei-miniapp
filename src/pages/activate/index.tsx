import { Call, CloseSquare, Simcard1, TickSquare, User, Warning2, Clock, Box1 } from "iconsax-react";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "zmp-ui";

import Button from "@/components/ui/button";
import { lookupIMEI, transferIMEI } from "@/data/supabase";
import { daysUntil, displayImei, formatExpiry } from "@/lib/format";
import {
  customerAtom,
  authLoadingAtom,
} from "@/state/atoms";

type ActivateStep =
  | "loading"
  | "imei_info"          // status='sold', chưa có chủ → render nút "Tiếp tục"
  | "transfer_choice"    // có chủ khác → user chọn "thanh toán giúp" hoặc "đổi chủ"
  | "transfer_confirm"   // user đã chọn đổi chủ → render checkbox xác nhận
  | "error";

interface ErrorInfo {
  title: string;
  description: string;
  canRetry?: boolean;
}

interface ImeiPreview {
  id: string;
  imei_number: string;
  // Chỉ có khi IMEI thuộc tài khoản khác
  status?: string;
  expiry_date?: string | null;
  active_package_name?: string | null;
  product_name?: string | null;
  can_transfer?: boolean;
  can_renew?: boolean;
}

// Tooltip status — friendly Vietnamese cho từng trạng thái IMEI khi proxy view.
function statusLabel(status?: string): { label: string; tone: "ok" | "warn" | "muted" } {
  switch (status) {
    case "activated":
      return { label: "Đang hoạt động", tone: "ok" };
    case "pending_activation":
      return { label: "Chờ kích hoạt", tone: "muted" };
    case "locked":
      return { label: "Đã khóa — hết hạn", tone: "warn" };
    default:
      return { label: status ?? "", tone: "muted" };
  }
}

export default function ActivatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imeiNumber = searchParams.get("imei") ?? "";

  const customer = useAtomValue(customerAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);

  const [step, setStep] = useState<ActivateStep>("loading");
  const [imei, setImei] = useState<ImeiPreview | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Step 0: Wait for auth, redirect to login if not authenticated
  useEffect(() => {
    if (isAuthLoading) return; // chờ autoLogin xong

    if (!customer) {
      // Chưa đăng nhập → chuyển sang trang auth, giữ lại redirect URL
      navigate("/auth", {
        replace: true,
        state: {
          redirectTo: `/activate?imei=${encodeURIComponent(imeiNumber)}`,
          reason: "Vui lòng đăng ký thành viên để kích hoạt SIM của bạn",
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
        description: "Không tìm thấy thông tin SIM từ mã QR. Vui lòng thử quét lại.",
      });
      setStep("error");
      return;
    }

    setStep("loading");
    lookupIMEI(imeiNumber)
      .then((result) => {
        if (!result.exists) {
          setError({
            title: "Không tìm thấy SIM",
            description: `Mã IMEI "${imeiNumber}" không tồn tại trong hệ thống.`,
          });
          setStep("error");
          return;
        }

        if (result.ownership === "unavailable") {
          if (result.reason === "recalled") {
            setError({
              title: "Mã QR không còn hiệu lực",
              description: "SIM này đã bị thu hồi. Vui lòng liên hệ hỗ trợ.",
            });
          } else {
            setError({
              title: "SIM chưa sẵn sàng",
              description: "SIM này chưa được phân phối. Vui lòng liên hệ đại lý.",
            });
          }
          setStep("error");
          return;
        }

        if (result.ownership === "mine" && result.imei_id) {
          navigate(`/my-imei/${result.imei_id}`, { replace: true });
          return;
        }

        if (result.ownership === "unowned" && result.imei_id) {
          setImei({ id: result.imei_id, imei_number: imeiNumber });
          setStep("imei_info");
          return;
        }

        if (result.ownership === "other") {
          if (!result.imei_id || (!result.can_transfer && !result.can_renew)) {
            setError({
              title: "Không thể tiếp tục",
              description: `Trạng thái SIM hiện tại không cho phép thao tác (${result.status}).`,
            });
            setStep("error");
            return;
          }
          setImei({
            id: result.imei_id,
            imei_number: imeiNumber,
            status: result.status,
            expiry_date: result.expiry_date ?? null,
            active_package_name: result.active_package_name ?? null,
            product_name: result.product_name ?? null,
            can_transfer: !!result.can_transfer,
            can_renew: !!result.can_renew,
          });
          setTransferConfirmed(false);
          setStep("transfer_choice");
          return;
        }

        setError({
          title: "Không xác định được trạng thái",
          description: "Vui lòng thử lại hoặc liên hệ hỗ trợ.",
          canRetry: true,
        });
        setStep("error");
      })
      .catch((err) => {
        console.error("[activate] Lookup IMEI failed:", err);
        setError({
          title: "Lỗi kết nối",
          description: "Không thể kiểm tra thông tin SIM. Vui lòng thử lại.",
          canRetry: true,
        });
        setStep("error");
      });
  }, [isAuthLoading, customer, imeiNumber, navigate]);

  // Step 2: Handle continue — chuyển sang trang chọn sản phẩm.
  // KHÔNG gọi linkIMEI ở đây nữa — chỉ link sau khi user xác nhận product.
  const handleContinue = () => {
    if (!imei) return;
    navigate(`/select-product?imei=${encodeURIComponent(imei.imei_number)}`, {
      replace: true,
    });
  };

  const handleRetry = () => {
    setError(null);
    setStep("loading");
    // Re-trigger by re-mounting
    window.location.reload();
  };

  // User chọn "Thanh toán giúp" — IMEI giữ chủ cũ, B chỉ trả tiền cho gói
  const handleRenewForOwner = () => {
    if (!imei) return;
    navigate(`/renew/${imei.id}?imei=${encodeURIComponent(imei.imei_number)}`);
  };

  // User chọn "Đổi chủ" — chuyển sang sub-step xác nhận
  const handleChooseTransfer = () => {
    setTransferConfirmed(false);
    setStep("transfer_confirm");
  };

  // Step 2 alt: confirm chuyển quyền — IMEI đã thuộc tài khoản khác,
  // user xác nhận đây là thiết bị của mình → call EF transfer-imei.
  const handleTransfer = async () => {
    if (!imei || transferring || !transferConfirmed) return;
    setTransferring(true);
    try {
      const result = await transferIMEI(imei.imei_number);
      navigate(`/my-imei/${result.imei_id}`, { replace: true });
    } catch (err) {
      console.error("[activate] Transfer IMEI failed:", err);
      const msg = err instanceof Error ? err.message : "Không thể cập nhật chủ.";
      setError({
        title: "Cập nhật chủ thất bại",
        description: msg,
        canRetry: true,
      });
      setStep("error");
    } finally {
      setTransferring(false);
    }
  };

  // ── Render ──
  const headerTitle =
    step === "transfer_choice"
      ? "SIM đã được kích hoạt"
      : step === "transfer_confirm"
        ? "Cập nhật chủ"
        : "Kích hoạt SIM";

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header — match AppHeader default variant: safe-top + reserve 96px
          phải cho nút native Zalo "... ×". Khác back-history thường: X ở đây
          luôn về "/" replace (close cả flow activate). */}
      <header
        className="sticky top-0 z-30 bg-canvas text-ink border-b border-hairline-soft"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <div
          className="flex items-center gap-xs"
          style={{
            minHeight: "64px",
            paddingLeft: "4px",
            paddingRight: "96px",
          }}
        >
          <button
            onClick={() => {
              if (step === "transfer_confirm") {
                setStep("transfer_choice");
              } else {
                navigate("/", { replace: true });
              }
            }}
            aria-label={step === "transfer_confirm" ? "Quay lại" : "Đóng"}
            className="w-11 h-11 flex items-center justify-center rounded-full text-ink active:bg-surface-strong transition-colors shrink-0"
          >
            <CloseSquare size={24} variant="Linear" />
          </button>
          <div className="flex-1 text-[16px] leading-[1.25] font-semibold text-ink truncate">
            {headerTitle}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-base text-center">
        {/* Loading */}
        {step === "loading" && (
          <div className="space-y-md">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
              <span className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            </div>
            <p className="text-[16px] leading-[1.25] font-semibold text-ink">
              Đang kiểm tra SIM...
            </p>
            <p className="text-[14px] leading-[1.43] text-muted">
              {imeiNumber}
            </p>
          </div>
        )}

        {/* IMEI Info — Ready to link */}
        {step === "imei_info" && imei && (
          <div className="w-full max-w-[360px] space-y-lg">
            <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center mx-auto">
              <Simcard1 size={40} variant="Bold" className="text-white" />
            </div>

            <div>
              <h1 className="text-[24px] leading-[1.18] font-bold text-ink">
                Liên kết SIM
              </h1>
              <p className="text-[16px] leading-[1.5] text-muted mt-xs">
                Xác nhận liên kết SIM này với tài khoản Zalo của bạn
              </p>
            </div>

            {/* SIM Card */}
            <div className="rounded-md border border-hairline p-base text-left">
              <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
                Mã IMEI
              </div>
              <div className="text-[20px] leading-[1.2] font-semibold text-ink font-mono tracking-[-0.18px] mt-xxs break-all">
                {displayImei(imei.imei_number)}
              </div>
              <p className="text-[12px] leading-[1.18] text-muted mt-xs">
                Mã IMEI là chuỗi định danh duy nhất của SIM 5G.
              </p>
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

        {/* Transfer choice — IMEI đang thuộc tài khoản khác, hiển thị status +
            cho user chọn "thanh toán giúp" hoặc "đổi chủ". */}
        {step === "transfer_choice" && imei && (
          <div className="w-full max-w-[360px] space-y-lg py-lg">
            <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
              <Clock size={40} variant="Bold" className="text-brand" />
            </div>

            <div>
              <h1 className="text-[24px] leading-[1.18] font-bold text-ink">
                SIM này đã có chủ
              </h1>
              <p className="text-[16px] leading-[1.5] text-muted mt-xs">
                Bạn có thể thanh toán hộ chủ hiện tại hoặc tiếp nhận để
                tự quản lý SIM.
              </p>
            </div>

            {/* Status card — IMEI + product + package + expiry */}
            <div className="rounded-md border border-hairline p-base text-left space-y-sm">
              <div>
                <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
                  Mã IMEI
                </div>
                <div className="text-[18px] leading-[1.2] font-semibold text-ink font-mono tracking-[-0.18px] mt-xxs break-all">
                  {displayImei(imei.imei_number)}
                </div>
              </div>

              {imei.product_name && (
                <div className="flex items-center gap-sm pt-sm border-t border-hairline-soft">
                  <Box1 size={16} variant="Linear" className="text-muted shrink-0" />
                  <span className="text-[14px] leading-[1.43] text-ink">
                    {imei.product_name}
                  </span>
                </div>
              )}

              <div className="pt-sm border-t border-hairline-soft flex items-center justify-between">
                <span className="text-[13px] leading-[1.23] text-muted">Trạng thái</span>
                <StatusBadge {...statusLabel(imei.status)} />
              </div>

              {imei.active_package_name && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] leading-[1.23] text-muted">Gói cước</span>
                  <span className="text-[14px] leading-[1.43] text-ink font-medium">
                    {imei.active_package_name}
                  </span>
                </div>
              )}

              {imei.expiry_date && (
                <RemainingTimeRow expiry={imei.expiry_date} status={imei.status} />
              )}
            </div>

            {/* Hint mềm */}
            <p className="text-[13px] leading-[1.43] text-muted">
              {imei.status === "locked"
                ? "SIM đã hết hạn — gia hạn để khôi phục dịch vụ. Chủ sở hữu hiện tại sẽ không thay đổi."
                : "Bạn có thể trả tiền gói cước giúp chủ hiện tại, hoặc nhận quyền quản lý SIM về tài khoản của mình."}
            </p>
          </div>
        )}

        {/* Transfer confirm — user đã chọn "đổi chủ" */}
        {step === "transfer_confirm" && imei && (
          <div className="w-full max-w-[360px] space-y-lg">
            <div className="w-20 h-20 rounded-full bg-warning/15 flex items-center justify-center mx-auto">
              <Warning2 size={40} variant="Bold" className="text-warning" />
            </div>

            <div>
              <h1 className="text-[24px] leading-[1.18] font-bold text-ink">
                Cập nhật chủ SIM
              </h1>
              <p className="text-[16px] leading-[1.5] text-muted mt-xs">
                SIM này đang thuộc về tài khoản khác. Bạn có thể cập nhật để
                quản lý SIM và nhận thông báo gia hạn.
              </p>
            </div>

            {/* IMEI Card */}
            <div className="rounded-md border border-hairline p-base text-left">
              <div className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
                Mã IMEI
              </div>
              <div className="text-[20px] leading-[1.2] font-semibold text-ink font-mono tracking-[-0.18px] mt-xxs break-all">
                {displayImei(imei.imei_number)}
              </div>
            </div>

            {/* Cảnh báo hệ quả */}
            <div className="rounded-md bg-warning/10 border border-warning/30 p-base text-left">
              <p className="text-[13px] leading-[1.43] text-ink">
                Sau khi cập nhật, chủ cũ sẽ không còn quản lý được SIM này. Hạn
                sử dụng và gói cước hiện tại được giữ nguyên cho bạn.
              </p>
            </div>

            {/* Checkbox xác nhận */}
            <button
              type="button"
              onClick={() => setTransferConfirmed((v) => !v)}
              className="w-full flex items-start gap-sm text-left"
            >
              <span
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-[2px] shrink-0 transition-colors ${transferConfirmed ? "border-brand bg-brand text-white" : "border-hairline-strong"}`}
              >
                {transferConfirmed && (
                  <TickSquare size={12} variant="Bold" />
                )}
              </span>
              <span className="text-[14px] leading-[1.43] text-ink">
                Tôi xác nhận đây là thiết bị của tôi và đồng ý nhận quyền quản
                lý SIM này.
              </span>
            </button>
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
            onClick={handleContinue}
            disabled={isAuthLoading}
          >
            {isAuthLoading ? (
              <span className="flex items-center gap-sm justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              "Tiếp tục"
            )}
          </Button>
        )}

        {step === "transfer_choice" && imei && (
          <div className="space-y-sm">
            {imei.can_renew && (
              <Button fullWidth onClick={handleRenewForOwner}>
                Thanh toán giúp · giữ chủ hiện tại
              </Button>
            )}
            {imei.can_transfer && (
              <Button fullWidth variant="ghost" onClick={handleChooseTransfer}>
                Đổi chủ sở hữu SIM
              </Button>
            )}
          </div>
        )}

        {step === "transfer_confirm" && (
          <Button
            fullWidth
            onClick={handleTransfer}
            disabled={!transferConfirmed || transferring}
          >
            {transferring ? (
              <span className="flex items-center gap-sm justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang cập nhật...
              </span>
            ) : (
              "Cập nhật chủ"
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

function StatusBadge({ label, tone }: { label: string; tone: "ok" | "warn" | "muted" }) {
  // Tone palette align với my-imei/detail.tsx (amber cho warn, brand-green-ish
  // cho ok, surface-strong cho muted).
  const toneCls =
    tone === "ok"
      ? "bg-[rgba(22,163,74,0.10)] text-[#15803d]"
      : tone === "warn"
        ? "bg-[rgba(245,166,35,0.12)] text-[#7a4f00]"
        : "bg-surface-strong text-muted";
  return (
    <span className={`px-sm py-xxs rounded-full text-[12px] font-semibold ${toneCls}`}>
      {label}
    </span>
  );
}

function RemainingTimeRow({ expiry, status }: { expiry: string; status?: string }) {
  const days = daysUntil(expiry);
  let label: string;
  let tone: "ok" | "warn" | "muted" = "ok";

  if (status === "locked") {
    label = "Đã hết hạn";
    tone = "warn";
  } else if (days <= 0) {
    label = "Hết hạn hôm nay";
    tone = "warn";
  } else if (days <= 7) {
    label = `Còn ${days} ngày`;
    tone = "warn";
  } else {
    label = `Còn ${days} ngày`;
    tone = "ok";
  }

  const toneCls =
    tone === "ok" ? "text-[#15803d]" : tone === "warn" ? "text-[#7a4f00]" : "text-ink";

  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] leading-[1.23] text-muted">Thời hạn còn lại</span>
      <div className="text-right">
        <div className={`text-[14px] leading-[1.43] font-semibold ${toneCls}`}>
          {label}
        </div>
        <div className="text-[12px] leading-[1.18] text-muted">
          Hết hạn {formatExpiry(expiry)}
        </div>
      </div>
    </div>
  );
}
