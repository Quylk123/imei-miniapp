import { useSetAtom, useAtomValue } from "jotai";
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import Sheet from "@/components/ui/sheet";
import { shippingDraftAtom } from "@/state/atoms";
import type { ShippingAddress } from "@/types";
import { supabase } from "@/lib/supabase";

/* ─── Text Input Field ──────────────────────────────────────────────────── */

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  error?: string;
}

function Field({ label, value, onChange, placeholder, required, type = "text", error }: FieldProps) {
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
        className={`w-full h-[48px] px-base rounded-sm border bg-canvas text-[15px] leading-[1.33] text-ink placeholder:text-muted-soft focus:outline-none transition-colors ${
          error ? "border-danger" : "border-hairline focus:border-ink"
        }`}
      />
      {error && <p className="text-[12px] text-danger mt-xxs">{error}</p>}
    </div>
  );
}

/* ─── Picker Trigger (looks like an input, opens Sheet) ─────────────────── */

interface PickerTriggerProps {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  onClick: () => void;
}

function PickerTrigger({ label, value, placeholder, required, disabled, loading, error, onClick }: PickerTriggerProps) {
  return (
    <div className="flex flex-col gap-xxs">
      <label className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
        {label}
        {required && <span className="text-danger ml-xxs">*</span>}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`w-full h-[48px] px-base rounded-sm border bg-canvas text-[15px] leading-[1.33] text-left flex items-center justify-between transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          error ? "border-danger" : "border-hairline active:border-ink"
        }`}
      >
        <span className={value ? "text-ink" : "text-muted-soft"}>
          {loading ? "Đang tải..." : value || placeholder}
        </span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted shrink-0 ml-sm">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {error && <p className="text-[12px] text-danger mt-xxs">{error}</p>}
    </div>
  );
}

/* ─── Searchable Bottom Sheet Picker ────────────────────────────────────── */

interface PickerSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: { id: string; name: string }[];
  selectedId: string;
  onSelect: (item: { id: string; name: string }) => void;
}

