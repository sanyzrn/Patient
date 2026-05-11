import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { MessageCircle, Send, X, Bot, Loader2, Sparkles, User, Package, ChevronLeft, ArrowRight, Building2, Activity, Headphones, CheckCircle, AlertTriangle, Phone, FileText } from 'lucide-react';

const API_URL = './chat.php'; // آدرس فایل چت هوش مصنوعی
const SUBMIT_API_URL = './submit_form.php'; // آدرس فایل ثبت فرم‌ها

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type ChatView = 'menu' | 'products' | 'chat' | 'adr_select' | 'adr_form' | 'consult_form' | 'success';

const PRODUCTS = [
    { id: 'capsulizer', name: 'کپسولایزر' },
    { id: 'coldanese', name: 'کلدانیز پلاس' },
    { id: 'folinozit', name: 'فولینوزیت' },
    { id: 'meglozek', name: 'مگلوزک' },
    { id: 'tiotoriva', name: 'تیوتوریوا' },
];

const COMPANY_INFO = { id: 'nafas', name: 'شرکت نفس زیست فارمد' };

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ChatView>('menu');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
      name: '',
      phone: '',
      description: '',
      productName: ''
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, view]);

  useEffect(() => {
    if (isOpen && view === 'chat' && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, view]);

  const resetChat = () => {
      setSelectedProduct(null);
      setMessages([]);
      setInput('');
      setFormData({ name: '', phone: '', description: '', productName: '' });
      setView('menu');
  };

  const handleOptionSelect = (option: 'company' | 'products' | 'adr' | 'consult') => {
      if (option === 'company') {
          setSelectedProduct(COMPANY_INFO.id);
          setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: `سلام! من آماده پاسخگویی به سوالات شما درباره **${COMPANY_INFO.name}** هستم.`
          }]);
          setView('chat');
      } else if (option === 'products') {
          setView('products');
      } else if (option === 'adr') {
          setView('adr_select');
      } else if (option === 'consult') {
          setView('consult_form');
      }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    const productName = PRODUCTS.find(p => p.id === productId)?.name;
    setMessages([
        {
            id: 'welcome',
            role: 'assistant',
            content: `سلام! من دستیار هوشمند محصول **${productName}** هستم. هر سوالی در مورد این دارو دارید بپرسید.`
        }
    ]);
    setView('chat');
  };

  const handleAdrProductSelect = (productId: string) => {
      const product = PRODUCTS.find(p => p.id === productId);
      setFormData(prev => ({ ...prev, productName: product?.name || '' }));
      setView('adr_form');
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedProduct) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const body = new URLSearchParams();
      body.append('message', userMsg.content);
      body.append('product', selectedProduct);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body,
      });

      if (!response.ok) {
        let errorMsg = 'Network response was not ok';
        try {
            const text = await response.text();
            if (text) errorMsg = text;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const text = await response.text();
      
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: text || 'متاسفانه مشکلی در دریافت پاسخ پیش آمد.' 
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: 'خطا در ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.' 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        const body = new URLSearchParams();
        // تعیین نوع فرم
        const formType = view === 'adr_form' ? 'گزارش عوارض دارویی' : 'درخواست مشاوره';
        body.append('type', formType);
        
        // اطلاعات مشترک
        body.append('name', formData.name);
        body.append('phone', formData.phone);
        body.append('description', formData.description);
        
        // محصول (فقط برای عوارض)
        if (view === 'adr_form') {
            body.append('product', formData.productName);
        }

        const response = await fetch(SUBMIT_API_URL, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body,
        });

        if (!response.ok) {
            let errorMsg = 'مشکلی در ارتباط با سرور رخ داد';
            try {
                const errData = await response.json();
                if (errData && errData.message) {
                    errorMsg = errData.message;
                }
            } catch (e) {}
            throw new Error(errorMsg);
        }
        
        // موفقیت
        setView('success');

      } catch (error: any) {
        console.error('Form Submit Error:', error);
        toast.error(error.message || 'متاسفانه در ثبت اطلاعات مشکلی پیش آمد. لطفا اتصال اینترنت خود را بررسی کرده و مجددا تلاش کنید.');
      } finally {
        setIsLoading(false);
      }
  };

  const getHeaderTitle = () => {
      if (view === 'menu') return 'دستیار هوشمند';
      if (view === 'products') return 'انتخاب محصول';
      if (view === 'adr_select') return 'انتخاب دارو';
      if (view === 'adr_form') return 'ثبت عوارض';
      if (view === 'consult_form') return 'درخواست مشاوره';
      if (view === 'success') return 'تکمیل عملیات';
      if (selectedProduct === COMPANY_INFO.id) return COMPANY_INFO.name;
      return PRODUCTS.find(p => p.id === selectedProduct)?.name || 'دستیار هوشمند';
  };

  const getSubHeader = () => {
      if (view === 'chat') return 'متصل به پایگاه دانش';
      if (view === 'adr_form' || view === 'consult_form') return 'اطلاعات خود را وارد کنید';
      return 'آنلاین';
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group ${isOpen ? 'bg-skin-card text-skin-text rotate-90' : 'bg-skin-primary text-white'}`}
        style={{ boxShadow: '0 10px 30px -10px rgba(182, 22, 21, 0.5)' }}
      >
        {isOpen ? <X size={28} /> : (
            <>
                <MessageCircle size={28} className="absolute inset-0 m-auto animate-ping opacity-20" />
                <MessageCircle size={28} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            </>
        )}
      </button>

      {/* Chat Window */}
      <div 
        className={`fixed bottom-24 right-4 sm:right-6 w-[calc(100%-2rem)] sm:w-96 bg-skin-card rounded-3xl shadow-2xl border border-skin-border flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right z-40 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none'}`}
        style={{ height: 'min(600px, 80vh)' }}
      >
        {/* Header */}
        <div className="bg-skin-primary text-white p-4 flex items-center gap-3 shadow-md relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
            
            {view !== 'menu' && (
                <button 
                    onClick={() => view === 'success' ? resetChat() : view === 'adr_form' ? setView('adr_select') : setView('menu')} 
                    className="relative z-10 p-1.5 rounded-full hover:bg-white/20 transition-colors -mr-2"
                >
                    <ArrowRight size={20} />
                </button>
            )}

            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm relative z-10">
                {view === 'consult_form' ? <Headphones size={24} /> : 
                 view === 'adr_form' || view === 'adr_select' ? <Activity size={24} /> :
                 <Bot size={24} />}
            </div>
            
            <div className="relative z-10">
                <h3 className="font-bold text-lg leading-tight truncate max-w-[180px]">
                    {getHeaderTitle()}
                </h3>
                <p className="text-[10px] text-white/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    {getSubHeader()}
                </p>
            </div>
            <Sparkles className="absolute top-2 left-2 text-white/10 w-24 h-24 -rotate-12" />
        </div>

        {/* --- MAIN MENU VIEW --- */}
        {view === 'menu' && (
            <div className="flex-grow overflow-y-auto p-4 bg-skin-base/50 scrollbar-hide flex flex-col">
                <div className="text-center mb-6 mt-2">
                    <div className="w-16 h-16 bg-skin-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-skin-primary">
                        <Bot size={32} />
                    </div>
                    <p className="text-skin-text font-bold mb-1">سلام! 👋</p>
                    <p className="text-skin-muted text-sm">به پورتال پشتیبانی نفس فارمد خوش آمدید.<br/>چطور می‌تونم کمکتون کنم؟</p>
                </div>
                
                <div className="space-y-3 mt-auto mb-4">
                    <button 
                        onClick={() => handleOptionSelect('company')}
                        className="w-full flex items-center gap-3 p-4 bg-skin-card hover:bg-skin-control-bg border border-skin-border rounded-xl transition-all shadow-sm hover:translate-y-[-2px] group text-right"
                    >
                        <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Building2 size={22} />
                        </div>
                        <div className="flex-grow">
                            <span className="block font-bold text-skin-text text-sm mb-0.5">سوال در مورد شرکت</span>
                            <span className="block text-[10px] text-skin-muted">تاریخچه، خط مشی و اطلاعات تماس</span>
                        </div>
                        <ChevronLeft size={18} className="text-skin-muted" />
                    </button>

                    <button 
                        onClick={() => handleOptionSelect('products')}
                        className="w-full flex items-center gap-3 p-4 bg-skin-card hover:bg-skin-control-bg border border-skin-border rounded-xl transition-all shadow-sm hover:translate-y-[-2px] group text-right"
                    >
                        <div className="bg-green-50 text-green-600 p-2.5 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <Package size={22} />
                        </div>
                        <div className="flex-grow">
                            <span className="block font-bold text-skin-text text-sm mb-0.5">سوال در مورد محصولات</span>
                            <span className="block text-[10px] text-skin-muted">اطلاعات دارویی، نحوه مصرف و عوارض</span>
                        </div>
                        <ChevronLeft size={18} className="text-skin-muted" />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                         <button 
                            onClick={() => handleOptionSelect('adr')}
                            className="w-full flex flex-col items-center justify-center gap-2 p-3 bg-skin-card hover:bg-red-50 border border-skin-border rounded-xl transition-all shadow-sm hover:translate-y-[-2px] group text-center"
                        >
                            <div className="bg-red-50 text-red-600 p-2 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <Activity size={20} />
                            </div>
                            <span className="font-bold text-skin-text text-xs">ثبت عوارض</span>
                        </button>
                        
                        <button 
                            onClick={() => handleOptionSelect('consult')}
                            className="w-full flex flex-col items-center justify-center gap-2 p-3 bg-skin-card hover:bg-purple-50 border border-skin-border rounded-xl transition-all shadow-sm hover:translate-y-[-2px] group text-center"
                        >
                            <div className="bg-purple-50 text-purple-600 p-2 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Headphones size={20} />
                            </div>
                            <span className="font-bold text-skin-text text-xs">درخواست مشاوره</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- PRODUCT SELECTION VIEWS (Chat & ADR) --- */}
        {(view === 'products' || view === 'adr_select') && (
            <div className="flex-grow overflow-y-auto p-4 bg-skin-base/50 scrollbar-hide">
                <p className="text-skin-text text-sm mb-4 font-medium text-center bg-skin-control-bg/50 py-2 rounded-lg">
                    {view === 'products' 
                        ? 'لطفا محصولی که درباره آن سوال دارید را انتخاب کنید:'
                        : 'لطفا دارویی که باعث عارضه شده است را انتخاب کنید:'
                    }
                </p>
                <div className="grid grid-cols-1 gap-2">
                    {PRODUCTS.map(product => (
                        <button 
                            key={product.id}
                            onClick={() => view === 'products' ? handleProductSelect(product.id) : handleAdrProductSelect(product.id)}
                            className="flex items-center gap-3 p-3 bg-skin-card hover:bg-skin-control-bg border border-skin-border rounded-xl transition-all hover:translate-x-[-4px] group text-right"
                        >
                            <div className="bg-skin-primary/10 text-skin-primary p-2 rounded-lg group-hover:bg-skin-primary group-hover:text-white transition-colors">
                                <Package size={20} />
                            </div>
                            <span className="text-sm font-bold text-skin-text">{product.name}</span>
                            <ChevronLeft size={16} className="mr-auto text-skin-muted" />
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* --- FORMS (ADR & Consultation) --- */}
        {(view === 'adr_form' || view === 'consult_form') && (
            <div className="flex-grow overflow-y-auto bg-skin-base/50 scrollbar-hide flex flex-col">
                {view === 'adr_form' && (
                    <div className="bg-red-50 text-red-800 text-xs p-3 text-center border-b border-red-100">
                        شما در حال ثبت گزارش عارضه برای داروی <b>{formData.productName}</b> هستید.
                    </div>
                )}
                
                <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-skin-muted flex items-center gap-1">
                            <User size={14} /> نام و نام خانوادگی
                        </label>
                        <input 
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full p-3 bg-skin-card border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all"
                            placeholder="مثلا: علی احمدی"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-skin-muted flex items-center gap-1">
                            <Phone size={14} /> شماره تماس
                        </label>
                        <input 
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            className="w-full p-3 bg-skin-card border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all text-left dir-ltr"
                            placeholder="0912..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-skin-muted flex items-center gap-1">
                            <FileText size={14} /> 
                            {view === 'adr_form' ? 'شرح عارضه مشاهده شده' : 'موضوع و خلاصه درخواست'}
                        </label>
                        <textarea 
                            required
                            rows={view === 'adr_form' ? 5 : 4}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full p-3 bg-skin-card border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all resize-none"
                            placeholder={view === 'adr_form' ? 'لطفا علائم و مشکلاتی که پس از مصرف دارو پیش آمد را با جزئیات بنویسید...' : 'لطفا به صورت خلاصه بنویسید که در چه موردی نیاز به مشاوره دارید...'}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mt-4 ${view === 'adr_form' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                        {view === 'adr_form' ? 'ثبت گزارش عوارض' : 'ثبت درخواست مشاوره'}
                    </button>
                </form>
            </div>
        )}

        {/* --- SUCCESS VIEW --- */}
        {view === 'success' && (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-skin-base/50 animate-fade-in">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CheckCircle size={48} />
                </div>
                <h3 className="text-xl font-bold text-skin-text mb-2">ثبت موفقیت‌آمیز</h3>
                <p className="text-skin-muted text-sm leading-relaxed mb-8">
                    اطلاعات شما با موفقیت در سیستم ثبت شد.<br/>
                    کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.
                </p>
                <button 
                    onClick={resetChat}
                    className="px-8 py-2.5 bg-skin-card border border-skin-border hover:bg-skin-control-bg text-skin-text rounded-xl transition-colors font-medium text-sm"
                >
                    بازگشت به منوی اصلی
                </button>
            </div>
        )}

        {/* --- CHAT INTERFACE VIEW --- */}
        {view === 'chat' && (
            <>
                <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-skin-base/50 scrollbar-hide">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-skin-control-bg text-skin-text' : 'bg-skin-primary/10 text-skin-primary'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div 
                                className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-skin-primary text-white rounded-br-none shadow-md shadow-skin-primary/20' 
                                    : 'bg-skin-card border border-skin-border text-skin-text rounded-bl-none shadow-sm'
                                }`}
                            >
                                {msg.content.split('**').map((part, i) => 
                                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2">
                            <div className="w-8 h-8 rounded-full bg-skin-primary/10 text-skin-primary flex items-center justify-center flex-shrink-0">
                                <Bot size={16} />
                            </div>
                            <div className="bg-skin-card border border-skin-border p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleChatSubmit} className="p-3 bg-skin-card border-t border-skin-border">
                    <div className="flex items-center gap-2 bg-skin-control-bg rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-skin-primary/50 transition-all border border-transparent focus-within:border-skin-primary">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="پیام خود را بنویسید..."
                            className="flex-grow bg-transparent border-none outline-none text-sm text-skin-text placeholder-skin-muted"
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading}
                            className="p-2 bg-skin-primary text-white rounded-full hover:bg-skin-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className={input.trim() ? '' : 'opacity-80'} />}
                        </button>
                    </div>
                    <div className="text-[10px] text-center text-skin-muted mt-2">
                        هوش مصنوعی ممکن است اشتباه کند.
                    </div>
                </form>
            </>
        )}
      </div>
    </>
  );
};

export default ChatBot;