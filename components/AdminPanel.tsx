import React, { useState, useEffect } from 'react';
import { useCatalogs } from '../context/CatalogContext';
import { Catalog, Video, Banner } from '../types';
import { toast } from 'react-hot-toast';
import { 
  Plus, Trash2, Edit2, Save, X, Upload, 
  Image as ImageIcon, FileText, LayoutGrid, LogOut, Copy, 
  AlertTriangle, Video as VideoIcon, Book, Link as LinkIcon,
  Database, CheckCircle, Tag, Globe, BarChart2, Presentation
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface AdminPanelProps {
  onLogout: () => void;
}

// Helper to convert file to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

type Tab = 'catalogs' | 'videos' | 'banners' | 'analytics';

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const { 
      catalogs, videos, banners, 
      addCatalog, updateCatalog, deleteCatalog, 
      addVideo, updateVideo, deleteVideo, 
      addBanner, updateBanner, deleteBanner,
      resetToDefault, importData 
  } = useCatalogs();
  
  const [activeTab, setActiveTab] = useState<Tab>('catalogs');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string, type: Tab} | null>(null);
  
  // Database Code Management
  const [dbCode, setDbCode] = useState('');
  
  // New state for manual page URL input
  const [newPageUrl, setNewPageUrl] = useState('');

  // Form State - Catalog
  const [catalogForm, setCatalogForm] = useState<Partial<Catalog>>({
    title: '', description: '', date: '', pdfUrl: '', coverImage: '', pages: [], pageCount: 0, category: 'عمومی', language: 'fa'
  });

  // Form State - Video
  const [videoForm, setVideoForm] = useState<Partial<Video>>({
    title: '', description: '', date: '', videoUrl: '', coverImage: '', duration: ''
  });

  // Form State - Banner
  const [bannerForm, setBannerForm] = useState<Partial<Banner>>({
    type: 'text', title: '', description: '', imageUrl: '', link: ''
  });

  // Analytics State
  const [statsData, setStatsData] = useState<{ viewsByCatalog: Record<string, number>, timeByCatalogPage: Record<string, Record<number, number>> } | null>(null);
  const [selectedCatalogStats, setSelectedCatalogStats] = useState<string>('');

  // Calculate unique categories for suggestions
  const uniqueCategories = Array.from(new Set(catalogs.map(c => c.category))).filter(Boolean);

  // Update dbCode whenever data changes (unless user is editing it manually?)
  // For simplicity and to ensure sync, we update it, but we let user edit it freely.
  // When 'showExport' is opened, we'll sync it once.
  useEffect(() => {
     if (!showExport) {
        const catalogsJson = JSON.stringify(catalogs, null, 2);
        const videosJson = JSON.stringify(videos, null, 2);
        const bannersJson = JSON.stringify(banners, null, 2);
        setDbCode(`window.NAFAS_DATA = {\n  banners: ${bannersJson},\n  catalogs: ${catalogsJson},\n  videos: ${videosJson}\n};`);
     }
  }, [catalogs, videos, banners, showExport]);

  // Load stats when switching to analytics tab
  useEffect(() => {
     if (activeTab === 'analytics') {
         const d = localStorage.getItem('nafas_analytics');
         if (d) {
            const parsed = JSON.parse(d);
            setStatsData(parsed);
            if (Object.keys(parsed.timeByCatalogPage || {}).length > 0) {
                // Pre-select 'کلدانیز' or the first one
                const coldanese = catalogs.find(c => c.title.includes('کلدانیز') || c.title.includes('Coldanese'));
                if (coldanese && parsed.timeByCatalogPage[coldanese.id]) setSelectedCatalogStats(coldanese.id);
                else setSelectedCatalogStats(Object.keys(parsed.timeByCatalogPage)[0]);
            }
         }
     }
  }, [activeTab, catalogs]);

  const resetForms = () => {
    const today = new Date().toLocaleDateString('fa-IR');
    setCatalogForm({
      title: '', description: '', date: today, pdfUrl: '', coverImage: '', pages: [], pageCount: 0, category: 'عمومی', language: 'fa'
    });
    setVideoForm({
      title: '', description: '', date: today, videoUrl: '', coverImage: '', duration: ''
    });
    setBannerForm({
      type: 'text', title: '', description: '', imageUrl: '', link: ''
    });
    setEditingId(null);
    setShowForm(false);
    setNewPageUrl('');
  };

  const handleEdit = (item: Catalog | Video | Banner, type: Tab) => {
    if (type === 'catalogs') {
        setCatalogForm(item as Catalog);
    } else if (type === 'videos') {
        setVideoForm(item as Video);
    } else if (type === 'banners') {
        setBannerForm(item as Banner);
    }
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, type: Tab) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      if (type === 'catalogs') {
          if (field === 'cover') {
            const base64 = await fileToBase64(files[0]);
            setCatalogForm(prev => ({ ...prev, coverImage: base64 }));
          } else if (field === 'pages') {
            const newPages = await Promise.all(Array.from(files).map(fileToBase64));
            setCatalogForm(prev => ({
              ...prev,
              pages: [...(prev.pages || []), ...newPages],
              pageCount: (prev.pages?.length || 0) + newPages.length
            }));
          }
      } else if (type === 'videos') {
          // Video Cover
           const base64 = await fileToBase64(files[0]);
           setVideoForm(prev => ({ ...prev, coverImage: base64 }));
      } else if (type === 'banners') {
          const base64 = await fileToBase64(files[0]);
          if (field === 'mobileCover') {
              setBannerForm(prev => ({ ...prev, mobileImageUrl: base64 }));
          } else {
              setBannerForm(prev => ({ ...prev, imageUrl: base64 }));
          }
      }
    } catch (error) {
      toast.error('خطا در بارگذاری تصویر');
    }
  };

  const handleAddPageUrl = () => {
    if (!newPageUrl.trim()) return;
    setCatalogForm(prev => ({
        ...prev,
        pages: [...(prev.pages || []), newPageUrl.trim()],
        pageCount: (prev.pages?.length || 0) + 1
    }));
    setNewPageUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'catalogs') {
        if (!catalogForm.title || !catalogForm.coverImage || !catalogForm.pages?.length) {
            toast.error('لطفا عنوان، تصویر کاور و صفحات را تکمیل کنید');
            return;
        }
        const data: Catalog = {
            id: editingId || Date.now().toString(),
            title: catalogForm.title!,
            description: catalogForm.description || '',
            date: catalogForm.date || '',
            pdfUrl: catalogForm.pdfUrl || undefined,
            coverImage: catalogForm.coverImage!,
            pages: catalogForm.pages!,
            pageCount: catalogForm.pages!.length,
            category: catalogForm.category || 'عمومی',
            language: catalogForm.language || 'fa'
        };
        if (editingId) updateCatalog(editingId, data); else addCatalog(data);

    } else if (activeTab === 'videos') {
        if (!videoForm.title || !videoForm.coverImage || !videoForm.videoUrl) {
            toast.error('لطفا عنوان، تصویر کاور و آدرس ویدئو را تکمیل کنید');
            return;
        }
        const data: Video = {
            id: editingId || Date.now().toString(),
            title: videoForm.title!,
            description: videoForm.description || '',
            date: videoForm.date || '',
            videoUrl: videoForm.videoUrl!,
            coverImage: videoForm.coverImage!,
            duration: videoForm.duration
        };
        if (editingId) updateVideo(editingId, data); else addVideo(data);
    } else if (activeTab === 'banners') {
        if (!bannerForm.type) {
             toast.error('لطفا اطلاعات ضروری را تکمیل کنید');
             return;
        }
        const data: Banner = {
            id: editingId || Date.now().toString(),
            type: bannerForm.type,
            title: bannerForm.title || '',
            description: bannerForm.description || '',
            imageUrl: bannerForm.imageUrl || '',
            mobileImageUrl: bannerForm.mobileImageUrl || '',
            link: bannerForm.link || ''
        };
        if (editingId) updateBanner(editingId, data); else addBanner(data);
    }
    resetForms();
  };

  const removePage = (index: number) => {
    const newPages = catalogForm.pages?.filter((_, i) => i !== index);
    setCatalogForm(prev => ({ ...prev, pages: newPages, pageCount: newPages?.length || 0 }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dbCode);
    toast.success('کد کپی شد! حالا محتوای فایل data.js را با این کد جایگزین کنید.');
  };

  const handleApplyCode = () => {
    try {
        // Simple parser to extract JSON object from window assignment
        // Removes 'window.NAFAS_DATA =' from start and ';' from end if present
        let cleanJson = dbCode.trim();
        if (cleanJson.startsWith('window.NAFAS_DATA')) {
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }
        }
        
        const data = JSON.parse(cleanJson);
        
        if (Array.isArray(data.catalogs) && Array.isArray(data.videos)) {
            importData(data.catalogs, data.videos);
            toast.success('تغییرات با موفقیت اعمال شد!');
        } else {
            toast.error('فرمت کد اشتباه است. باید شامل catalogs و videos باشد.');
        }
    } catch (e) {
        console.error(e);
        toast.error('خطا در پردازش کد. لطفا مطمئن شوید فرمت صحیح است.');
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmation) {
      if (deleteConfirmation.type === 'catalogs') {
          deleteCatalog(deleteConfirmation.id);
      } else if (deleteConfirmation.type === 'videos') {
          deleteVideo(deleteConfirmation.id);
      } else if (deleteConfirmation.type === 'banners') {
          deleteBanner(deleteConfirmation.id);
      }
      setDeleteConfirmation(null);
    }
  };

  return (
    <div className="min-h-screen bg-skin-base text-skin-text pb-20">
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-skin-card rounded-xl shadow-2xl max-w-sm w-full p-6 border border-skin-border">
                <div className="flex items-center gap-3 text-red-600 mb-4">
                    <div className="p-3 bg-red-100 rounded-full">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-skin-text">حذف آیتم</h3>
                </div>
                <p className="text-skin-muted mb-6 text-sm leading-relaxed">
                    آیا از حذف این آیتم اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
                </p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setDeleteConfirmation(null)}
                        className="px-4 py-2 text-skin-muted hover:bg-skin-control-bg rounded-lg transition-colors text-sm font-medium"
                    >
                        انصراف
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md text-sm font-medium flex items-center gap-2"
                    >
                        <Trash2 size={16} />
                        بله، حذف شود
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Admin Header */}
      <header className="bg-skin-card border-b border-skin-border sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-skin-primary">
            <LayoutGrid />
            <span className="hidden sm:inline">پنل مدیریت پیشرفته</span>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowExport(!showExport)}
                className={`text-xs sm:text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showExport ? 'bg-yellow-200 text-yellow-900 shadow-inner' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
             >
                <Database size={14} />
                <span className="hidden sm:inline">مدیریت دیتابیس</span>
             </button>
             <button 
                onClick={onLogout}
                className="flex items-center gap-2 text-xs sm:text-sm text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
             >
                <LogOut size={16} />
                <span className="hidden sm:inline">خروج</span>
             </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        
        {/* Import/Export Area */}
        {showExport && (
            <div className="bg-skin-card border-2 border-yellow-200 rounded-xl p-6 mb-8 shadow-sm animate-fade-in">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                            <Database size={20} className="text-yellow-600" />
                            ویرایش مستقیم کد (data.js)
                        </h3>
                        <p className="text-skin-muted text-sm leading-relaxed max-w-2xl">
                            در اینجا می‌توانید کد دیتابیس را مشاهده کنید، کپی کنید و یا کد جدیدی را جایگذاری و اعمال کنید. 
                            هر تغییری که در دکمه‌های پایین انجام دهید، اینجا هم بروز می‌شود.
                        </p>
                    </div>
                </div>
                
                <div className="relative">
                    <textarea 
                        className="w-full h-64 bg-slate-50 border border-skin-border rounded-lg p-4 text-xs font-mono dir-ltr text-left focus:ring-2 focus:ring-skin-primary outline-none resize-y"
                        value={dbCode}
                        onChange={(e) => setDbCode(e.target.value)}
                        placeholder="Paste data.js content here..."
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                         <button 
                            onClick={handleApplyCode}
                            className="bg-green-600 text-white px-3 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-green-700 shadow-md transition-transform active:scale-95"
                            title="اعمال تغییرات متنی روی سایت"
                        >
                            <CheckCircle size={14} />
                            اعمال کد
                        </button>
                        <button 
                            onClick={copyToClipboard}
                            className="bg-skin-primary text-white px-3 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-skin-primary-hover shadow-md transition-transform active:scale-95"
                            title="کپی کد برای ذخیره در فایل"
                        >
                            <Copy size={14} />
                            کپی کد
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Tab Navigation */}
        {!showForm && (
            <div className="flex justify-center mb-8">
                <div className="bg-skin-control-bg p-1 rounded-xl flex gap-1">
                    <button 
                        onClick={() => setActiveTab('catalogs')}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'catalogs' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-muted hover:text-skin-text'}`}
                    >
                        <Book size={18} />
                        کاتالوگ‌ها
                    </button>
                    <button 
                        onClick={() => setActiveTab('videos')}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'videos' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-muted hover:text-skin-text'}`}
                    >
                        <VideoIcon size={18} />
                        ویدئوها
                    </button>
                    <button 
                        onClick={() => setActiveTab('banners')}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'banners' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-muted hover:text-skin-text'}`}
                    >
                        <Presentation size={18} />
                        بنرها
                    </button>
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'analytics' ? 'bg-skin-card text-skin-primary shadow-sm' : 'text-skin-muted hover:text-skin-text'}`}
                    >
                        <BarChart2 size={18} />
                        آمار و آنالیز
                    </button>
                </div>
            </div>
        )}

        {/* List & Add Button */}
        {!showForm && (
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {activeTab === 'catalogs' ? 'مدیریت کاتالوگ‌ها' : activeTab === 'videos' ? 'مدیریت ویدئوهای آموزشی' : activeTab === 'banners' ? 'مدیریت بنرها' : 'آمار و آنالیز'}
                        {activeTab !== 'analytics' && (
                            <span className="text-xs bg-skin-control-bg text-skin-muted px-2 py-0.5 rounded-full">
                                {activeTab === 'catalogs' ? catalogs.length : activeTab === 'videos' ? videos.length : banners.length}
                            </span>
                        )}
                    </h2>
                    {activeTab !== 'analytics' && (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                                onClick={resetToDefault}
                                className="text-xs text-skin-muted hover:text-red-500 underline px-3"
                            >
                                بازنشانی
                            </button>
                            <button 
                                onClick={() => { resetForms(); setShowForm(true); }}
                                className="flex-grow sm:flex-grow-0 bg-skin-primary hover:bg-skin-primary-hover text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md text-sm font-bold"
                            >
                                <Plus size={18} />
                                افزودن جدید
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeTab === 'analytics' && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 space-y-8 animate-fade-in">
                            {!statsData ? (
                                <div className="text-center py-12 text-skin-muted bg-skin-card rounded-xl border border-skin-border">
                                    هیچ داده آماری تا کنون ثبت نشده است.
                                </div>
                            ) : (
                                <>
                                    {/* Views by Catalog Chart */}
                                    <div className="bg-skin-card border border-skin-border rounded-xl p-6 shadow-sm">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                            <BarChart2 className="text-skin-primary" />
                                            میزان بازدید کاتالوگ‌ها در سیستم کاربر
                                        </h3>
                                        <div className="h-72 w-full" dir="ltr">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={catalogs.map(c => ({ name: c.title, views: statsData.viewsByCatalog?.[c.id] || 0 })).sort((a,b)=>b.views-a.views)}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{fontSize: 10}} />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Heatmap/Time spent per page */}
                                    <div className="bg-skin-card border border-skin-border rounded-xl p-6 shadow-sm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <BarChart2 className="text-green-500" />
                                                میزان توقف (ثانیه) روی صفحات مختلف
                                            </h3>
                                            <select 
                                                className="border border-skin-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-skin-primary"
                                                value={selectedCatalogStats}
                                                onChange={e => setSelectedCatalogStats(e.target.value)}
                                            >
                                                {Object.keys(statsData.timeByCatalogPage || {}).map(catId => {
                                                    const c = catalogs.find(x => x.id === catId);
                                                    return (
                                                        <option key={catId} value={catId}>{c ? c.title : catId}</option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div className="h-72 w-full" dir="ltr">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {selectedCatalogStats && statsData.timeByCatalogPage?.[selectedCatalogStats] ? (
                                                    <BarChart data={Object.entries(statsData.timeByCatalogPage[selectedCatalogStats]).map(([page, time]) => ({ page: `صفحه ${Number(page) + 1}`, time }))}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="page" />
                                                        <YAxis />
                                                        <Tooltip />
                                                        <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                                                            {Object.entries(statsData.timeByCatalogPage[selectedCatalogStats]).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={Number(entry[1]) > 30 ? '#ef4444' : Number(entry[1]) > 10 ? '#f59e0b' : '#10b981'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                ) : <div className="text-center text-sm text-skin-muted mt-20">داده‌ای برای این کاتالوگ موجود نیست.</div>}
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'catalogs' ? (
                        catalogs.map(cat => (
                            <div key={cat.id} className="bg-skin-card border border-skin-border rounded-xl overflow-hidden group hover:shadow-lg transition-all flex flex-col h-full relative">
                                <div className="h-40 relative bg-gray-100 border-b border-skin-border">
                                    <img src={cat.coverImage} className="w-full h-full object-cover" alt={cat.title} />
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">
                                        {cat.pageCount} صفحه
                                    </div>
                                    <div className="absolute bottom-2 right-2 bg-skin-primary/90 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">
                                        {cat.category}
                                    </div>
                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                                        {cat.language === 'en' ? (
                                            <>
                                               <img src="https://patient.nafaspharmed.com/doc/en.png" className="w-3 h-2" />
                                               <span>EN</span>
                                            </>
                                        ) : (
                                            <>
                                               <img src="https://patient.nafaspharmed.com/doc/ir.png" className="w-3 h-2" />
                                               <span>FA</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 flex-grow flex flex-col">
                                    <h3 className="font-bold text-sm mb-1 line-clamp-1">{cat.title}</h3>
                                    <p className="text-xs text-skin-muted line-clamp-2 mb-3">{cat.description}</p>
                                    
                                    <div className="mt-auto pt-3 border-t border-skin-border flex items-center justify-between gap-2">
                                        <div className="text-[10px] text-skin-muted">{cat.date}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(cat, 'catalogs')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({id: cat.id, type: 'catalogs'}); }} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : activeTab === 'videos' ? (
                        videos.map(vid => (
                             <div key={vid.id} className="bg-skin-card border border-skin-border rounded-xl overflow-hidden group hover:shadow-lg transition-all flex flex-col h-full relative">
                                <div className="h-40 relative bg-gray-900 border-b border-skin-border">
                                    <img src={vid.coverImage} className="w-full h-full object-cover opacity-80" alt={vid.title} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <PlayCircleIcon />
                                    </div>
                                    {vid.duration && <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">{vid.duration}</div>}
                                </div>
                                <div className="p-3 flex-grow flex flex-col">
                                    <h3 className="font-bold text-sm mb-1 line-clamp-1">{vid.title}</h3>
                                    <p className="text-xs text-skin-muted line-clamp-2 mb-3">{vid.description}</p>
                                    
                                    <div className="mt-auto pt-3 border-t border-skin-border flex items-center justify-between gap-2">
                                        <div className="text-[10px] text-skin-muted">{vid.date}</div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(vid, 'videos')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({id: vid.id, type: 'videos'}); }} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : activeTab === 'banners' ? (
                        banners.map(banner => (
                             <div key={banner.id} className="bg-skin-card border border-skin-border rounded-xl overflow-hidden group hover:shadow-lg transition-all flex flex-col h-full relative">
                                <div className="h-40 relative bg-gray-100 border-b border-skin-border flex justify-center items-center">
                                    {banner.imageUrl ? (
                                        <img src={banner.imageUrl} className="w-full h-full object-cover" alt={banner.title || 'تصویر بنر'} />
                                    ) : (
                                        <Presentation size={48} className="text-skin-muted opacity-50" />
                                    )}
                                    <div className="absolute top-2 right-2 bg-skin-primary/90 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">
                                        {banner.type === 'text' ? 'متنی' : 'تصویری'}
                                    </div>
                                </div>
                                <div className="p-3 flex-grow flex flex-col">
                                    <h3 className="font-bold text-sm mb-1 line-clamp-1">{banner.title || '(بدون عنوان)'}</h3>
                                    <p className="text-xs text-skin-muted line-clamp-2 mb-3">{banner.description}</p>
                                    
                                    <div className="mt-auto pt-3 border-t border-skin-border flex justify-end gap-2">
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(banner, 'banners')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmation({id: banner.id, type: 'banners'}); }} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : null}
                </div>
            </div>
        )}

        {/* Edit/Create Form */}
        {showForm && (
            <div className="max-w-4xl mx-auto bg-skin-card border border-skin-border rounded-xl p-6 md:p-8 shadow-xl">
                <div className="flex justify-between items-center mb-8 border-b border-skin-border pb-4">
                    <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        {editingId ? <Edit2 size={24} className="text-blue-500" /> : <Plus size={24} className="text-green-500" />}
                        {editingId ? 'ویرایش' : 'افزودن جدید'} 
                        <span className="text-skin-muted text-sm font-normal mr-2">
                            ({activeTab === 'catalogs' ? 'کاتالوگ' : activeTab === 'videos' ? 'ویدئو' : 'بنر'})
                        </span>
                    </h2>
                    <button onClick={resetForms} className="p-2 hover:bg-skin-control-bg rounded-full text-skin-muted">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-skin-muted">عنوان</label>
                            <input 
                                className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none"
                                value={activeTab === 'catalogs' ? catalogForm.title : videoForm.title}
                                onChange={e => activeTab === 'catalogs' ? setCatalogForm({...catalogForm, title: e.target.value}) : setVideoForm({...videoForm, title: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-skin-muted">تاریخ انتشار</label>
                            <input 
                                className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none"
                                value={activeTab === 'catalogs' ? catalogForm.date : videoForm.date}
                                onChange={e => activeTab === 'catalogs' ? setCatalogForm({...catalogForm, date: e.target.value}) : setVideoForm({...videoForm, date: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-skin-muted">توضیحات</label>
                        <textarea 
                            className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none h-24"
                            value={activeTab === 'catalogs' ? catalogForm.description : videoForm.description}
                            onChange={e => activeTab === 'catalogs' ? setCatalogForm({...catalogForm, description: e.target.value}) : setVideoForm({...videoForm, description: e.target.value})}
                        />
                    </div>

                    {/* Specific Fields for Catalog */}
                    {activeTab === 'catalogs' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Category Field */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-skin-muted flex items-center gap-2">
                                        <Tag size={16} />
                                        دسته‌بندی
                                    </label>
                                    <input 
                                        className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none"
                                        value={catalogForm.category}
                                        onChange={e => setCatalogForm({...catalogForm, category: e.target.value})}
                                        placeholder="مثلا: تنفسی، مکمل، ..."
                                    />
                                    {/* Category Suggestions */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {uniqueCategories.map(cat => (
                                            <button 
                                                type="button" 
                                                key={cat}
                                                onClick={() => setCatalogForm(prev => ({ ...prev, category: cat }))}
                                                className="text-xs px-2 py-1 rounded-full bg-skin-control-bg hover:bg-skin-primary hover:text-white transition-colors border border-skin-border text-skin-muted hover:border-skin-primary"
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Language Selector */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-skin-muted flex items-center gap-2">
                                        <Globe size={16} />
                                        زبان کاتالوگ
                                    </label>
                                    <div className="flex gap-4 h-12">
                                        <button 
                                            type="button"
                                            onClick={() => setCatalogForm(prev => ({...prev, language: 'fa'}))}
                                            className={`flex-1 rounded-lg border flex items-center justify-center gap-2 transition-all ${catalogForm.language !== 'en' ? 'bg-skin-primary text-white border-skin-primary shadow-md' : 'bg-skin-control-bg text-skin-muted border-skin-border hover:bg-skin-control-hover'}`}
                                        >
                                            <img src="https://patient.nafaspharmed.com/doc/ir.png" className="w-5 h-auto" />
                                            <span className="text-sm font-bold">فارسی (IR)</span>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setCatalogForm(prev => ({...prev, language: 'en'}))}
                                            className={`flex-1 rounded-lg border flex items-center justify-center gap-2 transition-all ${catalogForm.language === 'en' ? 'bg-skin-primary text-white border-skin-primary shadow-md' : 'bg-skin-control-bg text-skin-muted border-skin-border hover:bg-skin-control-hover'}`}
                                        >
                                            <img src="https://patient.nafaspharmed.com/doc/en.png" className="w-5 h-auto" />
                                            <span className="text-sm font-bold">English (EN)</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-skin-muted flex items-center gap-2">
                                    <FileText size={16} />
                                    لینک فایل PDF
                                </label>
                                <input 
                                    className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none dir-ltr text-left"
                                    value={catalogForm.pdfUrl}
                                    onChange={e => setCatalogForm({...catalogForm, pdfUrl: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                            
                            {/* Pages Manager */}
                            <div className="space-y-4 border-t border-skin-border pt-6">
                                <div className="flex justify-between items-center">
                                    <label className="text-lg font-bold text-skin-text flex items-center gap-2">
                                        <LayoutGrid size={20} />
                                        صفحات ({catalogForm.pages?.length || 0})
                                    </label>
                                </div>
                                
                                <div className="bg-skin-control-bg/30 p-4 rounded-xl space-y-4">
                                    {/* Add Page via URL */}
                                    <div className="flex gap-2">
                                        <div className="flex-grow relative">
                                            <LinkIcon size={16} className="absolute left-3 top-3 text-skin-muted" />
                                            <input 
                                                className="w-full p-2 pl-9 bg-white border border-skin-border rounded-lg text-sm dir-ltr focus:border-skin-primary outline-none"
                                                placeholder="https://example.com/page1.jpg"
                                                value={newPageUrl}
                                                onChange={(e) => setNewPageUrl(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPageUrl())}
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleAddPageUrl}
                                            className="px-4 py-2 bg-skin-card border border-skin-border hover:bg-skin-control-bg text-skin-text text-xs font-bold rounded-lg transition-colors flex-shrink-0"
                                        >
                                            افزودن لینک
                                        </button>
                                        <label className="flex items-center gap-2 bg-skin-primary hover:bg-skin-primary-hover text-white py-2 px-4 rounded-lg cursor-pointer text-xs font-bold shadow-sm transition-colors flex-shrink-0">
                                            <Upload size={16} />
                                            <span>آپلود</span>
                                            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(e, 'pages', 'catalogs')} />
                                        </label>
                                    </div>

                                    {/* Pages List */}
                                    {catalogForm.pages && catalogForm.pages.length > 0 ? (
                                        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide">
                                            {catalogForm.pages.map((page, idx) => (
                                                <div key={idx} className="relative w-24 h-32 shrink-0 group">
                                                    <img src={page} className="w-full h-full object-cover rounded-md border border-skin-border bg-white" alt={`Page ${idx + 1}`} />
                                                    <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">{idx + 1}</div>
                                                    <button type="button" onClick={() => removePage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-skin-muted text-xs py-4 border-2 border-dashed border-skin-border rounded-lg">
                                            هنوز صفحه‌ای اضافه نشده است
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Specific Fields for Video */}
                    {activeTab === 'videos' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-skin-muted flex items-center gap-2">
                                    <VideoIcon size={16} />
                                    لینک ویدئو (مستقیم MP4)
                                </label>
                                <input 
                                    className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none dir-ltr text-left"
                                    value={videoForm.videoUrl}
                                    onChange={e => setVideoForm({...videoForm, videoUrl: e.target.value})}
                                    placeholder="https://website.com/video.mp4"
                                    required
                                />
                            </div>
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-skin-muted">مدت زمان</label>
                                <input 
                                    className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none dir-ltr text-center"
                                    value={videoForm.duration}
                                    onChange={e => setVideoForm({...videoForm, duration: e.target.value})}
                                    placeholder="05:30"
                                />
                            </div>
                        </div>
                    )}

                    {/* Specific Fields for Banner */}
                    {activeTab === 'banners' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-skin-muted">نوع بنر</label>
                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setBannerForm({...bannerForm, type: 'text'})}
                                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${bannerForm.type === 'text' ? 'bg-skin-primary text-white' : 'bg-skin-control-bg text-skin-muted hover:bg-skin-control-hover border border-skin-border'}`}
                                    >
                                        متنی (همراه با تصویر کوچک)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setBannerForm({...bannerForm, type: 'image'})}
                                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${bannerForm.type === 'image' ? 'bg-skin-primary text-white' : 'bg-skin-control-bg text-skin-muted hover:bg-skin-control-hover border border-skin-border'}`}
                                    >
                                        تصویر کامل (بدون متن)
                                    </button>
                                </div>
                            </div>
                            
                            {bannerForm.type === 'text' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-skin-muted">عنوان بنر</label>
                                        <input 
                                            className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none"
                                            value={bannerForm.title || ''}
                                            onChange={e => setBannerForm({...bannerForm, title: e.target.value})}
                                            placeholder="عنوان اصلی..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-skin-muted">توضیحات</label>
                                        <textarea 
                                            className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none"
                                            value={bannerForm.description || ''}
                                            onChange={e => setBannerForm({...bannerForm, description: e.target.value})}
                                            placeholder="توضیحات زیر عنوان..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 pt-4 border-t border-skin-border">
                                <label className="text-sm font-medium text-skin-muted flex items-center gap-2">
                                     <LinkIcon size={16} />
                                     لینک دکمه (اختیاری)
                                </label>
                                <input 
                                    className="w-full p-3 bg-skin-control-bg border border-skin-border rounded-lg focus:border-skin-primary outline-none dir-ltr text-left"
                                    value={bannerForm.link || ''}
                                    onChange={e => setBannerForm({...bannerForm, link: e.target.value})}
                                    placeholder="https://..."
                                />
                            </div>
                        </>
                    )}

                    {/* Cover Image (Common) */}
                    <div className="space-y-2 pt-4 border-t border-skin-border">
                        <label className="text-sm font-medium text-skin-muted flex items-center gap-2">
                             <ImageIcon size={16} />
                             {activeTab === 'banners' ? (bannerForm.type === 'text' ? 'تصویر کنار متن' : 'تصویر کامل بنر') : 'تصویر کاور'}
                        </label>
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                             <div className="w-32 h-20 bg-gray-100 border border-dashed border-gray-400 rounded-lg flex items-center justify-center overflow-hidden shrink-0 relative">
                                {(activeTab === 'catalogs' ? catalogForm.coverImage : activeTab === 'videos' ? videoForm.coverImage : bannerForm.imageUrl) ? (
                                    <img src={activeTab === 'catalogs' ? catalogForm.coverImage : activeTab === 'videos' ? videoForm.coverImage : bannerForm.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-gray-400">بدون تصویر</span>
                                )}
                             </div>
                             <div className="flex-grow space-y-3 w-full">
                                <div className="flex gap-2">
                                     <input 
                                        className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg dir-ltr"
                                        value={activeTab === 'catalogs' ? catalogForm.coverImage || '' : activeTab === 'videos' ? videoForm.coverImage || '' : bannerForm.imageUrl || ''}
                                        onChange={e => activeTab === 'catalogs' ? setCatalogForm({...catalogForm, coverImage: e.target.value}) : activeTab === 'videos' ? setVideoForm({...videoForm, coverImage: e.target.value}) : setBannerForm({...bannerForm, imageUrl: e.target.value})}
                                        placeholder="URL تصویر (مثلا https://...)"
                                    />
                                    <label className="flex items-center justify-center gap-2 bg-skin-control-bg hover:bg-skin-control-hover border border-skin-border text-skin-text py-2 px-4 rounded-lg cursor-pointer transition-colors w-auto text-sm shrink-0">
                                        <Upload size={16} />
                                        <span className="hidden sm:inline">آپلود</span>
                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'cover', activeTab)} />
                                    </label>
                                </div>
                                <p className="text-[10px] text-skin-muted">
                                    پیشنهاد: برای سرعت بالاتر سایت، بهتر است لینک تصویر را وارد کنید.
                                </p>
                             </div>
                        </div>
                    </div>

                    {activeTab === 'banners' && (
                        <div className="space-y-2 pt-4 border-t border-skin-border">
                            <label className="text-sm font-medium text-skin-muted flex items-center gap-2">
                                 <ImageIcon size={16} />
                                 {bannerForm.type === 'text' ? 'تصویر موبایل (اختیاری)' : 'تصویر کامل بنر در موبایل'}
                            </label>
                            <div className="flex flex-col md:flex-row gap-4 items-start">
                                 <div className="w-32 h-20 bg-gray-100 border border-dashed border-gray-400 rounded-lg flex items-center justify-center overflow-hidden shrink-0 relative">
                                    {bannerForm.mobileImageUrl ? (
                                        <img src={bannerForm.mobileImageUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-gray-400">بدون تصویر</span>
                                    )}
                                 </div>
                                 <div className="flex-grow space-y-3 w-full">
                                    <div className="flex gap-2">
                                         <input 
                                            className="w-full p-2 text-sm bg-skin-control-bg border border-skin-border rounded-lg dir-ltr"
                                            value={bannerForm.mobileImageUrl || ''}
                                            onChange={e => setBannerForm({...bannerForm, mobileImageUrl: e.target.value})}
                                            placeholder="URL تصویر (مثلا https://...)"
                                        />
                                        <label className="flex items-center justify-center gap-2 bg-skin-control-bg hover:bg-skin-control-hover border border-skin-border text-skin-text py-2 px-4 rounded-lg cursor-pointer transition-colors w-auto text-sm shrink-0">
                                            <Upload size={16} />
                                            <span className="hidden sm:inline">آپلود</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'mobileCover', activeTab)} />
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-skin-muted">
                                        تصویری که در سایزهای کوچک (گوشی موبایل) نمایش داده می‌شود.
                                    </p>
                                 </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-skin-border flex justify-end gap-3 sticky bottom-0 bg-skin-card p-4 -mx-6 -mb-6 md:-mx-8 md:-mb-8 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <button type="button" onClick={resetForms} className="px-6 py-2.5 rounded-lg border border-skin-border text-skin-muted hover:bg-skin-control-bg transition-colors">انصراف</button>
                        <button type="submit" className="px-8 py-2.5 rounded-lg bg-skin-primary hover:bg-skin-primary-hover text-white font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2">
                            <Save size={18} />
                            ذخیره تغییرات
                        </button>
                    </div>
                </form>
            </div>
        )}
      </main>
    </div>
  );
};

const PlayCircleIcon = () => (
    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40">
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5"><path d="M8 5v14l11-7z"/></svg>
    </div>
);

export default AdminPanel;