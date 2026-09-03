import { ArrowRight2, CloseSquare, Edit2, Simcard1, TickSquare } from "iconsax-react";
import { useAtom } from "jotai";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import StatusBadge from "@/components/imei/status-badge";
import { updateCustomerNote } from "@/data/supabase";
import { daysUntil, displayImei, formatExpiry } from "@/lib/format";
import { myImeisAtom } from "@/state/atoms";
import type { IMEI } from "@/types";

interface Props {
  imei: IMEI;
}

const expiryLabel = (imei: IMEI) => {
  if (imei.status === "pending_activation") return "Chưa kích hoạt";
  if (imei.status === "activated") {
    const d = daysUntil(imei.expiry_date);
    if (d > 30) return `Còn ${d} ngày`;
    if (d > 0) return `Sắp hết hạn · ${d} ngày`;
    return "Hết hạn hôm nay";
  }
  if (imei.status === "locked") {
    const d = -daysUntil(imei.expiry_date);
    return `Hết hạn ${d} ngày trước`;
  }
  return undefined;
};

export default function ImeiCard({ imei }: Props) {
  const navigate = useNavigate();
  const [myImeis, setMyImeis] = useAtom(myImeisAtom);
  const [editingNote, setEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(imei.customer_note ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const label = expiryLabel(imei);

  const showExpiry =
    imei.expiry_date && (imei.status === "activated" || imei.status === "locked");

  const saveNote = async () => {
    if (savingNote) return;
    const previous = imei.customer_note;
    const next = draftNote.trim() || undefined;
    setSavingNote(true);
    setNoteError(null);
    setMyImeis(myImeis.map((item) => item.id === imei.id ? { ...item, customer_note: next } : item));
    try {
      await updateCustomerNote(imei.id, next ?? null);
      setEditingNote(false);
    } catch {
      setMyImeis(myImeis.map((item) => item.id === imei.id ? { ...item, customer_note: previous } : item));
      setNoteError("Không thể lưu ghi chú. Vui lòng thử lại.");
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="w-full rounded-md border border-hairline p-base">
      <button
        type="button"
        onClick={() => navigate(`/my-imei/${imei.id}`)}
        className="w-full text-left flex items-center gap-md active:bg-surface-soft transition-colors"
      >
        <div className="w-11 h-11 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <Simcard1 size={22} variant="Bold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] leading-[1.25] font-semibold text-ink font-mono truncate">
            {displayImei(imei.imei_number)}
          </div>
          <div className="mt-xxs flex items-center gap-xs flex-wrap text-[12px] leading-[1.18] text-muted">
            <StatusBadge status={imei.status} label={label} />
            {imei.product_name && (
              <span className="truncate max-w-[180px]">{imei.product_name}</span>
            )}
            {showExpiry && (
              <>
                <span aria-hidden>·</span>
                <span>HSD {formatExpiry(imei.expiry_date)}</span>
              </>
            )}
          </div>
        </div>
        <ArrowRight2 size={18} variant="Linear" className="text-muted shrink-0" />
      </button>

      {editingNote ? (
        <div className="mt-sm border-t border-hairline-soft pt-sm">
          <textarea
            autoFocus
            value={draftNote}
            onChange={(event) => setDraftNote(event.target.value)}
            maxLength={500}
            rows={2}
            aria-label={`Ghi chú cho IMEI ${imei.imei_number}`}
            placeholder="Nhập ghi chú của bạn..."
            className="w-full resize-none rounded-md border border-hairline bg-canvas p-sm text-[13px] text-ink outline-none focus:border-brand"
          />
          {noteError && <p className="mt-xs text-[12px] text-danger">{noteError}</p>}
          <div className="mt-xs flex justify-end gap-xs">
            <button
              type="button"
              aria-label="Hủy sửa ghi chú"
              onClick={() => {
                setDraftNote(imei.customer_note ?? "");
                setNoteError(null);
                setEditingNote(false);
              }}
              className="min-h-10 min-w-10 rounded-full text-muted flex items-center justify-center active:bg-surface-soft"
            >
              <CloseSquare size={20} variant="Linear" />
            </button>
            <button
              type="button"
              aria-label="Lưu ghi chú"
              disabled={savingNote}
              onClick={saveNote}
              className="min-h-10 px-base rounded-full bg-brand text-white text-[13px] font-semibold flex items-center gap-xs disabled:opacity-60"
            >
              <TickSquare size={18} variant="Bold" />
              {savingNote ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-label={`${imei.customer_note ? "Sửa" : "Thêm"} ghi chú cho IMEI ${imei.imei_number}`}
          onClick={() => {
            setDraftNote(imei.customer_note ?? "");
            setNoteError(null);
            setEditingNote(true);
          }}
          className={`mt-sm min-h-10 w-full border-t border-hairline-soft pt-sm flex items-center gap-xxs text-left text-[12px] leading-[1.3] ${imei.customer_note ? "text-ink" : "text-brand"}`}
        >
          <Edit2 size={13} variant="Linear" className="shrink-0" />
          <span className="truncate">
            {imei.customer_note || "Vui lòng thêm ghi chú"}
          </span>
        </button>
      )}
    </div>
  );
}
