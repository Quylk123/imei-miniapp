import { useSetAtom, useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { shippingDraftAtom } from "@/state/atoms";
import type { ShippingAddress } from "@/types";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}

function Field({ label, value, onChange, placeholder, required, type = "text" }: FieldProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <label className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
        {label}
        {required && <span className="text-danger ml-xxs">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[44px] px-base rounded-md border border-hairline bg-surface-soft text-[15px] leading-[1.33] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors"
      />
    </div>
  );
}

export default function ShippingAddressPage() {
  const navigate = useNavigate();
  const setShipping = useSetAtom(shippingDraftAtom);
  const current = useAtomValue(shippingDraftAtom);

  const [form, setForm] = useState<ShippingAddress>({
    recipient_name: current.recipient_name ?? "",
    recipient_phone: current.recipient_phone ?? "",
    street: current.street ?? "",
    ward: current.ward ?? "",
    district: current.district ?? "",
    province: current.province ?? "",
    notes: current.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  const set = (field: keyof ShippingAddress) => (v: string) =>
    setForm((prev) => ({ ...prev, [field]: v }));

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.recipient_name.trim()) errs.recipient_name = "Vui lòng nhập tên người nhận";
    if (!form.recipient_phone.trim()) errs.recipient_phone = "Vui lòng nhập số điện thoại";
    else if (!/^(0|\+84)\d{8,10}$/.test(form.recipient_phone.replace(/\s/g, "")))
      errs.recipient_phone = "Số điện thoại không hợp lệ";
    if (!form.street.trim()) errs.street = "Vui lòng nhập địa chỉ";
    if (!form.ward.trim()) errs.ward = "Vui lòng nhập phường/xã";
    if (!form.district.trim()) errs.district = "Vui lòng nhập quận/huyện";
    if (!form.province.trim()) errs.province = "Vui lòng nhập tỉnh/thành phố";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = () => {
    if (!validate()) return;
    setShipping(form);
    navigate("/checkout", { replace: true });
  };

  return (
    <Page>
      <div className="space-y-md pb-[calc(96px+env(safe-area-inset-bottom))]">
        {/* Thông tin người nhận */}
        <section className="rounded-md border border-hairline p-base space-y-md">
          <div className="text-[14px] leading-[1.43] font-semibold text-ink">
            Thông tin người nhận
          </div>

          <div className="space-y-sm">
            <Field
              label="Họ và tên"
              value={form.recipient_name}
              onChange={set("recipient_name")}
              placeholder="Nguyễn Văn A"
              required
            />
            {errors.recipient_name && (
              <p className="text-[12px] text-danger">{errors.recipient_name}</p>
            )}

            <Field
              label="Số điện thoại"
              value={form.recipient_phone}
              onChange={set("recipient_phone")}
              placeholder="0901 234 567"
              type="tel"
              required
            />
            {errors.recipient_phone && (
              <p className="text-[12px] text-danger">{errors.recipient_phone}</p>
            )}
          </div>
        </section>

        {/* Địa chỉ */}
        <section className="rounded-md border border-hairline p-base space-y-md">
          <div className="text-[14px] leading-[1.43] font-semibold text-ink">
            Địa chỉ giao hàng
          </div>

          <div className="space-y-sm">
            <Field
              label="Số nhà, tên đường"
              value={form.street}
              onChange={set("street")}
              placeholder="123 Đường Lê Lợi"
              required
            />
            {errors.street && (
              <p className="text-[12px] text-danger">{errors.street}</p>
            )}

            <Field
              label="Phường / Xã"
              value={form.ward}
              onChange={set("ward")}
              placeholder="Phường Bến Nghé"
              required
            />
            {errors.ward && (
              <p className="text-[12px] text-danger">{errors.ward}</p>
            )}

            <Field
              label="Quận / Huyện"
              value={form.district}
              onChange={set("district")}
              placeholder="Quận 1"
              required
            />
            {errors.district && (
              <p className="text-[12px] text-danger">{errors.district}</p>
            )}

            <Field
              label="Tỉnh / Thành phố"
              value={form.province}
              onChange={set("province")}
              placeholder="TP. Hồ Chí Minh"
              required
            />
            {errors.province && (
              <p className="text-[12px] text-danger">{errors.province}</p>
            )}
          </div>
        </section>

        {/* Ghi chú */}
        <section className="rounded-md border border-hairline p-base">
          <label className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Hướng dẫn giao hàng, số tầng, mật khẩu cổng..."
            rows={3}
            className="mt-xs w-full px-base py-sm rounded-md border border-hairline bg-surface-soft text-[15px] leading-[1.5] text-ink placeholder:text-muted focus:outline-none focus:border-ink transition-colors resize-none"
          />
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <Button fullWidth onClick={onSave}>
          Lưu địa chỉ
        </Button>
      </div>
    </Page>
  );
}
