import { Call, Location, Sms } from "iconsax-react";

import Page from "@/components/ui/page";
import { HOTLINE_NUMBER, dialHotline, openSupportChat } from "@/lib/support";

export default function AboutPage() {
  return (
    <Page>
      <div className="space-y-lg pb-lg">
        <header>
          <h1 className="text-[22px] leading-[1.18] font-semibold text-ink tracking-[-0.18px]">
            Về chúng tôi
          </h1>
          <p className="mt-xxs text-[14px] leading-[1.43] text-muted">
            Giải pháp SIM 5G cho thiết bị IoT.
          </p>
        </header>

        <section className="rounded-md border border-hairline p-base">
          <p className="text-[15px] leading-[1.5] text-body">
            Chúng tôi cung cấp dịch vụ SIM 5G chuyên dụng cho camera giám sát,
            thiết bị định vị GPS, loa tính tiền, hệ thống báo cháy và các thiết
            bị IoT khác. Mạng lưới phủ sóng toàn quốc, hỗ trợ 24/7, gia hạn linh
            hoạt theo nhu cầu sử dụng.
          </p>
        </section>

        <section>
          <h2 className="text-[12px] leading-[1.18] uppercase tracking-[0.32px] font-bold text-muted mb-sm px-xs">
            Giá trị cốt lõi
          </h2>
          <ul className="rounded-md border border-hairline divide-y divide-hairline overflow-hidden">
            <ValueRow
              title="Đơn giản"
              desc="Liên kết SIM bằng QR, kích hoạt một chạm, không cần đăng ký phức tạp."
            />
            <ValueRow
              title="Minh bạch"
              desc="Giá gói cước niêm yết rõ ràng, không phí ẩn, không tự động trừ tiền."
            />
            <ValueRow
              title="Đồng hành"
              desc="Hỗ trợ trực tiếp qua Zalo OA, hotline phản hồi trong giờ làm việc."
            />
          </ul>
        </section>

        <section>
          <h2 className="text-[12px] leading-[1.18] uppercase tracking-[0.32px] font-bold text-muted mb-sm px-xs">
            Liên hệ
          </h2>
          <ul className="rounded-md border border-hairline divide-y divide-hairline overflow-hidden">
            <ContactRow
              icon={<Call size={18} variant="Linear" />}
              label={`Hotline ${HOTLINE_NUMBER}`}
              onClick={dialHotline}
            />
            <ContactRow
              icon={<Sms size={18} variant="Linear" />}
              label="Zalo Official Account"
              onClick={openSupportChat}
            />
            <li className="flex items-start gap-md px-base py-md">
              <span className="w-8 h-8 rounded-full bg-surface-strong text-ink flex items-center justify-center shrink-0">
                <Location size={18} variant="Linear" />
              </span>
              <span className="flex-1 text-[15px] leading-[1.33] text-ink">
                Tầng 5, Toà nhà Innovation, 123 Nguyễn Huệ, Quận 1, TP. HCM
              </span>
            </li>
          </ul>
        </section>

        <p className="text-center text-[13px] leading-[1.23] text-muted">
          Phiên bản 1.0.0
        </p>
      </div>
    </Page>
  );
}

function ValueRow({ title, desc }: { title: string; desc: string }) {
  return (
    <li className="px-base py-md">
      <div className="text-[15px] leading-[1.33] font-semibold text-ink">
        {title}
      </div>
      <div className="text-[14px] leading-[1.43] text-muted mt-xxs">{desc}</div>
    </li>
  );
}

function ContactRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-md px-base py-md text-left active:bg-surface-soft"
      >
        <span className="w-8 h-8 rounded-full bg-surface-strong text-ink flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="flex-1 text-[15px] leading-[1.33] text-ink">
          {label}
        </span>
      </button>
    </li>
  );
}