function PickerSheet({ open, onClose, title, options, selectedId, onSelect }: PickerSheetProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {/* Search */}
      <div className="px-base pb-md">
        <div className="relative">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="absolute left-md top-1/2 -translate-y-1/2 text-muted">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Tìm ${title.toLowerCase()}...`}
            className="w-full h-[44px] pl-[40px] pr-base rounded-sm border border-hairline bg-surface-soft text-[15px] text-ink placeholder:text-muted-soft focus:outline-none focus:border-ink transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-md top-1/2 -translate-y-1/2 text-muted active:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" fill="currentColor" opacity="0.15"/>
                <path d="M6.5 6.5L11.5 11.5M11.5 6.5L6.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="px-base py-xl text-center text-muted text-body-sm">
            Không tìm thấy kết quả
          </div>
        ) : (
          filtered.map((item) => {
            const isSelected = String(item.id) === String(selectedId);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect(item); onClose(); }}
                className={`w-full flex items-center justify-between px-base py-md text-left transition-colors active:bg-surface-soft ${
                  isSelected ? "bg-surface-soft" : ""
                }`}
              >
                <span className={`text-[15px] leading-[1.4] ${isSelected ? "text-ink font-semibold" : "text-body"}`}>
                  {item.name}
                </span>
                {isSelected && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-rausch shrink-0">
                    <path d="M4.5 10.5L8 14L15.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>
    </Sheet>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */

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

  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  // Which picker sheet is open
  const [openPicker, setOpenPicker] = useState<"province" | "district" | "commune" | null>(null);

  // Fetch provinces on mount
  useEffect(() => {
    setLoadingProvinces(true);
    supabase.functions.invoke("pancake-proxy", {
      body: { action: "get-provinces" }
    }).then(({ data }) => {
      if (data?.success) setProvinces(data.data);
    }).finally(() => setLoadingProvinces(false));
  }, []);

  // Fetch districts when province changes
  useEffect(() => {
    if (!form.province_id) { setDistricts([]); return; }
    setLoadingDistricts(true);
    supabase.functions.invoke("pancake-proxy", {
      body: { action: "get-districts", province_id: form.province_id }
    }).then(({ data }) => {
      if (data?.success) setDistricts(data.data);
    }).finally(() => setLoadingDistricts(false));
  }, [form.province_id]);

  // Fetch communes when district changes
  useEffect(() => {
    if (!form.district_id) { setCommunes([]); return; }
    setLoadingCommunes(true);
    supabase.functions.invoke("pancake-proxy", {
      body: { action: "get-communes", district_id: form.district_id }
    }).then(({ data }) => {
      if (data?.success) setCommunes(data.data);
    }).finally(() => setLoadingCommunes(false));
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
    const full_address = [form.address, form.ward, form.district, form.province].filter(Boolean).join(", ");
    setShipping({ ...form, full_address });
    navigate("/checkout", { replace: true });
  };

  return (
    <Page>
      <div className="space-y-md pb-[calc(96px+env(safe-area-inset-bottom))]">
        {/* ── Thông tin người nhận ── */}
        <section className="rounded-sm border border-hairline p-base space-y-base mt-sm">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-rausch/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="3" stroke="#ff385c" strokeWidth="1.5"/>
                <path d="M2.5 14C2.5 11.5 4.5 10 8 10C11.5 10 13.5 11.5 13.5 14" stroke="#ff385c" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-ink">Thông tin người nhận</span>
          </div>

          <div className="space-y-md">
            <Field
              label="Họ và tên"
              value={form.full_name}
              onChange={set("full_name")}
              placeholder="Nguyễn Văn A"
              required
              error={errors.full_name}
            />
            <Field
              label="Số điện thoại"
              value={form.phone_number}
              onChange={set("phone_number")}
              placeholder="0901 234 567"
              type="tel"
              required
              error={errors.phone_number}
            />
          </div>
        </section>

        {/* ── Địa chỉ giao hàng ── */}
        <section className="rounded-sm border border-hairline p-base space-y-base">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-rausch/10 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5C5.24 1.5 3 3.74 3 6.5C3 10.25 8 14.5 8 14.5C8 14.5 13 10.25 13 6.5C13 3.74 10.76 1.5 8 1.5Z" stroke="#ff385c" strokeWidth="1.5"/>
                <circle cx="8" cy="6.5" r="2" stroke="#ff385c" strokeWidth="1.5"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-ink">Địa chỉ giao hàng</span>
          </div>

          <div className="space-y-md">
            <PickerTrigger
              label="Tỉnh / Thành phố"
              value={form.province}
              placeholder="Chọn tỉnh / thành phố"
              required
              loading={loadingProvinces}
              error={errors.province}
              onClick={() => setOpenPicker("province")}
            />
            <PickerTrigger
              label="Quận / Huyện"
              value={form.district}
              placeholder="Chọn quận / huyện"
              required
              disabled={!form.province_id}
              loading={loadingDistricts}
              error={errors.district}
              onClick={() => setOpenPicker("district")}
            />
            <PickerTrigger
              label="Phường / Xã"
              value={form.ward}
              placeholder="Chọn phường / xã"
              required
              disabled={!form.district_id}
              loading={loadingCommunes}
              error={errors.ward}
              onClick={() => setOpenPicker("commune")}
            />
            <Field
              label="Số nhà, tên đường"
              value={form.address}
              onChange={set("address")}
              placeholder="123 Đường Lê Lợi"
              required
              error={errors.address}
            />
          </div>
        </section>

        {/* ── Ghi chú ── */}
        <section className="rounded-sm border border-hairline p-base space-y-xs">
          <label className="text-[12px] uppercase tracking-[0.32px] font-bold text-muted">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Hướng dẫn giao hàng, giờ giao..."
            rows={3}
            className="w-full px-base py-sm rounded-sm border border-hairline bg-canvas text-[15px] leading-[1.5] text-ink placeholder:text-muted-soft focus:outline-none focus:border-ink transition-colors resize-none"
          />
        </section>
      </div>

      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <Button fullWidth onClick={onSave}>
          Lưu địa chỉ
        </Button>
      </div>

      {/* ── Picker Sheets ── */}
      <PickerSheet
        open={openPicker === "province"}
        onClose={() => setOpenPicker(null)}
        title="Tỉnh / Thành phố"
        options={provinces}
        selectedId={form.province_id || ""}
        onSelect={(item) => {
          setForm((prev) => ({
            ...prev,
            province_id: String(item.id),
            province: item.name,
            district_id: "",
            district: "",
            commune_id: "",
            ward: "",
          }));
        }}
      />
      <PickerSheet
        open={openPicker === "district"}
        onClose={() => setOpenPicker(null)}
        title="Quận / Huyện"
        options={districts}
        selectedId={form.district_id || ""}
        onSelect={(item) => {
          setForm((prev) => ({
            ...prev,
            district_id: String(item.id),
            district: item.name,
            commune_id: "",
            ward: "",
          }));
        }}
      />
      <PickerSheet
        open={openPicker === "commune"}
        onClose={() => setOpenPicker(null)}
        title="Phường / Xã"
        options={communes}
        selectedId={form.commune_id || ""}
        onSelect={(item) => {
          setForm((prev) => ({
            ...prev,
            commune_id: String(item.id),
            ward: item.name,
          }));
        }}
      />
    </Page>
  );
}
