import { ArrowRight2, Scan, ScanBarcode } from "iconsax-react";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";

import EmptyState from "@/components/common/empty-state";
import ImeiCard from "@/components/imei/imei-card";
import PageHero from "@/components/layout/page-hero";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { myImeisAtom } from "@/state/atoms";

export default function MyImeiPage() {
  const navigate = useNavigate();
  const imeis = useAtomValue(myImeisAtom);

  return (
    <Page
      hero={
        <PageHero
          title="IMEI của tôi"
          subtitle={imeis.length > 0 ? `${imeis.length} thiết bị đã liên kết` : "Chưa có thiết bị nào"}
        />
      }
    >
      {imeis.length > 0 && (
        <button
          onClick={() => navigate("/scan")}
          className="w-full flex items-center gap-md p-base rounded-md border border-hairline active:bg-surface-soft transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-rausch/10 text-rausch flex items-center justify-center shrink-0">
            <Scan size={20} variant="Linear" />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-[16px] leading-[1.25] font-semibold text-ink">
              Quét QR liên kết thiết bị mới
            </span>
            <span className="block text-[13px] leading-[1.23] text-muted mt-xxs">
              Đặt mã QR trên thiết bị vào khung hình
            </span>
          </span>
          <ArrowRight2 size={18} variant="Linear" className="text-muted shrink-0" />
        </button>
      )}

      <div className="mt-lg">
        {imeis.length === 0 ? (
          <EmptyState
            icon={<ScanBarcode size={48} variant="Linear" />}
            title="Chưa có thiết bị nào"
            description="Quét QR trên thiết bị để liên kết và kích hoạt gói cước."
            action={
              <Button
                onClick={() => navigate("/scan")}
                leftIcon={<Scan size={18} variant="Linear" />}
              >
                Quét QR liên kết
              </Button>
            }
          />
        ) : (
          <div className="space-y-md">
            {imeis.map((imei) => (
              <ImeiCard key={imei.id} imei={imei} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
