import { useMemo, useState } from "react";

import BannerCarousel from "@/components/home/banner-carousel";
import CategoryStrip from "@/components/home/category-strip";
import SearchPill from "@/components/home/search-pill";
import ProductCard from "@/components/product/product-card";
import Page from "@/components/ui/page";
import { banners, categories, products } from "@/mocks";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);

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
  }, [query, categoryId]);

  return (
    <Page>
      <header className="pb-base">
        <h1 className="text-[28px] leading-[1.18] font-bold text-ink">An tâm cùng IMEI</h1>
        <p className="text-[14px] leading-[1.43] text-muted mt-xxs">
          Thiết bị định vị · Camera hành trình · Gói cước
        </p>
      </header>

      <SearchPill value={query} onChange={setQuery} />

      <section className="mt-lg">
        <BannerCarousel banners={banners} />
      </section>

      <section className="mt-base">
        <CategoryStrip categories={categories} activeId={categoryId} onChange={setCategoryId} />
      </section>

      <section className="mt-md">
        {filtered.length === 0 ? (
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
    </Page>
  );
}
