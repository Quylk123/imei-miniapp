import { useSetAtom, useAtomValue } from "jotai";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { shippingDraftAtom } from "@/state/atoms";
import type { ShippingAddress } from "@/types";
import { supabase } from "@/lib/supabase";

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

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

function SelectField({ label, value, onChange, placeholder, required, options, disabled }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <label className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
        {label}
        {required && <span className="text-danger ml-xxs">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-[44px] px-base rounded-md border border-hairline bg-surface-soft text-[15px] leading-[1.33] text-ink focus:outline-none focus:border-ink transition-colors appearance-none disabled:opacity-50"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function ShippingAddressPage() {
  const navigate = useNavigate();
  const setShipping = useSetAtom(shippingDraftAtom);
  const current = useAtomValue(shippingDraftAtom);

  const [form, setForm] = useState<ShippingAddress>({
    full_name: current.full_name ?? "",
    phone_number: current.phone_number ?? "",
    address: current.address ?? "",
    ward: current.ward ?? "",
    district: current.district ?? "",
    province: current.province ?? "",
    commune_id: current.commune_id ?? "",
    district_id: current.district_id ?? "",
    province_id: current.province_id ?? "",
    full_address: current.full_address ?? "",
    notes: current.notes ?? "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [communes, setCommunes] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.functions.invoke("pancake-proxy", {
      body: { action: "get-provinces" }
    }).then(({ data }) => {
      if (data?.success) setProvinces(data.data);
    });
  }, []);

  useEffect(() => {
    if (!form.province_id) {
      setDistricts([]);
      return;
    }
    supabase.functions.invoke("pancake-proxy", {
      body: { action: "get-districts", province_id: form.province_id }
    }).then(({ data }) => {
      if (data?.success) setDistricts(data.data);
    });
  }, [form.province_id]);

  useEffect(() => {
    if (!form.district_id) {
      setCommunes([]);
      return;
    }
    supabase.functions.invoke("pancake-proxy", {
      body: { action: "get-communes", district_id: form.district_id }
    }).then(({ data }) => {
      if (data?.success) setCommunes(data.data);
    });
  }, [form.district_id]);

  const set = (field: keyof ShippingAddress) => (v: string) =>
    setForm((prev) => ({ ...prev, [field]: v }));

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.full_name.trim()) errs.full_name = "Vui lòng nhập tên người nhận";
    if (!form.phone_number.trim()) errs.phone_number = "Vui lòng nhập số điện thoại";
    else if (!/^(0|\+84)\d{8,10}$/.test(form.phone_number.replace(/\s/g, "")))
      errs.phone_number = "Số điện thoại không hợp lệ";
    if (!form.address.trim()) errs.address = "Vui lòng nhập địa chỉ cụ thể";
    if (!form.commune_id?.trim()) errs.ward = "Vui lòng chọn phường/xã";
    if (!form.district_id?.trim()) errs.district = "Vui lòng chọn quận/huyện";
    if (!form.province_id?.trim()) errs.province = "Vui lòng chọn tỉnh/thành phố";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = () => {
    if (!validate()) return;
    
    // Auto generate full_address for Pancake
    const full_address = [form.address, form.ward, form.district, form.province].filter(Boolean).join(", ");
    
    setShipping({ ...form, full_address });
    navigate("/checkout", { replace: true });
  };

  return (
    <Page>
      <div className="space-y-md pb-[calc(96px+env(safe-area-inset-bottom))]">
        {/* Thông tin người nhận */}
        <section className="rounded-md border border-hairline p-base space-y-md mt-sm">
          <div className="text-[14px] leading-[1.43] font-semibold text-ink">
            Thông tin người nhận
          </div>

          <div className="space-y-sm">
            <Field
              label="Họ và tên"
              value={form.full_name}
              onChange={set("full_name")}
              placeholder="Nguyễn Văn A"
              required
            />
            {errors.full_name && (
              <p className="text-[12px] text-danger">{errors.full_name}</p>
            )}

            <Field
              label="Số điện thoại"
              value={form.phone_number}
              onChange={set("phone_number")}
              placeholder="0901 234 567"
              type="tel"
              required
            />
            {errors.phone_number && (
              <p className="text-[12px] text-danger">{errors.phone_number}</p>
            )}
          </div>
        </section>

        {/* Địa chỉ */}
        <section className="rounded-md border border-hairline p-base space-y-md">
          <div className="text-[14px] leading-[1.43] font-semibold text-ink">
            Địa chỉ giao hàng
          </div>

          <div className="space-y-sm">
            <SelectField
              label="Tỉnh / Thành phố"
              value={form.province_id || ""}
              onChange={(val) => {
                const selected = provinces.find((p) => String(p.id) === String(val));
                setForm((prev) => ({
                  ...prev,
                  province_id: val,
                  province: selected?.name || "",
                  district_id: "",
                  district: "",
                  commune_id: "",
                  ward: "",
                }));
              }}
              options={provinces.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Chọn Tỉnh / Thành phố"
              required
            />
            {errors.province && <p className="text-[12px] text-danger">{errors.province}</p>}

            <SelectField
              label="Quận / Huyện"
              value={form.district_id || ""}
              onChange={(val) => {
                const selected = districts.find((p) => String(p.id) === String(val));
                setForm((prev) => ({
                  ...prev,
                  district_id: val,
                  district: selected?.name || "",
                  commune_id: "",
                  ward: "",
                }));
              }}
              options={districts.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Chọn Quận / Huyện"
              disabled={!form.province_id}
              required
            />
            {errors.district && <p className="text-[12px] text-danger">{errors.district}</p>}

            <SelectField
              label="Phường / Xã"
              value={form.commune_id || ""}
              onChange={(val) => {
                const selected = communes.find((p) => String(p.id) === String(val));
                setForm((prev) => ({
                  ...prev,
                  commune_id: val,
                  ward: selected?.name || "",
                }));
              }}
              options={communes.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Chọn Phường / Xã"
              disabled={!form.district_id}
              required
            />
            {errors.ward && <p className="text-[12px] text-danger">{errors.ward}</p>}

            <Field
              label="Số nhà, tên đường"
              value={form.address}
              onChange={set("address")}
              placeholder="123 Đường Lê Lợi"
              required
            />
            {errors.address && (
              <p className="text-[12px] text-danger">{errors.address}</p>
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
            placeholder="Hướng dẫn giao hàng, giờ giao..."
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
