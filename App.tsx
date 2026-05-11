import React, { useState, useEffect } from 'react';
import { Catalog, Video } from './types';
import { CatalogProvider, useCatalogs } from './context/CatalogContext';
import CatalogCard from './components/CatalogCard';
import VideoCard from './components/VideoCard';
import BookViewer from './components/BookViewer';
import VideoPlayer from './components/VideoPlayer';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import SkeletonCard from './components/SkeletonCard';
import ChatBot from './components/ChatBot'; // Import ChatBot
import HeroSlider from './components/HeroSlider';
import { Search, Sun, Moon, BookOpen, LayoutList, ArrowDownUp, LayoutGrid, Video as VideoIcon, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Theme = 'light' | 'dark' | 'reading';
type ViewMode = 'home' | 'admin';
type SortOption = 'newest' | 'oldest' | 'az' | 'za';
type DisplayMode = 'grid' | 'list';

const MainApp = () => {
  const { catalogs, videos } = useCatalogs();
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [initialPage, setInitialPage] = useState(0);

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');

  const categories = ['همه', ...new Set(catalogs.map(c => c.category).filter(Boolean))];

  // --- Deep Linking: Parse URL on mount or when catalogs load ---
  useEffect(() => {
    if (catalogs.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const catId = params.get('cat');
      const pageNum = params.get('page');

      if (catId) {
        const found = catalogs.find(c => c.id === catId);
        if (found) {
          let pIndex = 0;
          if (pageNum) {
            pIndex = Math.max(0, parseInt(pageNum) - 1);
            if (pIndex >= found.pages.length) pIndex = 0;
          }
          setInitialPage(pIndex);
          setSelectedCatalog(found);
        }
      }
    }
  }, [catalogs]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleResize = () => setDisplayMode(window.innerWidth < 768 ? 'list' : 'grid');
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    if (theme !== 'light') document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (window.location.hash === '#admin') setViewMode('admin');
  }, []);

  // --- Admin Shortcut (Alt + A) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.altKey && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
            setViewMode(prev => prev === 'admin' ? 'home' : 'admin');
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getProcessedCatalogs = () => {
    let result = catalogs.filter(cat => 
        (selectedCategory === 'همه' || cat.category === selectedCategory) &&
        (cat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return result.sort((a, b) => {
        switch (sortBy) {
            case 'newest': return b.date.localeCompare(a.date);
            case 'oldest': return a.date.localeCompare(b.date);
            case 'az': return a.title.localeCompare(b.title, 'fa');
            case 'za': return b.title.localeCompare(a.title, 'fa');
            default: return 0;
        }
    });
  };

  const processedCatalogs = getProcessedCatalogs();

  const processedVideos = videos.filter(vid => 
     vid.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
     vid.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('reading');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    switch(theme) {
        case 'light': return <Sun size={20} />;
        case 'dark': return <Moon size={20} />;
        case 'reading': return <BookOpen size={20} />;
    }
  };

  const handleCloseViewer = () => {
    setSelectedCatalog(null);
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  const handleOpenCatalog = (cat: Catalog) => {
    setInitialPage(0);
    setSelectedCatalog(cat);
    
    // Update URL for deep linking
    const newUrl = `${window.location.pathname}?cat=${cat.id}&page=1`;
    window.history.pushState({}, '', newUrl);
  };

  if (viewMode === 'admin') {
    if (!isAuthenticated) return <AdminLogin onLogin={() => setIsAuthenticated(true)} onBack={() => setViewMode('home')} />;
    return <AdminPanel onLogout={() => { setIsAuthenticated(false); setViewMode('home'); }} />;
  }

  return (
    <div className="min-h-screen font-sans bg-skin-base text-skin-text transition-colors duration-300 relative flex flex-col">
      <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-skin-base/80 border-b border-skin-border transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://nafaspharmed.com/wp-content/uploads/2025/11/logo_fa.png" alt="نفس فارمد" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center bg-skin-card border border-skin-border rounded-full px-4 py-2 w-80 focus-within:border-skin-primary transition-colors">
                <Search size={18} className="text-skin-muted ml-2" />
                <input type="text" placeholder="جستجو..." className="bg-transparent border-none outline-none text-sm text-skin-text w-full placeholder-skin-muted" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
             <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-skin-card border border-skin-border text-skin-text hover:bg-skin-control-hover transition-colors">
                {getThemeIcon()}
             </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 flex-grow">
        <HeroSlider />

        <div className="md:hidden mb-8">
             <div className="flex items-center bg-skin-card border border-skin-border rounded-2xl px-4 py-3.5 w-full focus-within:border-skin-primary focus-within:shadow-md transition-all shadow-sm">
                <Search size={20} className="text-skin-muted ml-3" />
                <input type="text" placeholder="جستجو در آموزش‌ها..." className="bg-transparent border-none outline-none text-skin-text w-full placeholder-skin-muted font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
        </div>

        <div className="mb-12">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-end gap-4">
                    <h3 className="text-xl md:text-2xl font-bold text-skin-text flex items-center gap-2"><BookOpen className="text-skin-primary" />کاتالوگ‌ها</h3>
                    <div className="flex items-center gap-2 bg-skin-card p-1.5 rounded-xl border border-skin-border shadow-sm">
                        <div className="relative flex items-center">
                            <ArrowDownUp size={16} className="absolute right-2 text-skin-muted pointer-events-none" />
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="appearance-none bg-skin-control-bg hover:bg-skin-control-hover text-skin-text text-xs rounded-lg pr-7 pl-2 py-1.5 outline-none cursor-pointer">
                                <option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="az">حروف الفبا</option>
                            </select>
                        </div>
                        <div className="w-px h-5 bg-skin-border mx-1"></div>
                        <button onClick={() => setDisplayMode('grid')} className={`p-1.5 rounded-lg ${displayMode === 'grid' ? 'bg-skin-control-hover text-skin-primary' : 'text-skin-muted'}`}><LayoutGrid size={16} /></button>
                        <button onClick={() => setDisplayMode('list')} className={`p-1.5 rounded-lg ${displayMode === 'list' ? 'bg-skin-control-hover text-skin-primary' : 'text-skin-muted'}`}><LayoutList size={16} /></button>
                    </div>
                </div>
                {categories.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-skin-primary text-white shadow-md' : 'bg-skin-card border border-skin-border text-skin-text hover:bg-skin-control-bg'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {isLoading ? (
                <motion.div layout className={`grid gap-4 md:gap-6 ${displayMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                     {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </motion.div>
            ) : processedCatalogs.length > 0 ? (
                <motion.div layout className={`grid gap-4 md:gap-6 ${displayMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <AnimatePresence mode="popLayout">
                    {processedCatalogs.map(catalog => (
                        <CatalogCard key={catalog.id} catalog={catalog} onClick={handleOpenCatalog} viewMode={displayMode} />
                    ))}
                  </AnimatePresence>
                </motion.div>
            ) : (
                <motion.div initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} className="py-16 flex flex-col items-center justify-center text-center text-skin-muted bg-skin-card border border-dashed border-skin-border rounded-3xl">
                    <BookOpen size={48} className="text-skin-border mb-4" strokeWidth={1} />
                    <p className="font-medium text-lg text-skin-text">هیچ آموزشی یافت نشد.</p>
                    <p className="text-sm mt-1">لطفاً عبارت دیگری را جستجو کنید یا دسته‌بندی را تغییر دهید.</p>
                </motion.div>
            )}
        </div>

        {processedVideos.length > 0 && !isLoading && (
            <div className="mb-8 pt-8 border-t border-skin-border">
                <div className="mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-skin-text flex items-center gap-2 mb-2"><VideoIcon className="text-skin-primary" />ویدئوهای آموزشی</h3>
                </div>
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence mode="popLayout">
                    {processedVideos.map(video => <VideoCard key={video.id} video={video} onClick={setSelectedVideo} />)}
                  </AnimatePresence>
                </motion.div>
            </div>
        )}
      </main>

      <footer className="border-t border-skin-border py-6 mt-12 bg-skin-base/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-skin-muted text-sm text-center">© تمامی حقوق متعلق به شرکت نفس زیست فارمد است.</p>
            <a href="https://dbsgraphic.ir/" target="_blank" rel="noopener noreferrer" dir="ltr" className="text-[10px] text-skin-muted/80 hover:text-skin-primary transition-colors flex items-center gap-1 bg-skin-card/50 px-3 py-1.5 rounded-full border border-skin-border">
                Created with <span className="text-red-500 animate-pulse">❤</span> by DBS Graphic
            </a>
        </div>
      </footer>
      
      {/* AI ChatBot */}
      <ChatBot />

      {selectedCatalog && <BookViewer catalog={selectedCatalog} initialPage={initialPage} onClose={handleCloseViewer} />}
      {selectedVideo && <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </div>
  );
}

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <CatalogProvider>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: 'inherit', fontSize: '14px' } }} />
      <MainApp />
    </CatalogProvider>
  );
}

export default App;