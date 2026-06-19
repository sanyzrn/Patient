import React, { useRef, useState } from 'react';
import { BookMarked, BookOpen, Check } from 'lucide-react';
import { Catalog } from '../types';
import { PRODUCTS } from '../constants/products';

interface ProductsSectionProps {
  catalogs: Catalog[];
  onOpenCatalog: (c: Catalog) => void;
  sectionRef?: React.RefObject<HTMLElement | null>;
}

const ProductsSection: React.FC<ProductsSectionProps> = ({ catalogs, onOpenCatalog, sectionRef }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // RTL-safe active-slide tracking: pick the card whose centre is closest
  // to the scroller's centre.
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.getBoundingClientRect().left + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const r = (child as HTMLElement).getBoundingClientRect();
      const c = r.left + r.width / 2;
      const d = Math.abs(c - center);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setActive(best);
  };

  const goToSlide = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    (el.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <section ref={sectionRef} id="products" className="mb-12 scroll-mt-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-skin-primary"><BookMarked size={20} /></span>
            <h2 className="text-xl font-black text-skin-text tracking-tight">محصولات</h2>
          </div>
          <span className="text-xs font-bold bg-skin-primary/10 text-skin-primary px-2.5 py-1 rounded-full border border-skin-primary/20 tabular-nums">
            {PRODUCTS.length}
          </span>
        </div>
        <div className="h-px w-full" style={{ background: 'linear-gradient(to left, transparent, var(--color-border) 30%, var(--color-border) 70%, transparent)' }} />
        <p className="text-sm text-skin-muted mt-3">طیفی از فرآورده‌های دارویی، مکمل‌های تخصصی و تجهیزات پزشکی نوآورانه</p>
      </div>

      {/* Mobile carousel (one product per slide) + desktop grid — shared markup */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-start overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
      >
        {PRODUCTS.map((product) => {
          const matchingCatalog = catalogs.find(c =>
            c.title.toLowerCase().includes(product.matchKeyword.toLowerCase()) ||
            c.category.toLowerCase().includes(product.matchKeyword.toLowerCase())
          );
          return (
            <article
              key={product.id}
              className="snap-center shrink-0 w-[82%] xs:w-[70%] sm:w-[55%] md:w-auto bg-skin-card border border-skin-border rounded-2xl overflow-hidden flex flex-col hover:border-skin-primary/30 hover:shadow-[0_14px_40px_rgba(0,0,0,0.09)] md:hover:-translate-y-1 transition-all"
            >
              {/* Square image */}
              <div className="relative aspect-square bg-white">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain p-5"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                />
                <span className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-gradient-to-br from-skin-primary to-skin-primary-hover text-white flex items-center justify-center font-black text-lg shadow-md">
                  {product.number}
                </span>
                <span className="absolute top-3 left-3 text-[11px] font-bold text-skin-primary bg-skin-primary/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  {product.category}
                </span>
              </div>

              {/* Details */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="font-black text-skin-text text-lg leading-tight">{product.name}</h3>
                  <p className="text-xs font-bold text-skin-muted mt-0.5 tracking-wide" dir="ltr" style={{ textAlign: 'right' }}>{product.englishName}</p>
                </div>

                <p className="text-[13px] text-skin-muted leading-relaxed text-justify">{product.description}</p>

                {product.features && product.features.length > 0 && (
                  <ul className="mt-1 pt-3 border-t border-dashed border-skin-border space-y-2">
                    {product.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] text-skin-text/90 leading-relaxed">
                        <Check size={15} className="text-skin-primary shrink-0 mt-1" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {matchingCatalog && (
                  <button
                    onClick={() => onOpenCatalog(matchingCatalog)}
                    className="mt-auto pt-1 text-xs font-bold text-skin-primary hover:text-skin-primary-hover flex items-center gap-1 transition-colors self-start"
                  >
                    <BookOpen size={12} />
                    مشاهده کاتالوگ
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination dots (mobile only) */}
      <div className="flex md:hidden items-center justify-center gap-2 mt-4">
        {PRODUCTS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => goToSlide(i)}
            aria-label={`محصول ${i + 1}`}
            className={`h-2 rounded-full transition-all ${active === i ? 'w-6 bg-skin-primary' : 'w-2 bg-skin-border'}`}
          />
        ))}
      </div>
    </section>
  );
};

export default ProductsSection;
