import { CloseSquare, ScanBarcode, Warning2, Box1 } from "iconsax-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "zmp-ui";

import Button from "@/components/ui/button";
import {
  fetchLinkableProducts,
  fetchMyIMEIs,
  linkIMEI,
  type LinkableProduct,
} from "@/data/supabase";
import {
  authLoadingAtom,
  customerAtom,
  myImeisAtom,
} from "@/state/atoms";

type Step = "loading" | "list" | "empty" | "linking" | "error";

interface ErrorInfo {
  title: string;
  description: string;
  canRetry?: boolean;
}

export default function SelectProductPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const imeiNumber = searchParams.get("imei") ?? "";

  const customer = useAtomValue(customerAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const setMyImeis = useSetAtom(myImeisAtom);

  const [step, setStep] = useState<Step>("loading");
  const [products, setProducts] = useState<LinkableProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Guard: must have IMEI in URL + customer logged in
  useEffect(() => {
    if (isAuthLoading) return;
    if (!customer) {
      navigate("/auth", {
        replace: true,
        state: {
          redirectTo: `/select-product?imei=${encodeURIComponent(imeiNumber)}`,
          reason: "Vui lòng đăng nhập để liên kết IMEI",
        },
      });
      return;
    }
    if (!imeiNumber) {
      setError({
        title: "Thiếu thông tin IMEI",
        description: "Vui lòng quét lại mã QR.",
      });
      setStep("error");
      return;
    }

    setStep("loading");
    fetchLinkableProducts()
      .then((list) => {
        setProducts(list);
        setStep(list.length === 0 ? "empty" : "list");
      })
      .catch((err) => {
        console.error("[select-product] fetch failed:", err);
        setError({
          title: "Không thể tải danh sách",
          description:
            err instanceof Error ? err.message : "Lỗi kết nối. Vui lòng thử lại.",
          canRetry: true,
        });
        setStep("error");
      });
  }, [isAuthLoading, customer, imeiNumber, navigate]);

  const handleConfirm = async () => {
    if (!customer || !selectedId || !imeiNumber) return;
    setSubmitting(true);
    setStep("linking");
    try {
      const result = await linkIMEI(imeiNumber, customer.id, selectedId);
      const fresh = await fetchMyIMEIs(customer.id);
      setMyImeis(fresh);
      navigate(`/my-imei/${result.imei.id}`, { replace: true });
    } catch (err) {
      console.error("[select-product] link failed:", err);
      const msg = err instanceof Error ? err.message : "Không thể liên kết IMEI.";
      if (msg.includes("Already linked")) {
        setError({
          title: "QR đã được liên kết",
          description: "IMEI này đã được liên kết bởi tài khoản khác.",
        });
      } else {
        setError({
          title: "Liên kết thất bại",
          description: msg,
          canRetry: true,
        });
      }
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header — match /activate */}
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
            onClick={() => navigate(-1)}
            aria-label="Quay lại"
            className="w-11 h-11 flex items-center justify-center rounded-full text-ink active:bg-surface-strong transition-colors shrink-0"
          >
            <CloseSquare size={24} variant="Linear" />
          </button>
          <div className="flex-1 text-[16px] leading-[1.25] font-semibold text-ink truncate">
            Chọn sản phẩm
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-base">
        {/* Loading */}
        {step === "loading" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-md">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
              <span className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            </div>
            <p className="text-[16px] leading-[1.25] font-semibold text-ink">
              Đang tải sản phẩm...
            </p>
          </div>
        )}

        {/* Empty state — block flow per spec */}
        {step === "empty" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-lg w-full max-w-[320px] mx-auto">
            <div className="w-20 h-20 rounded-full bg-surface-strong flex items-center justify-center mx-auto">
              <Box1 size={40} variant="Linear" className="text-muted" />
            </div>
            <div>
              <h1 className="text-[24px] leading-[1.18] font-bold text-ink">
                Chưa có sản phẩm khả dụng
              </h1>
              <p className="text-[16px] leading-[1.5] text-muted mt-xs">
                Hệ thống chưa có sản phẩm nào để liên kết IMEI. Vui lòng liên hệ
                cửa hàng.
              </p>
            </div>
          </div>
        )}

        {/* Linking in progress */}
        {step === "linking" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-md">
            <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
              <span className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
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
          <div className="flex-1 flex flex-col items-center justify-center text-center w-full max-w-[320px] mx-auto space-y-lg">
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

        {/* List */}
        {step === "list" && (
          <div className="py-base space-y-md">
            <div className="flex items-center gap-sm rounded-md border border-hairline p-base">
              <ScanBarcode size={20} variant="Linear" className="text-brand shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
                  IMEI
                </p>
                <p className="text-[14px] leading-[1.43] text-ink font-mono truncate">
                  {imeiNumber.replace(/(\d{4})(?=\d)/g, "$1 ")}
                </p>
              </div>
            </div>

            <p className="text-[14px] leading-[1.43] text-muted">
              Chọn sản phẩm bạn vừa mua để liên kết với IMEI:
            </p>

            <div className="space-y-sm">
              {products.map((p) => {
                const isSelected = selectedId === p.id;
                const cover =
                  p.image_url ?? (p.image_urls.length > 0 ? p.image_urls[0] : null);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={[
                      "w-full flex items-center gap-sm p-base rounded-md border transition-all text-left",
                      isSelected
                        ? "border-brand bg-brand/5"
                        : "border-hairline bg-surface-soft hover:border-hairline-strong",
                    ].join(" ")}
                  >
                    <div className="w-14 h-14 rounded-md bg-surface-strong overflow-hidden shrink-0">
                      {cover ? (
                        <img
                          src={cover}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Box1 size={24} variant="Linear" className="text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] leading-[1.25] font-semibold text-ink truncate">
                        {p.name}
                      </p>
                      {p.description && (
                        <p className="text-[13px] leading-[1.4] text-muted line-clamp-2 mt-xxs">
                          {p.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={[
                        "w-5 h-5 rounded-full border-2 shrink-0",
                        isSelected ? "border-brand bg-brand" : "border-hairline",
                      ].join(" ")}
                      style={{
                        boxShadow: isSelected ? "inset 0 0 0 3px white" : undefined,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-base pt-base pb-[calc(24px+env(safe-area-inset-bottom))]">
        {step === "list" && (
          <Button
            fullWidth
            onClick={handleConfirm}
            disabled={!selectedId || submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-sm justify-center">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              "Xác nhận liên kết"
            )}
          </Button>
        )}

        {step === "empty" && (
          <Button fullWidth variant="ghost" onClick={() => navigate("/", { replace: true })}>
            Về trang chủ
          </Button>
        )}

        {step === "error" && error?.canRetry && (
          <Button fullWidth onClick={() => window.location.reload()}>
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
