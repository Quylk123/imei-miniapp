import { TickCircle, TickSquare } from "iconsax-react";
import { useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { setRenewalIntent } from "@/data/supabase";
import { refreshCustomerDataAtom } from "@/state/atoms";

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const refresh = useSetAtom(refreshCustomerDataAtom);
  const didRefresh = useRef(false);

  // Khảo sát ngắn: bạn có muốn gia hạn không? — optional, không bắt buộc.
  // null = chưa trả lời, true/false = đã chọn. Tự lưu lên DB khi user click.
  const [intent, setIntent] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (didRefresh.current) return;
    didRefresh.current = true;

    // Refresh ngay để có đơn hàng mới trong danh sách
    refresh();

    // Refresh lại sau 3 giây để bắt kịp trạng thái từ webhook
    // (webhook callback-order cập nhật IMEI/order sau khi thanh toán)
    const timer = setTimeout(() => {
      refresh();
    }, 3000);

    return () => clearTimeout(timer);
  }, [refresh]);

  const pickIntent = async (value: boolean) => {
    if (!orderId) return;
    // Toggle off nếu click lại cùng option (cho user bỏ chọn)
    const next = intent === value ? null : value;
    setIntent(next);
    setSaving(true);
    try {
      await setRenewalIntent(Number(orderId), next);
    } catch (err) {
      console.warn("[order-success] set renewal_intent failed:", err);
      // Im lặng — đây là khảo sát optional, không gián đoạn flow
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      <div className="pt-section flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mb-base">
          <TickCircle size={48} variant="Bold" className="text-brand" />
        </div>
        <div className="text-[28px] leading-[1.18] font-bold text-ink">
          Thanh toán thành công
        </div>
        <p className="text-[16px] leading-[1.5] text-muted mt-sm max-w-[300px]">
          Đơn hàng <span className="text-ink font-medium">#{orderId}</span> đã được ghi
          nhận. Bạn có thể theo dõi trạng thái trong "Đơn hàng".
        </p>

        {/* Khảo sát optional */}
        <section className="mt-xl w-full max-w-[360px] rounded-md border border-hairline p-base text-left">
          <div className="flex items-center justify-between gap-sm">
            <h2 className="text-[16px] leading-[1.25] font-semibold text-ink">
              Bạn có nhu cầu gia hạn trong tương lai không?
            </h2>
            {saving && (
              <span className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin shrink-0" />
            )}
          </div>
          <p className="text-[13px] leading-[1.43] text-muted mt-xxs">
            Câu hỏi không bắt buộc — giúp chúng tôi gợi ý gói phù hợp lần sau.
          </p>
          <div className="mt-md grid grid-cols-2 gap-sm">
            <IntentOption
              label="Có"
              selected={intent === true}
              disabled={saving}
              onClick={() => pickIntent(true)}
            />
            <IntentOption
              label="Không"
              selected={intent === false}
              disabled={saving}
              onClick={() => pickIntent(false)}
            />
          </div>
        </section>

        <div className="mt-xl w-full max-w-[320px]">
          <Button fullWidth onClick={() => navigate("/", { replace: true })}>
            Về trang chủ
          </Button>
        </div>
      </div>
    </Page>
  );
}

function IntentOption({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-sm rounded-md border-2 px-base py-md transition-colors text-[14px] leading-[1.43] font-semibold ${
        selected
          ? "border-brand bg-brand/5 text-ink"
          : "border-hairline text-ink active:border-hairline-strong"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <span
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
          selected ? "border-brand bg-brand text-white" : "border-hairline-strong"
        }`}
      >
        {selected && <TickSquare size={12} variant="Bold" />}
      </span>
      {label}
    </button>
  );
}
