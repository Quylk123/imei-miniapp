import { ArrowRight2, Scan, Simcard1 } from "iconsax-react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthPage from "@/pages/auth";
import EmptyState from "@/components/common/empty-state";
import ImeiCard from "@/components/imei/imei-card";
import PageHero from "@/components/layout/page-hero";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { displayImei } from "@/lib/format";
import { authInitializedAtom, authLoadingAtom, authBootstrapErrorAtom, customerDataLoadingAtom, myImeisErrorAtom, customerAtom, myImeisAtom, refreshCustomerDataAtom } from "@/state/atoms";
import type { IMEI, IMEIStatus } from "@/types";

// Thứ tự nhóm trạng thái: chưa kích hoạt → hết hạn → còn hạn → hủy.
const STATUS_RANK: Record<IMEIStatus, number> = {
  new: 0,
  sold: 0,
  pending_activation: 0,
  locked: 1,
  activated: 2,
  recalled: 3,
};

const expiryTime = (imei: IMEI) =>
  imei.expiry_date ? new Date(imei.expiry_date).getTime() : 0;
const createdTime = (imei: IMEI) =>
  imei.created_at ? new Date(imei.created_at).getTime() : 0;

const compareImeis = (a: IMEI, b: IMEI) => {
  const ra = STATUS_RANK[a.status] ?? 99;
  const rb = STATUS_RANK[b.status] ?? 99;
  if (ra !== rb) return ra - rb;
  // Tiebreaker trong cùng nhóm
  if (ra === 2) return expiryTime(a) - expiryTime(b); // còn hạn: sắp hết trước
  if (ra === 1) return expiryTime(b) - expiryTime(a); // hết hạn: mới hết trước
  return createdTime(b) - createdTime(a);             // còn lại: mới tạo trước
};

export default function MyImeiPage() {
  const navigate = useNavigate();

  const customer = useAtomValue(customerAtom);
  const authInitialized = useAtomValue(authInitializedAtom);
  const authLoading = useAtomValue(authLoadingAtom);
  const imeis = useAtomValue(myImeisAtom);
  const refresh = useSetAtom(refreshCustomerDataAtom);
  const bootstrapError = useAtomValue(authBootstrapErrorAtom);
  const dataLoading = useAtomValue(customerDataLoadingAtom);
  const dataError = useAtomValue(myImeisErrorAtom);

  const [search, setSearch] = useState("");
  const visibleImeis = useMemo(() => imeis.filter((imei) => imei.status !== "recalled"), [imeis]);
  const query = search.replace(/\s+/g, "").toUpperCase();
  const sortedImeis = useMemo(() => visibleImeis
    .filter((imei) => displayImei(imei.imei_number).toUpperCase().includes(query))
    .sort(compareImeis), [visibleImeis, query]);

  // Refresh mỗi khi user navigate vào trang này
  useEffect(() => {
    if (authInitialized && !authLoading && customer) void refresh();
  }, [authInitialized, authLoading, customer, refresh]);

  if (!authInitialized) {
    return (
      <Page hero={<PageHero title="SIM của tôi" subtitle="Đang tải thông tin" />}>
        <p role="status" className="py-lg text-center text-muted">Đang tải SIM của bạn...</p>
      </Page>
    );
  }

  if (!customer || bootstrapError) {
    return <AuthPage embedded reason="Đăng ký thành viên để xem và gia hạn SIM của bạn. Vui lòng dùng số điện thoại Zalo đã mua SIM để tìm lại SIM cũ." />;
  }

  return (
    <Page
      hero={
        <PageHero
          title="SIM của tôi"
          subtitle={dataError ? "Chưa tải được danh sách SIM" : dataLoading && visibleImeis.length === 0 ? "Đang tải thông tin" : visibleImeis.length > 0 ? `${visibleImeis.length} SIM đã liên kết` : "Chưa có SIM nào"}
        />
      }
    >
      {dataError && <div role="alert" className="my-md text-danger">
        <p>{dataError}</p>
        <Button onClick={() => void refresh()} disabled={dataLoading}>Thử tải lại</Button>
      </div>}
      {dataLoading && <p role="status" className="py-md text-muted">Đang tải SIM của bạn...</p>}
      {visibleImeis.length > 0 && (
        <button
          onClick={() => navigate("/scan")}
          className="w-full flex items-center gap-md p-base rounded-md border border-hairline active:bg-surface-soft transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
            <Scan size={20} variant="Linear" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-[16px] leading-[1.25] font-semibold text-ink">
              Quét QR liên kết SIM
            </span>
            <span className="block text-[13px] leading-[1.23] text-muted mt-xxs">
              Đặt mã QR vào khung hình
            </span>
          </span>
          <ArrowRight2 size={18} variant="Linear" className="text-muted shrink-0" />
        </button>
      )}

      <div className="mt-lg">
        {visibleImeis.length > 0 && (
          <input
            type="search"
            aria-label="Tìm SIM theo IMEI"
            placeholder="Tìm theo số IMEI trên tem"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mb-base w-full rounded-md border border-hairline bg-white p-base text-ink"
          />
        )}
        {visibleImeis.length === 0 ? (
          dataLoading || dataError ? null : (
          <EmptyState
            icon={<Simcard1 size={48} variant="Linear" />}
            title="Chưa có SIM nào"
            description="Quét QR để liên kết và kích hoạt gói cước."
            action={
              <Button
                onClick={() => navigate("/scan")}
                leftIcon={<Scan size={18} variant="Linear" />}
              >
                Quét QR liên kết
              </Button>
            }
          />
          )
        ) : sortedImeis.length === 0 ? (
          <p role="status" className="py-md text-center text-muted">Không tìm thấy SIM phù hợp.</p>
        ) : (
          <div className="space-y-md">
            {sortedImeis.map((imei) => (
              <ImeiCard key={imei.id} imei={imei} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
