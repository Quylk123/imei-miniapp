import { Heart, Star1 } from "iconsax-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatRating, formatVND } from "@/lib/format";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

/**
 * Property-card style: photo-first 1:1, rounded.md, "Guest favorite"
 * floating badge top-left, heart top-right.
 */
export default function ProductCard({ product }: Props) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  return (
    <button
      onClick={() => navigate(`/products/${product.id}`)}
      className="group block w-full text-left"
      aria-label={product.name}
    >
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-surface-strong">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {(product.rating ?? 0) >= 4.8 && (
          <span className="absolute top-md left-md bg-canvas text-ink rounded-full px-[10px] py-[4px] text-[11px] leading-[1.18] font-semibold shadow-card">
            Khách yêu thích
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSaved((s) => !s);
          }}
          aria-label={saved ? "Bỏ yêu thích" : "Yêu thích"}
          className="absolute top-md right-md w-8 h-8 rounded-full flex items-center justify-center text-white"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))" }}
        >
          <Heart
            size={22}
            variant={saved ? "Bold" : "Linear"}
            color={saved ? "#ff385c" : "white"}
            style={{ filter: saved ? undefined : "drop-shadow(0 0 1px rgba(0,0,0,0.3))" }}
          />
        </button>
      </div>

      <div className="pt-sm">
        <div className="flex items-start justify-between gap-sm">
          <div className="text-[16px] leading-[1.25] font-semibold text-ink line-clamp-1">
            {product.name}
          </div>
          {typeof product.rating === "number" && (
            <div className="shrink-0 flex items-center gap-[2px] text-[14px] leading-[1.25] text-ink">
              <Star1 size={12} variant="Bold" />
              <span>{formatRating(product.rating)}</span>
            </div>
          )}
        </div>
        <div className="text-[14px] leading-[1.43] text-muted line-clamp-1 mt-[2px]">
          {product.description}
        </div>
        <div className="mt-xs text-[14px] leading-[1.43] text-ink">
          <span className="font-semibold">{formatVND(product.price)}</span>
        </div>
      </div>
    </button>
  );
}
