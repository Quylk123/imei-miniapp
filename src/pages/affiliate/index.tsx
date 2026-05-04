import {
  ArrowRight2,
  Copy,
  MoneyRecive,
  People,
  TickCircle,
  Timer1,
  UserOctagon,
} from "iconsax-react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";

import Page from "@/components/ui/page";
import { fetchAffiliateData, fetchCommissions } from "@/data/supabase";
import { formatRelative, formatVND } from "@/lib/format";
import { customerAtom } from "@/state/atoms";
import type { AffiliateCommission, AffiliateStats, Referral } from "@/types";

type CommissionFilter = "all" | "pending" | "approved";

const COMMISSION_STATUS_META: Record<
  AffiliateCommission["status"],
  { label: string; textColor: string; bgColor: string }
> = {
  pending: { label: "Đang chờ", textColor: "#b45309", bgColor: "rgba(245,166,35,0.15)" },
  approved: { label: "Đã duyệt", textColor: "#0d7a4a", bgColor: "rgba(62,207,142,0.18)" },
  cancelled: { label: "Đã hủy", textColor: "#8e2020", bgColor: "rgba(229,72,77,0.15)" },
};

export default function AffiliatePage() {
  const customer = useAtomValue(customerAtom);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [referees, setReferees] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [filter, setFilter] = useState<CommissionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const [affData, comms] = await Promise.all([
        fetchAffiliateData(customer.id),
        fetchCommissions(customer.id),
      ]);
      setStats(affData.stats);
      setReferees(affData.referees);
      setCommissions(comms);
    } catch (err) {
      console.error("[affiliate] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCommissions = commissions.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const copyReferralLink = async () => {
    if (!customer) return;
    const code = customer.referral_code || customer.id;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not work in Zalo WebView
    }
  };

  if (!customer) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">
          Vui lòng đăng ký để sử dụng tính năng giới thiệu.
        </div>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">Đang tải...</div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="space-y-lg pb-base">
        {/* ── Hero stats card ── */}
        <section className="rounded-xl bg-gradient-to-br from-brand via-brand-active to-[#1d4ed8] p-base text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-center gap-sm mb-md">
              <MoneyRecive size={22} variant="Bold" color="#fff" />
              <h2 className="text-[18px] leading-[1.25] font-semibold">
                Hoa hồng của bạn
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-md">
              <div>
                <div className="text-[24px] leading-[1.18] font-bold">
                  {formatVND(stats?.total_approved ?? 0)}
                </div>
                <div className="text-[12px] leading-[1.18] text-white/70 mt-xxs">
                  Đã duyệt
                </div>
              </div>
              <div>
                <div className="text-[20px] leading-[1.18] font-bold text-white/90">
                  {formatVND(stats?.total_pending ?? 0)}
                </div>
                <div className="text-[12px] leading-[1.18] text-white/70 mt-xxs">
                  Đang chờ
                </div>
              </div>
              <div>
                <div className="text-[20px] leading-[1.18] font-bold text-white/90">
                  {stats?.total_referees ?? 0}
                </div>
                <div className="text-[12px] leading-[1.18] text-white/70 mt-xxs">
                  Đã giới thiệu
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Copy referral link ── */}
        <section>
          <button
            onClick={copyReferralLink}
            className="w-full flex items-center gap-md rounded-md border border-hairline p-base active:bg-surface-soft transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <Copy size={20} variant="Linear" />
            </span>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[16px] leading-[1.25] font-medium text-ink">
                {copied ? "Đã sao chép!" : "Sao chép mã giới thiệu"}
              </div>
              <div className="text-[13px] leading-[1.23] text-muted mt-xxs truncate">
                Mã của bạn: <span className="font-semibold text-brand">{customer.referral_code || "..."}</span>
              </div>
            </div>
            <ArrowRight2 size={18} variant="Linear" className="text-muted shrink-0" />
          </button>
        </section>

        {/* ── Người giới thiệu bạn ── */}
        {stats?.referrer && (
          <section>
            <h2 className="text-[12px] leading-[1.18] uppercase tracking-[0.32px] font-bold text-muted mb-sm px-xs">
              Người giới thiệu bạn
            </h2>
            <div className="rounded-md border border-hairline p-base flex items-center gap-md">
              {stats.referrer.avatar_url ? (
                <img
                  src={stats.referrer.avatar_url}
                  alt={stats.referrer.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[16px] font-bold shrink-0">
                  {stats.referrer.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[16px] leading-[1.25] font-medium text-ink truncate">
                  {stats.referrer.name}
                </div>
                <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                  Đã giới thiệu bạn vào ứng dụng
                </div>
              </div>
              <UserOctagon size={20} variant="Bold" className="text-brand shrink-0" />
            </div>
          </section>
        )}

        {/* ── Danh sách người được giới thiệu ── */}
        <section>
          <div className="flex items-center justify-between mb-sm px-xs">
            <h2 className="text-[12px] leading-[1.18] uppercase tracking-[0.32px] font-bold text-muted">
              Bạn bè đã giới thiệu ({referees.length})
            </h2>
            <People size={16} variant="Linear" className="text-muted" />
          </div>

          {referees.length === 0 ? (
            <div className="rounded-md border border-hairline p-base text-center">
              <People size={32} variant="Linear" className="text-muted mx-auto mb-sm" />
              <div className="text-[14px] leading-[1.43] text-muted">
                Bạn chưa giới thiệu ai. Hãy chia sẻ sản phẩm để bắt đầu!
              </div>
            </div>
          ) : (
            <ul className="rounded-md border border-hairline overflow-hidden">
              {referees.map((ref, i) => (
                <li
                  key={ref.id}
                  className={`flex items-center gap-md px-base py-md ${
                    i !== referees.length - 1 ? "border-b border-hairline-soft" : ""
                  }`}
                >
                  {ref.referee_avatar ? (
                    <img
                      src={ref.referee_avatar}
                      alt={ref.referee_name ?? ""}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center text-ink text-[16px] font-bold shrink-0">
                      {(ref.referee_name ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] leading-[1.25] font-medium text-ink truncate">
                      {ref.referee_name ?? "Khách hàng"}
                    </div>
                    <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                      Tham gia {formatRelative(ref.created_at)}
                    </div>
                  </div>
                  {ref.has_ordered ? (
                    <span className="inline-flex items-center gap-xxs px-sm py-xxs rounded-full text-[11px] font-semibold bg-[#e8f5e9] text-[#2e7d32]">
                      <TickCircle size={12} variant="Bold" />
                      Đã mua
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-xxs px-sm py-xxs rounded-full text-[11px] font-semibold bg-surface-strong text-muted">
                      <Timer1 size={12} variant="Linear" />
                      Chưa mua
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Lịch sử hoa hồng ── */}
        <section>
          <h2 className="text-[12px] leading-[1.18] uppercase tracking-[0.32px] font-bold text-muted mb-sm px-xs">
            Lịch sử hoa hồng
          </h2>

          {/* Filter tabs */}
          <div className="flex gap-sm mb-md">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "pending", label: "Đang chờ" },
                { key: "approved", label: "Đã duyệt" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-md py-xs rounded-full text-[13px] font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-brand text-white"
                    : "bg-surface-strong text-muted active:bg-surface-soft"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredCommissions.length === 0 ? (
            <div className="rounded-md border border-hairline p-base text-center">
              <MoneyRecive size={32} variant="Linear" className="text-muted mx-auto mb-sm" />
              <div className="text-[14px] leading-[1.43] text-muted">
                {filter === "all"
                  ? "Chưa có hoa hồng nào."
                  : `Không có hoa hồng "${filter === "pending" ? "đang chờ" : "đã duyệt"}".`}
              </div>
            </div>
          ) : (
            <ul className="space-y-sm">
              {filteredCommissions.map((comm) => {
                const meta = COMMISSION_STATUS_META[comm.status];
                return (
                  <li
                    key={comm.id}
                    className="rounded-md border border-hairline p-base"
                  >
                    <div className="flex items-start gap-md">
                      {comm.product_thumbnail ? (
                        <img
                          src={comm.product_thumbnail}
                          alt={comm.product_name}
                          className="w-12 h-12 rounded-sm object-cover bg-surface-strong shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-sm bg-surface-strong shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] leading-[1.25] font-medium text-ink line-clamp-1">
                          {comm.product_name}
                        </div>
                        <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                          Người mua: {comm.referee_name}
                        </div>
                        <div className="text-[12px] leading-[1.18] text-muted mt-xxs">
                          Đơn #{comm.order_id} · {comm.commission_rate}% trên {formatVND(comm.item_subtotal)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[16px] leading-[1.25] font-bold text-ink">
                          +{formatVND(comm.total_commission)}
                        </div>
                        <span
                          className="inline-block mt-xs px-sm py-xxs rounded-full text-[11px] font-semibold"
                          style={{
                            color: meta.textColor,
                            backgroundColor: meta.bgColor,
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Đổi thưởng info ── */}
        <section className="rounded-md border border-dashed border-brand/30 bg-brand/5 p-base">
          <div className="text-[14px] leading-[1.43] text-ink font-medium">
            🎁 Đổi thưởng hoa hồng
          </div>
          <div className="text-[13px] leading-[1.38] text-muted mt-xs">
            Để đổi thưởng hoa hồng, vui lòng liên hệ qua Zalo OA. Chúng tôi sẽ hỗ trợ bạn
            trong thời gian sớm nhất.
          </div>
        </section>
      </div>
    </Page>
  );
}
