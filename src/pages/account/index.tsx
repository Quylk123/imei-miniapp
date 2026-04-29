import {
  ArrowRight2,
  Box1,
  Call,
  Headphone,
  InfoCircle,
  Logout,
  Receipt2,
  ScanBarcode,
  ShieldTick,
  Sms,
  type Icon,
} from "iconsax-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";

import PageHero from "@/components/layout/page-hero";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { customerAtom, logoutAtom } from "@/state/atoms";

interface MenuItem {
  icon: Icon;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const customer = useAtomValue(customerAtom);
  const logout = useSetAtom(logoutAtom);

  const accountItems: MenuItem[] = [
    { icon: ScanBarcode, label: "IMEI của tôi", onClick: () => navigate("/my-imei") },
    { icon: Receipt2, label: "Đơn hàng của tôi", onClick: () => navigate("/orders") },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: Headphone,
      label: "Trung tâm hỗ trợ",
      description: "FAQ và hướng dẫn sử dụng",
      onClick: () => {},
    },
    {
      icon: Call,
      label: "Hotline",
      description: "1900 1234 · 8h–22h hàng ngày",
      onClick: () => {},
    },
    {
      icon: Sms,
      label: "Liên hệ qua Zalo OA",
      description: "Phản hồi trong vòng 1 giờ",
      onClick: () => {},
    },
  ];

  const aboutItems: MenuItem[] = [
    { icon: InfoCircle, label: "Về chúng tôi", onClick: () => {} },
    { icon: ShieldTick, label: "Chính sách bảo mật", onClick: () => {} },
    { icon: Box1, label: "Điều khoản sử dụng", onClick: () => {} },
  ];

  return (
    <Page hero={<PageHero title="Tài khoản" />}>
      {/* Profile card */}
      <section className="rounded-md border border-hairline p-base flex items-center gap-md">
        {customer?.avatar_url ? (
          <img
            src={customer.avatar_url}
            alt={customer.name}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-rausch/10 flex items-center justify-center text-rausch text-[20px] font-bold shrink-0">
            {customer ? customer.name.charAt(0).toUpperCase() : "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          {customer ? (
            <>
              <div className="text-[16px] leading-[1.25] font-semibold text-ink truncate">
                {customer.name}
              </div>
              <div className="text-[14px] leading-[1.43] text-muted truncate">
                {customer.phone}
              </div>
            </>
          ) : (
            <>
              <div className="text-[16px] leading-[1.25] font-semibold text-ink">
                Chưa đăng ký thành viên
              </div>
              <div className="text-[14px] leading-[1.43] text-muted">
                Đăng ký để xem IMEI và đơn hàng
              </div>
            </>
          )}
        </div>
        {!customer && (
          <Button
            size="sm"
            onClick={() =>
              navigate("/auth", {
                state: { reason: "Đăng ký thành viên để dùng đầy đủ ứng dụng." },
              })
            }
          >
            Đăng ký
          </Button>
        )}
      </section>

      <MenuGroup title="Tài khoản" items={accountItems} />
      <MenuGroup title="Hỗ trợ" items={supportItems} />
      <MenuGroup title="Thông tin" items={aboutItems} />

      {customer && (
        <Button
          fullWidth
          variant="ghost"
          className="mt-lg !text-danger active:!bg-danger/5"
          leftIcon={<Logout size={18} variant="Linear" />}
          onClick={() => logout()}
        >
          Đăng xuất
        </Button>
      )}

      <p className="mt-lg text-center text-[13px] leading-[1.23] text-muted">
        Phiên bản 1.0.0
      </p>
    </Page>
  );
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <section className="mt-lg">
      <h2 className="text-[12px] leading-[1.18] uppercase tracking-[0.32px] font-bold text-muted mb-sm px-xs">
        {title}
      </h2>
      <ul className="rounded-md border border-hairline overflow-hidden">
        {items.map((item, i) => {
          const ItemIcon = item.icon;
          return (
            <li key={item.label}>
              <button
                onClick={item.onClick}
                className={`w-full flex items-center gap-md px-base py-md text-left active:bg-surface-soft ${i !== items.length - 1 ? "border-b border-hairline-soft" : ""}`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.danger ? "bg-danger/10 text-danger" : "bg-surface-strong text-ink"}`}
                >
                  <ItemIcon size={18} variant="Linear" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] leading-[1.25] font-medium text-ink truncate">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="block text-[13px] leading-[1.23] text-muted truncate mt-xxs">
                      {item.description}
                    </span>
                  )}
                </span>
                <ArrowRight2 size={18} variant="Linear" className="text-muted shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
