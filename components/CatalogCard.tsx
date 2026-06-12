import React from 'react';
import { Catalog } from '../types';
import { BookOpen, Calendar, ChevronLeft, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface CatalogCardProps {
  catalog: Catalog;
  onClick: (catalog: Catalog) => void;
  viewMode?: 'grid' | 'list';
}

const CatalogCard: React.FC<CatalogCardProps> = ({ catalog, onClick, viewMode = 'grid' }) => {
  const isList = viewMode === 'list';

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    
    if (catalog.pdfUrl) {
      link.href = catalog.pdfUrl;
      link.target = '_blank';
    } else {
      link.href = catalog.pages[0];
      link.download = `${catalog.title}.jpg`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Language Badge Helper
  const getLangBadge = (lang?: string) => {
      if (lang === 'en') return { img: 'https://patient.nafaspharmed.com/doc/en.png', code: 'EN' };
      return { img: 'https://patient.nafaspharmed.com/doc/ir.png', code: 'IR' };
  };

  const langData = getLangBadge(catalog.language);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      onClick={() => onClick(catalog)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(catalog); } }}
      role="button"
      tabIndex={0}
      aria-label={`مشاهده کاتالوگ ${catalog.title}`}
      className={`group bg-skin-card border border-skin-border rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:border-skin-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary focus-visible:ring-offset-2 focus-visible:ring-offset-skin-base flex isolation-isolate ${isList ? 'flex-row h-40 sm:h-48' : 'flex-col h-full'}`}
    >
      <motion.div layout="position" className={`relative overflow-hidden bg-gray-200 ${isList ? 'w-1/3 sm:w-40 shrink-0' : 'aspect-[3/4] w-full'}`}>
        <img 
          src={catalog.coverImage} 
          alt={catalog.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 transform-gpu"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges Container */}
        <div className="absolute top-3 left-3 flex gap-2">
            {/* Category Badge */}
            {catalog.category && (
                <div className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-md">
                    {catalog.category}
                </div>
            )}
            
            {/* Language Badge */}
            <div className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1.5" title={catalog.language === 'en' ? 'انگلیسی' : 'فارسی'}>
                <img src={langData.img} alt={langData.code} className="w-4 h-3 object-cover rounded-[1px]" />
                <span className="font-bold leading-none pt-0.5">{langData.code}</span>
            </div>
        </div>

      </motion.div>

      <motion.div layout="position" className={`flex flex-col flex-grow ${isList ? 'p-3 sm:p-5 justify-center' : 'p-5'}`}>
        <div className="flex items-center gap-2 text-skin-primary text-xs sm:text-sm mb-1 sm:mb-2 font-medium">
            <BookOpen size={isList ? 14 : 16} />
            <span>{catalog.pageCount} صفحه</span>
        </div>
        
        <h3 className={`font-bold text-skin-text mb-1 sm:mb-2 leading-tight group-hover:text-skin-primary transition-colors ${isList ? 'text-base sm:text-xl' : 'text-xl'}`}>
          {catalog.title}
        </h3>
        
        <p className={`text-skin-muted text-xs sm:text-sm line-clamp-2 ${isList ? 'mb-2' : 'mb-4 flex-grow'}`}>
          {catalog.description}
        </p>
        
        <div className={`flex items-center justify-between border-skin-border pt-2 sm:pt-4 ${isList ? 'mt-0 border-t-0' : 'mt-auto border-t'}`}>
            <span className="flex items-center text-skin-muted text-[10px] sm:text-xs">
                <Calendar size={12} className="mr-1 ml-1 sm:w-3.5 sm:h-3.5" />
                {catalog.date}
            </span>
            
            <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="p-1.5 text-skin-muted hover:text-skin-primary hover:bg-skin-control-bg rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary"
                  title="دانلود"
                  aria-label={`دانلود ${catalog.title}`}
                >
                    <Download size={18} />
                </button>
                <span className={`flex items-center text-skin-text text-xs sm:text-sm font-medium group-hover:-translate-x-2 transition-transform duration-300 ${isList ? 'hidden sm:flex' : ''}`}>
                    مشاهده
                    <ChevronLeft size={16} className="mr-1" />
                </span>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CatalogCard;