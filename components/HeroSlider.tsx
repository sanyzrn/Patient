import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen } from 'lucide-react';
import { Banner } from '../types';
import { useCatalogs } from '../context/CatalogContext';

const HeroSlider = () => {
    const { banners } = useCatalogs();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const touchStartX = useRef<number | null>(null);

    const goTo = (i: number) => {
        const len = banners?.length || 0;
        if (len === 0) return;
        setCurrentIndex(((i % len) + len) % len);
    };

    // Auto-slide effect (pauses on hover/touch).
    useEffect(() => {
        if (!banners || banners.length <= 1 || isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % banners.length);
        }, 5000); // 5 seconds

        return () => clearInterval(interval);
    }, [banners, isPaused]);

    // Keep index in range if banners shrink.
    useEffect(() => {
        if (banners && currentIndex >= banners.length) setCurrentIndex(0);
    }, [banners, currentIndex]);

    if (!banners || banners.length === 0) return null;

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        // In RTL, swipe left -> next, swipe right -> previous.
        if (Math.abs(dx) > 40) goTo(currentIndex + (dx < 0 ? 1 : -1));
        touchStartX.current = null;
    };

    return (
        <div
            className="relative mb-10 overflow-hidden rounded-[2rem] bg-gradient-to-l from-skin-primary/10 via-skin-primary/5 to-transparent border border-skin-border/50 shadow-sm min-h-[300px] md:min-h-[250px] flex items-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="region"
            aria-label="بنرهای معرفی"
        >
            
            <AnimatePresence mode="wait">
                {banners.map((banner, index) => {
                    if (index !== currentIndex) return null;

                    return (
                        <motion.div
                            key={banner.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.5, ease: "easeInOut" }}
                            className="absolute inset-0 w-full h-full flex items-center px-8 md:px-14"
                        >
                            {banner.type === 'text' ? (
                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 w-full">
                                    <div className="text-center md:text-right flex-1">
                                        <h2 className="text-3xl md:text-5xl font-black text-skin-text mb-4 leading-tight tracking-tight">
                                            {banner.title}
                                        </h2>
                                        <p className="text-skin-muted text-base md:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed">
                                            {banner.description}
                                        </p>
                                        {banner.link && (
                                            <a href={banner.link} target="_blank" rel="noopener noreferrer" className="inline-block mt-6 bg-skin-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-skin-primary-hover transition-colors shadow-md">
                                                مشاهده بیشتر
                                            </a>
                                        )}
                                    </div>
                                    <div className="hidden md:flex items-center justify-center bg-skin-card/40 backdrop-blur-md rounded-3xl p-8 border border-skin-border/50 shadow-inner">
                                        {banner.imageUrl ? (
                                            <img src={banner.imageUrl} alt={banner.title} className="w-32 h-32 object-contain" />
                                        ) : (
                                            <BookOpen size={80} strokeWidth={1} className="text-skin-primary opacity-80" />
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 w-full h-full">
                                    {banner.link ? (
                                        <a href={banner.link} target="_blank" rel="noopener noreferrer">
                                            <picture>
                                                {banner.mobileImageUrl && <source media="(max-width: 768px)" srcSet={banner.mobileImageUrl} />}
                                                <img src={banner.imageUrl} alt={banner.title || 'تصویر بنر'} className="w-full h-full object-cover" />
                                            </picture>
                                        </a>
                                    ) : (
                                        <picture>
                                            {banner.mobileImageUrl && <source media="(max-width: 768px)" srcSet={banner.mobileImageUrl} />}
                                            <img src={banner.imageUrl} alt={banner.title || 'تصویر بنر'} className="w-full h-full object-cover" />
                                        </picture>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* abstract background elements - only visible if there are elements without full coverage image */}
            <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-skin-primary opacity-10 blur-[120px] rounded-full pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-skin-primary opacity-10 blur-[80px] rounded-full pointer-events-none z-0"></div>

            {/* Pagination Indicators */}
            {banners.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            aria-label={`نمایش بنر ${i + 1}`}
                            aria-current={i === currentIndex}
                            className={`h-2 rounded-full transition-all ${i === currentIndex ? 'bg-skin-primary w-6' : 'bg-skin-border hover:bg-skin-muted w-2'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HeroSlider;
