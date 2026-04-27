import { useSetAtom } from "jotai";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import Page from "@/components/ui/page";
import TopBar from "@/components/ui/top-bar";
import { formatRating, formatVND } from "@/lib/format";
import { products } from "@/mocks";
import { addToCartAtom } from "@/state/atoms";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = products.find((p) => p.id === id);
  const [saved, setSaved] = useState(false);
  const addToCart = useSetAtom(addToCartAtom);

  if (!product) {
    return (
      <Page>
        <TopBar title="Sản phẩm" />
        <div className="py-xxl text-center text-muted">Không tìm thấy sản phẩm.</div>
      </Page>
    );
  }

  const onAddToCart = () => {
    addToCart({
      product_id: product.id,
      name: product.name,
      thumbnail: product.image_url,
      unit_price: product.price,
    });
    navigate("/cart");
  };

  const gallery = product.gallery?.length ? product.gallery : [product.image_url];

  return (
    <Page noPadding className="!pt-0 !pb-0">
      {/* Hero */}
      <div className="relative">
        <TopBar
          transparent
          right={
            <button
              onClick={() => setSaved((s) => !s)}
              aria-label={saved ? "Bỏ yêu thích" : "Yêu thích"}
              className="w-9 h-9 rounded-full bg-canvas/90 backdrop-blur flex items-center justify-center shadow-card"
            >
              <Icon
                name="heart"
                size={20}
                style={{
                  fill: saved ? "#ff385c" : "transparent",
                  stroke: saved ? "#ff385c" : "#222",
                }}
              />
            </button>
          }
        />
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
      </div>

      {/* Body */}
      <div className="px-base pt-base pb-[calc(96px+env(safe-area-inset-bottom))]">
        <h1 className="text-[22px] leading-[1.18] font-medium tracking-[-0.44px] text-ink">
          {product.name}
        </h1>

        {typeof product.rating === "number" && (
          <div className="mt-xs flex items-center gap-xs text-[14px] leading-[1.43] text-ink">
            <Icon name="star" size={14} />
            <span className="font-semibold">{formatRating(product.rating)}</span>
            <span className="text-muted">· {product.reviews_count ?? 0} đánh giá</span>
          </div>
        )}

        <div className="mt-md text-[28px] leading-[1.18] font-bold text-ink">
          {formatVND(product.price)}
        </div>

        <div className="mt-base h-px bg-hairline" />

        <section className="mt-base">
          <h2 className="text-[21px] leading-[1.25] font-bold text-ink">Mô tả</h2>
          <p className="mt-xs text-[16px] leading-[1.5] text-body">{product.description}</p>
        </section>

        {Object.keys(product.specs).length > 0 && (
          <section className="mt-lg">
            <h2 className="text-[21px] leading-[1.25] font-bold text-ink">Thông số</h2>
            <ul className="mt-xs">
              {Object.entries(product.specs).map(([k, v], idx, arr) => (
                <li
                  key={k}
                  className={`flex items-center justify-between py-md text-[16px] leading-[1.5] ${idx !== arr.length - 1 ? "border-b border-hairline-soft" : ""}`}
                >
                  <span className="text-muted">{k}</span>
                  <span className="text-ink font-medium text-right">{v}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-lg p-base rounded-md bg-surface-soft">
          <div className="text-[16px] leading-[1.25] font-semibold text-ink">
            Bao gồm gói cước riêng
          </div>
          <p className="text-[14px] leading-[1.43] text-muted mt-xxs">
            Sau khi nhận sản phẩm, quét mã QR trên thiết bị để kích hoạt gói cước trong tab "IMEI của tôi".
          </p>
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
          <Button variant="secondary" size="md" onClick={onAddToCart} className="!px-md">
            <Icon name="bag" size={18} />
          </Button>
          <Button onClick={onAddToCart} className="flex-[1.4]">
            Thêm vào giỏ
          </Button>
        </div>
      </div>
    </Page>
  );
}
