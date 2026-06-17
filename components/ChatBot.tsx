import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  MessageCircle, Send, X, Bot, Loader2, Sparkles, User, Package,
  ChevronLeft, ArrowRight, Building2, Activity, Headphones, CheckCircle,
  Phone, FileText, ThumbsUp, ThumbsDown, Copy, Check, Star
} from 'lucide-react';

const API_URL = './chat.php';
const SUBMIT_API_URL = './submit_form.php';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: 1 | -1 | null;
  suggestions?: string[];
  isNew?: boolean;
}

type ChatView = 'menu' | 'products' | 'chat' | 'adr_select' | 'adr_form' | 'consult_form' | 'success' | 'csat';

interface ProductItem { id: string; name: string; description?: string; }

// ─── Data ─────────────────────────────────────────────────────────────────────
const PRODUCTS: ProductItem[] = [
  { id: 'capsulizer',  name: 'کپسولایزر',     description: 'مکمل تغذیه‌ای کپسول' },
  { id: 'coldanese',   name: 'کلدانیز پلاس',  description: 'سرماخوردگی و ایمنی' },
  { id: 'folinozit',   name: 'فولینوزیت',     description: 'اسید فولیک و زینک' },
  { id: 'meglozek',    name: 'مگلوزک',        description: 'دیابت و متابولیسم' },
  { id: 'tiotoriva',   name: 'تیوتوریوا',     description: 'آنتی‌اکسیدان و اعصاب' },
];

const COMPANY: ProductItem = { id: 'nafas', name: 'شرکت نفس زیست فارمد', description: 'شرکت دانش‌بنیان' };

