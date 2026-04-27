import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";

export default function ScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);

  // UI-only: tự "scan" thành công sau 2.5s rồi điều hướng tới IMEI mock pending
  useEffect(() => {
    if (!scanning) return;
    const t = setTimeout(() => {
      setScanning(false);
      navigate("/my-imei/im3", { replace: true });
    }, 2500);
    return () => clearTimeout(t);
  }, [scanning, navigate]);

  return (
    <div className="fixed inset-0 bg-black text-white z-50 flex flex-col">
      <header className="flex items-center justify-between px-base pt-base pb-md">
        <button
          onClick={() => navigate(-1)}
          aria-label="Đóng"
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <Icon name="close" size={20} />
        </button>
        <div className="text-[16px] leading-[1.25] font-semibold">Quét QR thiết bị</div>
        <div className="w-9 h-9" />
      </header>

      <div className="flex-1 flex items-center justify-center px-lg">
        <div className="relative w-full max-w-[320px] aspect-square">
          {/* Viewfinder corners */}
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
          {scanning && (
            <div className="absolute left-0 right-0 h-[2px] bg-rausch shadow-[0_0_12px_#ff385c] animate-scan" />
          )}
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <Icon name="qr" size={64} />
          </div>
        </div>
      </div>

      <div className="px-base pb-xxl text-center">
        <div className="text-[18px] leading-[1.25] font-semibold">
          {scanning ? "Đang quét..." : "Đã quét xong"}
        </div>
        <p className="text-[14px] leading-[1.43] text-white/70 mt-xs max-w-[280px] mx-auto">
          Đưa mã QR trên thiết bị vào khung hình để liên kết với tài khoản của bạn.
        </p>
        <Button
          variant="ghost"
          fullWidth
          className="!text-white !mt-lg active:!bg-white/10"
          onClick={() => navigate(-1)}
        >
          Hủy
        </Button>
      </div>

      <style>{`
        @keyframes scanline { 0% { top: 0%; } 50% { top: 95%; } 100% { top: 0%; } }
        .animate-scan { animation: scanline 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const map: Record<typeof pos, string> = {
    tl: "top-0 left-0 border-l-2 border-t-2 rounded-tl-md",
    tr: "top-0 right-0 border-r-2 border-t-2 rounded-tr-md",
    bl: "bottom-0 left-0 border-l-2 border-b-2 rounded-bl-md",
    br: "bottom-0 right-0 border-r-2 border-b-2 rounded-br-md",
  };
  return <span className={`absolute w-8 h-8 border-rausch ${map[pos]}`} />;
}
