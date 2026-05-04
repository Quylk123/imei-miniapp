import { Bag2, Heart, Star1 } from "iconsax-react";
import { useSetAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Page from "@/components/ui/page";
import { fetchProductById } from "@/data/supabase";
import { usePageHeader } from "@/hooks/use-page-header";
import { formatRating, formatVND } from "@/lib/format";
import { addToCartAtom } from "@/state/atoms";
import type { Product } from "@/types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const addToCart = useSetAtom(addToCartAtom);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchProductById(id)
      .then(setProduct)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Heart button đẩy lên header (variant transparent) qua override
  const heartButton = useMemo(
    () => (
      <button
        onClick={() => setSaved((s) => !s)}
        aria-label={saved ? "Bỏ yêu thích" : "Yêu thích"}
        className="w-10 h-10 rounded-full bg-canvas/95 backdrop-blur flex items-center justify-center shadow-card active:bg-surface-strong"
      >
        <Heart
          size={22}
          variant={saved ? "Bold" : "Linear"}
          color={saved ? "#ff385c" : "#222"}
        />
      </button>
    ),
    [saved]
  );
  usePageHeader({ right: heartButton });

  if (loading) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">Đang tải...</div>
      </Page>
    );
  }

  if (!product) {
    return (
      <Page>
        <div className="py-xxl text-center text-muted">Không tìm thấy sản phẩm.</div>
      </Page>
    );
  }

  const outOfStock = product.stock_quantity <= 0;

  const onAddToCart = () => {
    if (outOfStock) return;
    addToCart({
      product_id: product.id,
      name: product.name,
      thumbnail: product.image_url,
      unit_price: product.price,
      stock_quantity: product.stock_quantity,
    });
    navigate("/cart");
  };

  const gallery = product.gallery?.length ? product.gallery : [product.image_url];

  // Gallery đi qua slot `hero` của Page để render full-bleed (ngoài wrapper
  // pt-base mặc định), ăn lên tận status bar — AppHeader transparent overlay.
  const heroGallery = (
    <div className="relative">
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
        {gallery.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${product.name} ${i + 1}`}
            className="snap-start shrink-0 w-full aspect-square object-cover bg-surface-strong"
          />
        ))}
      </div>
      {outOfStock && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <span className="bg-white/90 text-[#c0392b] font-bold text-[18px] px-lg py-sm rounded-full shadow-lg tracking-wide">
            HẾT HÀNG
          </span>
        </div>
      )}
    </div>
  );

  return (
    <Page noPadding noBottomNavSpace hero={heroGallery} className="!pb-0">
      {/* Body */}
      <div className="px-base pb-[calc(96px+env(safe-area-inset-bottom))]">
        <h1 className="text-[22px] leading-[1.18] font-medium tracking-[-0.44px] text-ink">
          {product.name}
        </h1>

        <div className="mt-xs flex items-center gap-sm flex-wrap">
          {typeof product.rating === "number" && (
            <div className="flex items-center gap-xs text-[14px] leading-[1.43] text-ink">
              <Star1 size={14} variant="Bold" />
              <span className="font-semibold">{formatRating(product.rating)}</span>
              <span className="text-muted">· {product.reviews_count ?? 0} đánh giá</span>
            </div>
          )}
          {/* Stock badge */}
          {outOfStock ? (
            <span className="inline-flex items-center gap-xxs px-sm py-xxs rounded-full text-[12px] font-semibold bg-[#fde8e8] text-[#c0392b]">
              <span className="w-[6px] h-[6px] rounded-full bg-[#c0392b]" />
              Hết hàng
            </span>
          ) : (
            <span className="inline-flex items-center gap-xxs px-sm py-xxs rounded-full text-[12px] font-semibold bg-[#e8f5e9] text-[#2e7d32]">
              <span className="w-[6px] h-[6px] rounded-full bg-[#2e7d32]" />
              Còn {product.stock_quantity} sản phẩm
            </span>
          )}
        </div>

        <div className="mt-md text-[28px] leading-[1.18] font-bold text-ink">
          {formatVND(product.price)}
        </div>

        <div className="mt-base h-px bg-hairline" />

        <section className="mt-base">
          <h2 className="text-[21px] leading-[1.25] font-bold text-ink">Mô tả</h2>
          <p className="mt-xs text-[16px] leading-[1.5] text-body">{product.description}</p>
        </section>

      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-canvas border-t border-hairline px-base pt-md pb-[calc(12px+env(safe-area-inset-bottom))] z-30">
        <div className="flex items-center gap-md">
          <div className="flex-1">
            <div className="text-[12px] leading-[1.18] text-muted">Giá</div>
            <div className="text-[18px] leading-[1.25] font-bold text-ink">
              {formatVND(product.price)}
            </div>
          </div>
          {outOfStock ? (
            <div className="flex-[2] text-center py-sm rounded-md bg-[#f5f5f5] text-muted font-semibold text-[15px]">
              Hết hàng
            </div>
          ) : (
            <>
              <Button variant="secondary" size="md" onClick={onAddToCart} className="!px-md">
                <Bag2 size={18} variant="Linear" />
              </Button>
              <Button onClick={onAddToCart} className="flex-[1.4]">
                Thêm vào giỏ
              </Button>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
