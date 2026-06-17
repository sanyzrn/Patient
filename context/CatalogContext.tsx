import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Catalog, Video, Banner } from '../types';
import { CATALOGS as INITIAL_CATALOGS, VIDEOS as INITIAL_VIDEOS, BANNERS as INITIAL_BANNERS } from '../initialData';

const API_URL = './api.php';

interface CatalogContextType {
  catalogs: Catalog[];
  videos: Video[];
  banners: Banner[];
  isSavingToServer: boolean;
  addCatalog: (catalog: Catalog) => void;
  updateCatalog: (id: string, updatedCatalog: Catalog) => void;
  deleteCatalog: (id: string) => void;
  addVideo: (video: Video) => void;
  updateVideo: (id: string, updatedVideo: Video) => void;
  deleteVideo: (id: string) => void;
  addBanner: (banner: Banner) => void;
  updateBanner: (id: string, updatedBanner: Banner) => void;
  deleteBanner: (id: string) => void;
  resetToDefault: () => void;
  importData: (catalogs: Catalog[], videos: Video[], banners?: Banner[]) => void;
  saveToServer: () => Promise<{ success: boolean; message: string }>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSavingToServer, setIsSavingToServer] = useState(false);

  useEffect(() => {
    // Priority 1: Server API (data.json)
    const tryApi = async () => {
      try {
        const res = await fetch(API_URL, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.catalogs) && json.catalogs.length > 0) {
            setCatalogs(json.catalogs);
            setVideos(json.videos || []);
            setBanners(json.banners || INITIAL_BANNERS);
            setIsLoaded(true);
            return true;
          }
        }
      } catch {
        // API unavailable — fall through to next source
      }
      return false;
    };

    const loadData = async () => {
      if (await tryApi()) return;

      // Priority 2: External file (window.NAFAS_DATA from data.js)
      if (window.NAFAS_DATA) {
        setCatalogs(window.NAFAS_DATA.catalogs || []);
        setVideos(window.NAFAS_DATA.videos || []);
        setBanners(window.NAFAS_DATA.banners || INITIAL_BANNERS);
        setIsLoaded(true);
        return;
      }

      // Priority 3: LocalStorage
      const savedCatalogs = localStorage.getItem('nafas_catalogs');
      const savedVideos   = localStorage.getItem('nafas_videos');
      const savedBanners  = localStorage.getItem('nafas_banners');

      try { setCatalogs(savedCatalogs ? JSON.parse(savedCatalogs) : INITIAL_CATALOGS); }
      catch { setCatalogs(INITIAL_CATALOGS); }

      try { setVideos(savedVideos ? JSON.parse(savedVideos) : INITIAL_VIDEOS); }
      catch { setVideos(INITIAL_VIDEOS); }

      try { setBanners(savedBanners ? JSON.parse(savedBanners) : INITIAL_BANNERS); }
      catch { setBanners(INITIAL_BANNERS); }

      setIsLoaded(true);
    };

    loadData();
  }, []);

  // Keep localStorage in sync for offline fallback
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('nafas_catalogs', JSON.stringify(catalogs));
      localStorage.setItem('nafas_videos', JSON.stringify(videos));
      localStorage.setItem('nafas_banners', JSON.stringify(banners));
    }
  }, [catalogs, videos, banners, isLoaded]);

  const saveToServer = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const token = import.meta.env.VITE_ADMIN_PASSWORD || '';
    if (!token) return { success: false, message: 'توکن ادمین تنظیم نشده است.' };

    setIsSavingToServer(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify({ catalogs, videos, banners }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, message: 'داده‌ها روی سرور ذخیره شدند.' };
      }
      return { success: false, message: json.error || 'خطای سرور' };
    } catch (err) {
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' };
    } finally {
      setIsSavingToServer(false);
    }
  }, [catalogs, videos, banners]);

  const addCatalog    = (catalog: Catalog) => setCatalogs(prev => [catalog, ...prev]);
  const updateCatalog = (id: string, updated: Catalog) => setCatalogs(prev => prev.map(c => c.id === id ? updated : c));
  const deleteCatalog = (id: string) => setCatalogs(prev => prev.filter(c => c.id !== id));

  const addVideo    = (video: Video) => setVideos(prev => [video, ...prev]);
  const updateVideo = (id: string, updated: Video) => setVideos(prev => prev.map(v => v.id === id ? updated : v));
  const deleteVideo = (id: string) => setVideos(prev => prev.filter(v => v.id !== id));

  const addBanner    = (banner: Banner) => setBanners(prev => [...prev, banner]);
  const updateBanner = (id: string, updated: Banner) => setBanners(prev => prev.map(b => b.id === id ? updated : b));
  const deleteBanner = (id: string) => setBanners(prev => prev.filter(b => b.id !== id));

  const resetToDefault = () => {
    if (window.confirm('آیا مطمئن هستید؟ تمام تغییرات شما حذف و به حالت اولیه باز می‌گردد.')) {
      setCatalogs(INITIAL_CATALOGS);
      setVideos(INITIAL_VIDEOS);
      setBanners(INITIAL_BANNERS);
      localStorage.removeItem('nafas_catalogs');
      localStorage.removeItem('nafas_videos');
      localStorage.removeItem('nafas_banners');
    }
  };

  const importData = (newCatalogs: Catalog[], newVideos: Video[], newBanners?: Banner[]) => {
    setCatalogs(newCatalogs);
    setVideos(newVideos);
    if (newBanners) setBanners(newBanners);
  };

  return (
    <CatalogContext.Provider value={{
      catalogs, videos, banners, isSavingToServer,
      addCatalog, updateCatalog, deleteCatalog,
      addVideo, updateVideo, deleteVideo,
      addBanner, updateBanner, deleteBanner,
      resetToDefault, importData, saveToServer,
    }}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalogs = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) throw new Error('useCatalogs must be used within a CatalogProvider');
  return context;
};
