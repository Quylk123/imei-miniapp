import { useEffect, useRef, useState } from "react";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

interface Props {
  banners: Banner[];
}

/**
 * Snap-scrolling banner: ảnh full-bleed bo `rounded.md`, autoplay 4s,
 * dot indicators ở dưới (giống image carousel của property card).
 */
export default function BannerCarousel({ banners }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActive(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || banners.length <= 1) return;
    const id = setInterval(() => {
      const next = (active + 1) % banners.length;
      el.scrollTo({ left: el.clientWidth * next, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(id);
  }, [active, banners.length]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-base px-base gap-md"
      >
        {banners.map((b) => (
          <div
            key={b.id}
            className="snap-start shrink-0 w-full relative rounded-md overflow-hidden aspect-[16/9] bg-surface-strong"
          >
            <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute bottom-base left-base right-base text-white">
              <div className="text-[20px] leading-[1.2] font-semibold tracking-[-0.18px]">
                {b.title}
              </div>
              <div className="text-[14px] leading-[1.43] mt-xxs opacity-90">
                {b.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>
      {banners.length > 1 && (
        <div className="flex justify-center gap-[6px] mt-sm">
          {banners.map((_, i) => (
            <span
              key={i}
              className={`h-[6px] rounded-full transition-all ${i === active ? "w-4 bg-ink" : "w-[6px] bg-hairline"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
