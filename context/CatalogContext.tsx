import React, { createContext, useContext, useState, useEffect } from 'react';
import { Catalog, Video, Banner } from '../types';
import { CATALOGS as INITIAL_CATALOGS, VIDEOS as INITIAL_VIDEOS, BANNERS as INITIAL_BANNERS } from '../initialData';

interface CatalogContextType {
  catalogs: Catalog[];
  videos: Video[];
  banners: Banner[];
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
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Data Strategy:
  // 1. External File (window.NAFAS_DATA from data.js) - Highest Priority
  // 2. LocalStorage (User edits via Admin Panel)
  // 3. Default Hardcoded Data (initialData.ts)
  useEffect(() => {
    // Check for External Data First
    if (window.NAFAS_DATA) {
      console.log('Loading data from external file (data.js)');
      setCatalogs(window.NAFAS_DATA.catalogs || []);
      setVideos(window.NAFAS_DATA.videos || []);
      setBanners(window.NAFAS_DATA.banners || INITIAL_BANNERS);
      setIsLoaded(true);
      return;
    }

    // Fallback to LocalStorage
    const savedCatalogs = localStorage.getItem('nafas_catalogs');
    const savedVideos = localStorage.getItem('nafas_videos');
    const savedBanners = localStorage.getItem('nafas_banners');
    
    if (savedCatalogs) {
      try {
        setCatalogs(JSON.parse(savedCatalogs));
      } catch (e) {
        setCatalogs(INITIAL_CATALOGS);
      }
    } else {
      setCatalogs(INITIAL_CATALOGS);
    }

    if (savedVideos) {
      try {
        setVideos(JSON.parse(savedVideos));
      } catch (e) {
        setVideos(INITIAL_VIDEOS);
      }
    } else {
      setVideos(INITIAL_VIDEOS);
    }
    
    if (savedBanners) {
      try {
        setBanners(JSON.parse(savedBanners));
      } catch (e) {
        setBanners(INITIAL_BANNERS);
      }
    } else {
      setBanners(INITIAL_BANNERS);
    }

    setIsLoaded(true);
  }, []);

  // Save to LocalStorage whenever data changes (Admin Panel usage)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('nafas_catalogs', JSON.stringify(catalogs));
      localStorage.setItem('nafas_videos', JSON.stringify(videos));
      localStorage.setItem('nafas_banners', JSON.stringify(banners));
    }
  }, [catalogs, videos, banners, isLoaded]);

  // Catalog Actions
  const addCatalog = (catalog: Catalog) => {
    setCatalogs(prev => [catalog, ...prev]);
  };

  const updateCatalog = (id: string, updatedCatalog: Catalog) => {
    setCatalogs(prev => prev.map(cat => cat.id === id ? updatedCatalog : cat));
  };

  const deleteCatalog = (id: string) => {
    setCatalogs(prev => prev.filter(cat => cat.id !== id));
  };

  // Video Actions
  const addVideo = (video: Video) => {
    setVideos(prev => [video, ...prev]);
  };

  const updateVideo = (id: string, updatedVideo: Video) => {
    setVideos(prev => prev.map(vid => vid.id === id ? updatedVideo : vid));
  };

  const deleteVideo = (id: string) => {
    setVideos(prev => prev.filter(vid => vid.id !== id));
  };
  
  // Banner Actions
  const addBanner = (banner: Banner) => {
    setBanners(prev => [...prev, banner]);
  };

  const updateBanner = (id: string, updatedBanner: Banner) => {
    setBanners(prev => prev.map(b => b.id === id ? updatedBanner : b));
  };

  const deleteBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const resetToDefault = () => {
    if (window.confirm('آیا مطمئن هستید؟ تمام تغییرات شما حذف و به حالت اولیه باز می‌گردد.')) {
      setCatalogs(INITIAL_CATALOGS);
      setVideos(INITIAL_VIDEOS);
      setBanners(INITIAL_BANNERS);
      // Also clear localStorage so next time defaults load unless external file exists
      localStorage.removeItem('nafas_catalogs');
      localStorage.removeItem('nafas_videos');
      localStorage.removeItem('nafas_banners');
    }
  };

  const importData = (newCatalogs: Catalog[], newVideos: Video[], newBanners?: Banner[]) => {
    setCatalogs(newCatalogs);
    setVideos(newVideos);
    if (newBanners) {
      setBanners(newBanners);
    }
  };

  return (
    <CatalogContext.Provider value={{ 
      catalogs, videos, banners,
      addCatalog, updateCatalog, deleteCatalog, 
      addVideo, updateVideo, deleteVideo,
      addBanner, updateBanner, deleteBanner,
      resetToDefault,
      importData 
    }}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalogs = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalogs must be used within a CatalogProvider');
  }
  return context;
};