import { ArrowDown2, Call, Sms } from "iconsax-react";
import { useState } from "react";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import {
  HOTLINE_HOURS,
  HOTLINE_NUMBER,
  dialHotline,
  openSupportChat,
} from "@/lib/support";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "Làm thế nào để liên kết SIM với tài khoản?",
    a: "Mở tab \"SIM của tôi\" → bấm \"Quét QR liên kết SIM\" → đặt mã QR trên SIM vào khung hình. Sau khi nhận diện thành công, chọn thiết bị bạn đang gắn SIM vào để hoàn tất.",
  },
  {
    q: "SIM 5G dùng được cho thiết bị nào?",
    a: "SIM 5G hỗ trợ camera giám sát, thiết bị định vị GPS, loa tính tiền, báo cháy và phần lớn thiết bị IoT có hỗ trợ SIM 4G/5G.",
  },
  {
    q: "Tôi có thể gia hạn SIM khi nào?",
    a: "Bạn có thể gia hạn bất kỳ lúc nào trước hoặc sau ngày hết hạn. Nếu SIM đã hết hạn quá 60 ngày mà không gia hạn, SIM sẽ tự động bị thu hồi và cần liên hệ hỗ trợ để xử lý.",
  },
  {
    q: "Gói cước có tự động gia hạn không?",
    a: "Không. Mỗi gói cước có thời hạn cố định. Khi gói hết hạn, bạn cần chủ động vào chi tiết SIM và chọn gói mới để tiếp tục sử dụng.",
  },
  {
    q: "Làm sao để thanh toán?",
    a: "Sau khi chọn gói cước, ứng dụng sẽ dùng Zalo Pay (Checkout SDK) để xử lý thanh toán. Bạn cần có tài khoản Zalo Pay đã liên kết phương thức thanh toán.",
  },
  {
    q: "Tôi mất SIM thì phải làm sao?",
    a: "Vui lòng liên hệ tổng đài hoặc nhắn tin Zalo OA để được hỗ trợ khoá SIM cũ và cấp lại SIM mới.",
  },
];

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <Page>
      <div className="space-y-lg pb-lg">
        <header>
          <h1 className="text-[22px] leading-[1.18] font-semibold text-ink tracking-[-0.18px]">
            Câu hỏi thường gặp
          </h1>
          <p className="mt-xxs text-[14px] leading-[1.43] text-muted">
            Tìm câu trả lời nhanh cho các thắc mắc phổ biến.
          </p>
        </header>

        <ul className="rounded-md border border-hairline divide-y divide-hairline overflow-hidden">
          {FAQS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center gap-md px-base py-md text-left active:bg-surface-soft"
                  aria-expanded={isOpen}
                >
                  <span className="flex-1 text-[15px] leading-[1.33] font-medium text-ink">
                    {item.q}
                  </span>
                  <ArrowDown2
                    size={18}
                    variant="Linear"
                    className={`text-muted shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-base pb-md text-[14px] leading-[1.5] text-body">
                    {item.a}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <section className="rounded-md border border-hairline p-base">
          <h2 className="text-[16px] leading-[1.25] font-semibold text-ink">
            Vẫn cần hỗ trợ?
          </h2>
          <p className="mt-xxs text-[14px] leading-[1.43] text-muted">
            Đội ngũ chăm sóc khách hàng luôn sẵn sàng giải đáp.
          </p>
          <div className="mt-md space-y-sm">
            <Button
              fullWidth
              variant="secondary"
              leftIcon={<Call size={18} variant="Linear" />}
              onClick={dialHotline}
            >
              Gọi {HOTLINE_NUMBER} · {HOTLINE_HOURS}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              leftIcon={<Sms size={18} variant="Linear" />}
              onClick={openSupportChat}
            >
              Nhắn tin Zalo OA
            </Button>
          </div>
        </section>
      </div>
    </Page>
  );
}
