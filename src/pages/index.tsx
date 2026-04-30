import { Headphone, Receipt2, Scan, User, type Icon } from "iconsax-react";
import { useAtomValue } from "jotai";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import BannerCarousel from "@/components/home/banner-carousel";
import CategoryStrip from "@/components/home/category-strip";
import SearchPill from "@/components/home/search-pill";
import ImeiCard from "@/components/imei/imei-card";
import PageHero from "@/components/layout/page-hero";
import ProductCard from "@/components/product/product-card";
import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import {
  bannersAtom,
  catalogLoadingAtom,
  categoriesAtom,
  customerAtom,
  featuredProductsAtom,
  myImeisAtom,
  productsAtom,
} from "@/state/atoms";

interface QuickAction {
  icon: Icon;
  label: string;
  onClick: () => void;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const customer = useAtomValue(customerAtom);
  const imeis = useAtomValue(myImeisAtom);
  const categories = useAtomValue(categoriesAtom);
  const products = useAtomValue(productsAtom);
  const featured = useAtomValue(featuredProductsAtom);
  const banners = useAtomValue(bannersAtom);
  const loading = useAtomValue(catalogLoadingAtom);

  // Ref để "Xem tất cả" cuộn xuống vùng catalog (CategoryStrip + grid).
  const catalogRef = useRef<HTMLDivElement>(null);

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

  // Khi user đang search hoặc lọc category, ẩn các block "soft" (quick
  // actions, featured) để focus vào kết quả — tránh nhiễu.
  const isSearching = query.trim() !== "";

  const greeting = customer
    ? `Xin chào, ${customer.name.split(" ").slice(-1)[0]}`
    : "Khám phá thiết bị";

  const quickActions: QuickAction[] = [
    { icon: Scan, label: "Quét QR", onClick: () => navigate("/scan") },
    { icon: Receipt2, label: "Đơn hàng", onClick: () => navigate("/orders") },
    { icon: Headphone, label: "Hỗ trợ", onClick: () => navigate("/account") },
  ];

  const showAllFeatured = () => {
    setCategoryId(null);
    setQuery("");
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Page
      hero={
        <PageHero title={greeting} subtitle="Mua thiết bị, kích hoạt gói cước" />
      }
    >
      <div className="space-y-lg">
        {/* Search pill — render trong body (không trong PageHero) để dùng
            full width (chỉ px-base 16px), không bị thu hẹp bởi 96px reserve
            cho nút native Zalo trong hero. */}
        <SearchPill value={query} onChange={setQuery} />

        {/* Quick actions: 3 ô vuông tile, Rausch chỉ ở icon (không full bg).
            Theo DESIGN.md "Rausch chỉ dùng cho primary CTA" — cách này
            on-brand hơn banner đỏ full-width cũ. */}
        {!isSearching && (
          <section>
            <div className="grid grid-cols-3 gap-sm">
              {quickActions.map((a) => {
                const ActionIcon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={a.onClick}
                    className="flex flex-col items-center gap-xs py-md rounded-md border border-hairline bg-canvas active:bg-surface-soft transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-rausch/10 text-rausch flex items-center justify-center">
                      <ActionIcon size={20} variant="Linear" />
                    </span>
                    <span className="text-[13px] leading-[1.23] font-medium text-ink">
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {banners.length > 0 && (
          <section>
            <BannerCarousel banners={banners} />
          </section>
        )}

        {/* IMEI quick access — chỉ hiện khi đã đăng ký + có IMEI */}
        {customer && imeis.length > 0 && (
          <section>
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

        {/* Sản phẩm nổi bật — admin curate qua flag is_featured. Ẩn khi
            user đang search vì search results sẽ chiếm full attention. */}
        {!isSearching && featured.length > 0 && (
          <section>
            <div className="flex items-end justify-between mb-md">
              <h2 className="text-[20px] leading-[1.2] font-semibold text-ink tracking-[-0.18px]">
                Sản phẩm nổi bật
              </h2>
              <button
                onClick={showAllFeatured}
                className="text-[14px] leading-[1.43] text-ink underline"
              >
                Xem tất cả
              </button>
            </div>
            <div className="grid grid-cols-2 gap-base">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Khám phá danh mục — section header cho CategoryStrip + grid lọc. */}
        <section ref={catalogRef}>
          <h2 className="text-[20px] leading-[1.2] font-semibold text-ink tracking-[-0.18px] mb-md">
            Khám phá danh mục
          </h2>
          <CategoryStrip
            categories={categories}
            activeId={categoryId}
            onChange={setCategoryId}
          />
          <div className="mt-md">
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
          </div>
        </section>

        {/* CTA đăng ký nếu chưa */}
        {!customer && (
          <section className="rounded-md border border-hairline p-base">
            <div className="flex items-center gap-md">
              <span className="w-10 h-10 rounded-full bg-surface-strong flex items-center justify-center text-ink shrink-0">
                <User size={20} variant="Linear" />
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
      </div>
    </Page>
  );
}
