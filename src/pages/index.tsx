import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import BannerCarousel from "@/components/home/banner-carousel";
import CategoryStrip from "@/components/home/category-strip";
import SearchPill from "@/components/home/search-pill";
import ImeiCard from "@/components/imei/imei-card";
import ProductCard from "@/components/product/product-card";
import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import { catalogLoadingAtom, categoriesAtom, customerAtom, myImeisAtom, productsAtom } from "@/state/atoms";

const banners = [
  {
    id: "b1",
    title: "An tâm cho người thân",
    subtitle: "Thiết bị định vị thế hệ mới — bảo hành 24 tháng",
    image: "https://images.unsplash.com/photo-1610552050890-fe99536c2615?w=1600",
  },
  {
    id: "b2",
    title: "Ưu đãi gói 12 tháng",
    subtitle: "Tiết kiệm 25% — chỉ từ 600.000đ",
    image: "https://images.unsplash.com/photo-1611174243606-92e9b8d52a4f?w=1600",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const customer = useAtomValue(customerAtom);
  const imeis = useAtomValue(myImeisAtom);
  const categories = useAtomValue(categoriesAtom);
  const products = useAtomValue(productsAtom);
  const loading = useAtomValue(catalogLoadingAtom);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryId && p.category !== categoryId) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [query, categoryId, products]);

  return (
    <Page>
      <SearchPill value={query} onChange={setQuery} />

      <section className="mt-lg">
        <BannerCarousel banners={banners} />
      </section>

      {/* IMEI quick access — chỉ hiện khi đã đăng ký + có IMEI */}
      {customer && imeis.length > 0 && (
        <section className="mt-lg">
          <div className="flex items-center justify-between mb-sm">
            <h2 className="text-[16px] leading-[1.25] font-semibold text-ink">
              IMEI của tôi
            </h2>
            <button
              onClick={() => navigate("/my-imei")}
              className="text-[14px] leading-[1.43] text-ink underline"
            >
              Xem tất cả
            </button>
          </div>
          <div className="space-y-md">
            {imeis.slice(0, 2).map((imei) => (
              <ImeiCard key={imei.id} imei={imei} />
            ))}
          </div>
        </section>
      )}

      {/* Quét QR CTA — luôn hiển thị, nhỏ gọn */}
      <section className="mt-lg">
        <button
          onClick={() => navigate("/scan")}
          className="w-full flex items-center gap-md p-base rounded-md bg-rausch text-white active:bg-rausch-active transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <Icon name="scan" size={20} />
          </span>
          <span className="flex-1 text-left">
            <span className="block text-[16px] leading-[1.25] font-semibold">
              Quét QR liên kết IMEI
            </span>
            <span className="block text-[13px] leading-[1.23] opacity-90 mt-xxs">
              Đã có thiết bị? Quét để kích hoạt gói cước.
            </span>
          </span>
          <Icon name="chevron-right" size={20} />
        </button>
      </section>

      {/* Catalog */}
      <section className="mt-lg">
        <CategoryStrip categories={categories} activeId={categoryId} onChange={setCategoryId} />
      </section>

      <section className="mt-md">
        {loading ? (
          <div className="py-xxl text-center text-muted">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="py-xxl text-center">
            <div className="text-[16px] leading-[1.25] font-semibold text-ink">
              Không có sản phẩm phù hợp
            </div>
            <div className="text-[14px] leading-[1.43] text-muted mt-xs">
              Thử từ khoá khác hoặc đổi danh mục.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-base">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* CTA đăng ký nếu chưa */}
      {!customer && (
        <section className="mt-lg rounded-md border border-hairline p-base">
          <div className="flex items-center gap-md">
            <span className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center text-ink shrink-0">
              <Icon name="user" size={20} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[16px] leading-[1.25] font-semibold text-ink">
                Đăng ký để theo dõi đơn hàng
              </div>
              <div className="text-[13px] leading-[1.23] text-muted mt-xxs">
                Liên kết Zalo để xem IMEI và lịch sử đơn hàng
              </div>
            </div>
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
          </div>
        </section>
      )}
    </Page>
  );
}
