import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";

import EmptyState from "@/components/common/empty-state";
import ImeiCard from "@/components/imei/imei-card";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import { myImeisAtom } from "@/state/atoms";

export default function MyImeiPage() {
  const navigate = useNavigate();
  const imeis = useAtomValue(myImeisAtom);

  return (
    <Page>
      <header className="flex items-start justify-between gap-md">
        <div>
          <h1 className="text-[28px] leading-[1.18] font-bold text-ink">
            IMEI của tôi
          </h1>
          <p className="text-[14px] leading-[1.43] text-muted mt-xxs">
            Quản lý thiết bị và gói cước của bạn.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/scan")}
          leftIcon={<Icon name="scan" size={16} />}
          className="shrink-0"
        >
          Quét QR
        </Button>
      </header>

      <div className="mt-lg">
        {imeis.length === 0 ? (
          <EmptyState
            icon={<Icon name="qr" size={48} />}
            title="Chưa có thiết bị nào"
            description="Quét QR trên thiết bị để liên kết và kích hoạt gói cước."
            action={
              <Button
                onClick={() => navigate("/scan")}
                leftIcon={<Icon name="scan" size={18} />}
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