// ─── Markdown rendering ───────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // patterns: **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m: RegExpExecArray | null, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={key++}>{m[3]}</em>);
    else if (m[4] !== undefined) nodes.push(<code key={key++} className="bg-skin-control-bg px-1 rounded text-xs font-mono">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MarkdownBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      result.push(<ul key={key++} className="list-disc list-inside space-y-0.5 my-1 text-sm">{listItems}</ul>);
      listItems = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const content = line.replace(/^#+\s/, '');
      result.push(<p key={key++} className="font-bold text-skin-text mt-1">{renderInline(content)}</p>);
    } else if (/^[-*]\s/.test(line)) {
      const content = line.replace(/^[-*]\s/, '');
      listItems.push(<li key={key++}>{renderInline(content)}</li>);
    } else if (/^>\s/.test(line)) {
      flushList();
      const content = line.replace(/^>\s/, '');
      result.push(
        <blockquote key={key++} className="border-r-2 border-skin-primary pr-2 text-skin-muted text-sm my-1">
          {renderInline(content)}
        </blockquote>
      );
    } else if (line === '') {
      flushList();
    } else {
      flushList();
      result.push(<p key={key++} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    }
  }
  flushList();
  return <div className="space-y-1">{result}</div>;
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function TypewriterMessage({ text, onDone }: { text: string; onDone: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setDisplayed('');
    let i = 0;
    const tick = () => {
      if (doneRef.current) return;
      i = Math.min(i + 3, text.length);
      setDisplayed(text.slice(0, i));
      if (i < text.length) setTimeout(tick, 20);
      else { doneRef.current = true; onDone(); }
    };
    const t = setTimeout(tick, 20);
    return () => { doneRef.current = true; clearTimeout(t); };
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return <MarkdownBlock text={displayed} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen]         = useState(false);
  const [view, setView]             = useState<ChatView>('menu');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [typewriterDone, setTypewriterDone] = useState(true);
  const [hadConversation, setHadConversation] = useState(false);
  const [csatSubmitted, setCSATSubmitted]     = useState(false);
  const [csatRating, setCSATRating]           = useState(0);
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const [proactiveVisible, setProactiveVisible] = useState(false);
  const [honeypot, setHoneypot]     = useState('');

  const [formData, setFormData] = useState({ name: '', phone: '', description: '', productName: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // Proactive bubble — show once per session after 6 s
  useEffect(() => {
    if (sessionStorage.getItem('nfx_proactive_done')) return;
    const t = setTimeout(() => {
      if (!isOpen) setProactiveVisible(true);
    }, 6000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissProactive = () => {
    setProactiveVisible(false);
    sessionStorage.setItem('nfx_proactive_done', '1');
  };

  const openChat = () => {
    dismissProactive();
    setIsOpen(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    setHoneypot('');
    setTypewriterDone(true);
    setView('menu');
  };

  const handleBack = () => {
    if (view === 'success') { resetChat(); return; }
    if (view === 'adr_form') { setView('adr_select'); return; }
    if (view === 'chat' && hadConversation && !csatSubmitted) {
      setView('csat');
      return;
    }
    setView('menu');
  };

  // Build history for Gemini multi-turn (last 10 turns, skip welcome)
  const buildHistory = useCallback((msgs: Message[]) => {
    return msgs
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content }));
  }, []);

  const startChat = (product: ProductItem) => {
    setSelectedProduct(product);
    setHadConversation(false);
    setCSATSubmitted(false);
    setCSATRating(0);
    const welcome: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `سلام! من دستیار هوشمند **${product.name}** هستم. هر سوالی داشتید بپرسید.`,
    };
    setMessages([welcome]);
    setView('chat');
  };

  const handleOptionSelect = (option: 'company' | 'products' | 'adr' | 'consult') => {
    if (option === 'company') startChat(COMPANY);
    else if (option === 'products') setView('products');
    else if (option === 'adr') setView('adr_select');
    else setView('consult_form');
  };

  const handleProductSelect = (p: ProductItem) => startChat(p);

  const handleAdrProductSelect = (p: ProductItem) => {
    setFormData(prev => ({ ...prev, productName: p.name }));
    setView('adr_form');
  };

  const handleQuickReply = (suggestion: string) => {
    if (isLoading || !typewriterDone) return;
    sendMessage(suggestion);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !selectedProduct) return;

    const history = buildHistory(messages);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setTypewriterDone(false);
    setHadConversation(true);

    try {
      const body = new URLSearchParams();
      body.append('message', text);
      body.append('product', selectedProduct.id);
      body.append('history', JSON.stringify(history));

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Form-Token': import.meta.env.VITE_CHAT_FORM_TOKEN || '',
        },
        body,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'متاسفانه پاسخی دریافت نشد.',
        suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [],
        feedback: null,
        isNew: true,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setTypewriterDone(true);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleFeedback = (msgId: string, val: 1 | -1) => {
    setMessages(prev =>
      prev.map(m => m.id === msgId ? { ...m, feedback: m.feedback === val ? null : val } : m)
    );
  };

  const handleCopy = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // spam trap
    setIsLoading(true);
    try {
      const body = new URLSearchParams();
      body.append('type', view === 'adr_form' ? 'گزارش عوارض دارویی' : 'درخواست مشاوره');
      body.append('name', formData.name);
      body.append('phone', formData.phone);
      body.append('description', formData.description);
      if (view === 'adr_form') body.append('product', formData.productName);

      const res = await fetch(SUBMIT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Form-Token': import.meta.env.VITE_CHAT_FORM_TOKEN || '',
        },
        body,
      });
      if (!res.ok) {
        let msg = 'مشکلی در ارتباط با سرور رخ داد';
        try { const d = await res.json(); if (d?.message) msg = d.message; } catch {}
        throw new Error(msg);
      }
      setView('success');
    } catch (err: any) {
      toast.error(err.message || 'در ثبت اطلاعات مشکلی پیش آمد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSATSubmit = () => {
    setCSATSubmitted(true);
    setView('menu');
    if (csatRating > 0) toast.success('ممنون از بازخورد شما!');
  };

  const getHeaderTitle = () => {
    if (view === 'menu' || view === 'csat') return 'دستیار هوشمند';
    if (view === 'products') return 'انتخاب محصول';
    if (view === 'adr_select') return 'انتخاب دارو';
    if (view === 'adr_form') return 'ثبت عوارض';
    if (view === 'consult_form') return 'درخواست مشاوره';
    if (view === 'success') return 'تکمیل عملیات';
    return selectedProduct?.name || 'دستیار هوشمند';
  };

  const getSubHeader = () => {
    if (view === 'chat') return 'متصل به پایگاه دانش';
    if (view === 'adr_form' || view === 'consult_form') return 'اطلاعات خود را وارد کنید';
    return 'آنلاین';
  };

  const showBack = view !== 'menu';

  return (
    <>
      {/* Proactive bubble */}
      {proactiveVisible && (
        <div className="fixed bottom-24 right-6 z-40 flex items-end gap-2 animate-fade-in">
          <div className="bg-skin-card border border-skin-border rounded-2xl rounded-br-none shadow-lg p-3 max-w-[200px] text-sm text-skin-text">
            سلام! سوالی دارید؟ می‌تونم کمک کنم 😊
            <button onClick={dismissProactive} className="absolute -top-2 -left-2 bg-skin-muted/20 rounded-full p-0.5 hover:bg-skin-muted/40">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => isOpen ? setIsOpen(false) : openChat()}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-skin-card text-skin-text rotate-90' : 'bg-skin-primary text-white'}`}
        style={{ boxShadow: '0 10px 30px -10px rgba(182,22,21,0.5)' }}
      >
        {isOpen ? <X size={28} /> : (
          <>
            <MessageCircle size={28} className="absolute inset-0 m-auto animate-ping opacity-20" />
            <MessageCircle size={28} />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          </>
        )}
      </button>

      {/* Chat window */}
      <div
        className={`fixed bottom-24 right-4 sm:right-6 w-[calc(100%-2rem)] sm:w-96 bg-skin-card rounded-3xl shadow-2xl border border-skin-border flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right z-40 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none'}`}
        style={{ height: 'min(600px, 80vh)' }}
      >
        {/* Header */}
        <div className="bg-skin-primary text-white p-4 flex items-center gap-3 shadow-md relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
          {showBack && (
            <button onClick={handleBack} className="relative z-10 p-1.5 rounded-full hover:bg-white/20 transition-colors -mr-2">
              <ArrowRight size={20} />
            </button>
          )}
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm relative z-10">
            {view === 'consult_form' ? <Headphones size={24} /> :
             view === 'adr_form' || view === 'adr_select' ? <Activity size={24} /> :
             <Bot size={24} />}
          </div>
          <div className="relative z-10 overflow-hidden">
            <h3 className="font-bold text-lg leading-tight truncate max-w-[180px]">{getHeaderTitle()}</h3>
            <p className="text-[10px] text-white/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {getSubHeader()}
            </p>
          </div>
          <Sparkles className="absolute top-2 left-2 text-white/10 w-24 h-24 -rotate-12" />
        </div>

        {/* ── MENU ── */}
        {view === 'menu' && (
          <div className="flex-grow overflow-y-auto p-4 bg-skin-base/50 scrollbar-hide flex flex-col">
            <div className="text-center mb-6 mt-2">
              <div className="w-16 h-16 bg-skin-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-skin-primary">
                <Bot size={32} />
              </div>
              <p className="text-skin-text font-bold mb-1">سلام! 👋</p>
              <p className="text-skin-muted text-sm">به پورتال پشتیبانی نفس فارمد خوش آمدید.<br />چطور می‌تونم کمکتون کنم؟</p>
            </div>
            <div className="space-y-3 mt-auto mb-4">
              <MenuButton icon={<Building2 size={22} />} color="blue" title="سوال در مورد شرکت" sub="تاریخچه، خط مشی و اطلاعات تماس" onClick={() => handleOptionSelect('company')} />
              <MenuButton icon={<Package size={22} />} color="green" title="سوال در مورد محصولات" sub="اطلاعات دارویی، نحوه مصرف و عوارض" onClick={() => handleOptionSelect('products')} />
              <div className="grid grid-cols-2 gap-3">
                <SmallMenuButton icon={<Activity size={20} />} color="red" label="ثبت عوارض" onClick={() => handleOptionSelect('adr')} />
                <SmallMenuButton icon={<Headphones size={20} />} color="purple" label="درخواست مشاوره" onClick={() => handleOptionSelect('consult')} />
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCT/ADR SELECT ── */}
        {(view === 'products' || view === 'adr_select') && (
          <div className="flex-grow overflow-y-auto p-4 bg-skin-base/50 scrollbar-hide">
            <p className="text-skin-text text-sm mb-4 font-medium text-center bg-skin-control-bg/50 py-2 rounded-lg">
              {view === 'products' ? 'محصولی که درباره آن سوال دارید را انتخاب کنید:' : 'دارویی که باعث عارضه شده را انتخاب کنید:'}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => view === 'products' ? handleProductSelect(p) : handleAdrProductSelect(p)}
                  className="flex items-center gap-3 p-3 bg-skin-card hover:bg-skin-control-bg border border-skin-border rounded-xl transition-all hover:translate-x-[-4px] group text-right"
                >
                  <div className="bg-skin-primary/10 text-skin-primary p-2 rounded-lg group-hover:bg-skin-primary group-hover:text-white transition-colors">
                    <Package size={20} />
                  </div>
                  <div className="flex-grow text-right">
                    <span className="block text-sm font-bold text-skin-text">{p.name}</span>
                    {p.description && <span className="block text-[10px] text-skin-muted">{p.description}</span>}
                  </div>
                  <ChevronLeft size={16} className="text-skin-muted" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FORMS ── */}
        {(view === 'adr_form' || view === 'consult_form') && (
          <div className="flex-grow overflow-y-auto bg-skin-base/50 scrollbar-hide flex flex-col">
            {view === 'adr_form' && (
              <div className="bg-red-50 text-red-800 text-xs p-3 text-center border-b border-red-100">
                در حال ثبت گزارش عارضه برای داروی <b>{formData.productName}</b>
              </div>
            )}
            <form onSubmit={handleFormSubmit} className="p-4 space-y-4">
              {/* honeypot — hidden from real users */}
              <input
                aria-hidden="true"
                tabIndex={-1}
                autoComplete="off"
                style={{ display: 'none' }}
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
              />
              <FormField icon={<User size={14} />} label="نام و نام خانوادگی">
                <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-skin-card border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all"
                  placeholder="مثلاً: علی احمدی" />
              </FormField>
              <FormField icon={<Phone size={14} />} label="شماره تماس">
                <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 bg-skin-card border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all text-left"
                  style={{ direction: 'ltr' }} placeholder="0912..." />
              </FormField>
              <FormField icon={<FileText size={14} />} label={view === 'adr_form' ? 'شرح عارضه مشاهده شده' : 'موضوع و خلاصه درخواست'}>
                <textarea required rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-skin-card border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all resize-none"
                  placeholder={view === 'adr_form' ? 'علائم و مشکلاتی که پس از مصرف دارو پیش آمد را بنویسید...' : 'در چه موردی نیاز به مشاوره دارید...'} />
              </FormField>
              <button type="submit" disabled={isLoading}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${view === 'adr_form' ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                {view === 'adr_form' ? 'ثبت گزارش عوارض' : 'ثبت درخواست مشاوره'}
              </button>
            </form>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {view === 'success' && (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-skin-base/50">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-bold text-skin-text mb-2">ثبت موفقیت‌آمیز</h3>
            <p className="text-skin-muted text-sm leading-relaxed mb-8">اطلاعات شما با موفقیت ثبت شد.<br />کارشناسان در اسرع وقت تماس خواهند گرفت.</p>
            <button onClick={resetChat} className="px-8 py-2.5 bg-skin-card border border-skin-border hover:bg-skin-control-bg text-skin-text rounded-xl transition-colors font-medium text-sm">
              بازگشت به منوی اصلی
            </button>
          </div>
        )}

        {/* ── CSAT ── */}
        {view === 'csat' && (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-skin-base/50 gap-4">
            <div className="w-16 h-16 bg-skin-primary/10 text-skin-primary rounded-full flex items-center justify-center">
              <Star size={32} />
            </div>
            <h3 className="text-lg font-bold text-skin-text">تجربه شما چطور بود؟</h3>
            <p className="text-skin-muted text-sm">بازخورد شما کمک می‌کند خدماتمان را بهبود دهیم.</p>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setCSATRating(n)}
                  className={`transition-transform hover:scale-125 ${n <= csatRating ? 'text-yellow-400' : 'text-skin-muted/30'}`}>
                  <Star size={32} fill={n <= csatRating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setView('menu')} className="px-4 py-2 text-sm text-skin-muted hover:text-skin-text border border-skin-border rounded-xl">
                رد کردن
              </button>
              <button onClick={handleCSATSubmit} className="px-6 py-2 text-sm bg-skin-primary text-white rounded-xl font-bold hover:opacity-90">
                ارسال
              </button>
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {view === 'chat' && (
          <>
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-skin-base/50 scrollbar-hide">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-skin-control-bg text-skin-text' : 'bg-skin-primary/10 text-skin-primary'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-skin-primary text-white rounded-br-none shadow-md shadow-skin-primary/20' : 'bg-skin-card border border-skin-border text-skin-text rounded-bl-none shadow-sm'}`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : msg.isNew ? (
                        <TypewriterMessage text={msg.content} onDone={() => {
                          setTypewriterDone(true);
                          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isNew: false } : m));
                        }} />
                      ) : (
                        <MarkdownBlock text={msg.content} />
                      )}
                    </div>
                  </div>

                  {/* Assistant action bar */}
                  {msg.role === 'assistant' && msg.id !== 'welcome' && !msg.isNew && (
                    <div className="flex items-center gap-2 mt-1 mr-10">
                      <button onClick={() => handleFeedback(msg.id, 1)}
                        className={`p-1 rounded transition-colors ${msg.feedback === 1 ? 'text-green-600' : 'text-skin-muted hover:text-green-600'}`} title="مفید بود">
                        <ThumbsUp size={14} />
                      </button>
                      <button onClick={() => handleFeedback(msg.id, -1)}
                        className={`p-1 rounded transition-colors ${msg.feedback === -1 ? 'text-red-600' : 'text-skin-muted hover:text-red-600'}`} title="مفید نبود">
                        <ThumbsDown size={14} />
                      </button>
                      <button onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded text-skin-muted hover:text-skin-text transition-colors" title="کپی">
                        {copiedId === msg.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  {/* Suggestion pills */}
                  {msg.role === 'assistant' && !msg.isNew && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 mr-10">
                      {msg.suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleQuickReply(s)}
                          disabled={isLoading || !typewriterDone}
                          className="text-xs px-3 py-1.5 bg-skin-primary/10 text-skin-primary border border-skin-primary/20 rounded-full hover:bg-skin-primary hover:text-white transition-colors disabled:opacity-40">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-full bg-skin-primary/10 text-skin-primary flex items-center justify-center flex-shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-skin-card border border-skin-border p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce" />
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
                  onChange={e => setInput(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  className="flex-grow bg-transparent border-none outline-none text-sm text-skin-text placeholder-skin-muted"
                  disabled={isLoading || !typewriterDone}
                />
                <button type="submit" disabled={!input.trim() || isLoading || !typewriterDone}
                  className="p-2 bg-skin-primary text-white rounded-full hover:bg-skin-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="text-[10px] text-center text-skin-muted mt-2">هوش مصنوعی ممکن است اشتباه کند.</p>
            </form>
          </>
        )}
      </div>
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function MenuButton({ icon, color, title, sub, onClick }: {
  icon: React.ReactNode; color: string; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 bg-skin-card hover:bg-skin-control-bg border border-skin-border rounded-xl transition-all shadow-sm hover:translate-y-[-2px] group text-right">
      <div className={`bg-${color}-50 text-${color}-600 p-2.5 rounded-lg group-hover:bg-${color}-600 group-hover:text-white transition-colors`}>{icon}</div>
      <div className="flex-grow">
        <span className="block font-bold text-skin-text text-sm mb-0.5">{title}</span>
        <span className="block text-[10px] text-skin-muted">{sub}</span>
      </div>
      <ChevronLeft size={18} className="text-skin-muted" />
    </button>
  );
}

function SmallMenuButton({ icon, color, label, onClick }: {
  icon: React.ReactNode; color: string; label: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`w-full flex flex-col items-center justify-center gap-2 p-3 bg-skin-card hover:bg-${color}-50 border border-skin-border rounded-xl transition-all shadow-sm hover:translate-y-[-2px] group text-center`}>
      <div className={`bg-${color}-50 text-${color}-600 p-2 rounded-lg group-hover:bg-${color}-600 group-hover:text-white transition-colors`}>{icon}</div>
      <span className="font-bold text-skin-text text-xs">{label}</span>
    </button>
  );
}

function FormField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-skin-muted flex items-center gap-1">{icon}{label}</label>
      {children}
    </div>
  );
}

export default ChatBot;
