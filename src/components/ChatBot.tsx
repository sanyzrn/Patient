import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, X, Send, ChevronRight, Bot, User, AlertTriangle,
  Stethoscope, Building2, Pill, AlertCircle, PhoneCall, ArrowRight,
  Phone, Mail, RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CHAT_URL, SUBMIT_FORM_URL } from '../config';
import { normalizeDigits } from '../utils/helpers';
import { PRODUCTS } from '../constants/products';

// Fix 2.2: COLOR_VARIANTS map to replace dynamic Tailwind classes (Tailwind scanner limitation)
const COLOR_VARIANTS: Record<string, { border: string; bgHover: string; iconBg: string; iconText: string }> = {
  blue:   { border: 'hover:border-blue-400',   bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-950',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600' },
  green:  { border: 'hover:border-green-400',  bgHover: 'hover:bg-green-50 dark:hover:bg-green-950', iconBg: 'bg-green-100',  iconText: 'text-green-600' },
  purple: { border: 'hover:border-purple-400', bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-950',iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
  red:    { border: 'hover:border-red-400',    bgHover: 'hover:bg-red-50 dark:hover:bg-red-950',    iconBg: 'bg-red-100',    iconText: 'text-red-600' },
};

// Products list
// Fix 3.7: PRODUCTS is now imported from constants/products.ts (single source of truth)

type View = 'menu' | 'company' | 'products' | 'chat' | 'adr_select' | 'adr_form' | 'consult_form';

interface Message {
  role: 'user' | 'model';
  content: string;
  suggestions?: string[];
}

interface FormData {
  name: string;
  phone: string;
  description: string;
  productName?: string;
}

// -- Sub-components --
const MenuOption: React.FC<{
  icon: React.ReactNode;
  color: string;
  title?: string;
  sub?: string;
  label?: string;
  onClick: () => void;
}> = ({ icon, color, title, sub, label, onClick }) => {
  const cv = COLOR_VARIANTS[color] ?? COLOR_VARIANTS['blue']!;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border border-skin-border ${cv.border} ${cv.bgHover} transition-all text-right group`}
    >
      <div className={`p-2 rounded-lg ${cv.iconBg} ${cv.iconText} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-skin-text">{title || label}</p>
        {sub && <p className="text-xs text-skin-muted mt-0.5 leading-snug">{sub}</p>}
      </div>
      <ChevronRight size={14} className="text-skin-muted group-hover:text-skin-primary transition-colors shrink-0 rotate-180" />
    </button>
  );
};

const FormField: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="space-y-1">
    <label className="flex items-center gap-1.5 text-xs font-medium text-skin-muted">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

// Markdown renderer (safe) - Fix 4.1: No dangerouslySetInnerHTML
const MarkdownText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const renderLine = (line: string) => {
    const parts = line.split(/(\*\*[^*]*\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };
  
  return (
    <div className="text-sm leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-sm mt-1">{line.slice(3)}</h3>;
        if (line.startsWith('- ')) return (
          <div key={i} className="flex gap-1.5 items-start">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
            <span>{renderLine(line.slice(2))}</span>
          </div>
        );
        if (!line.trim()) return null;
        return <p key={i}>{renderLine(line)}</p>;
      })}
    </div>
  );
};

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<string>('general');
  const [formData, setFormData] = useState<FormData>({ name: '', phone: '', description: '' });
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // REMAINING-07: Load and save chat history from sessionStorage
  useEffect(() => {
    if (isOpen && view === 'chat' && messages.length === 0) {
      const saved = sessionStorage.getItem('nafas_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Message[];
          if (parsed.length > 0) setMessages(parsed);
        } catch (err) {
          console.error('Failed to load chat history:', err);
        }
      }
    }
  }, [isOpen, view]);

  // REMAINING-07: Save chat history whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('nafas_chat_history', JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, view]);

  const getHeaderTitle = () => {
    switch (view) {
      case 'menu': return 'دستیار هوشمند';
      case 'company': return 'اطلاعات شرکت';
      case 'products': return 'محصولات';
      case 'chat': return currentProduct !== 'general' ? PRODUCTS.find(p => p.id === currentProduct)?.name ?? 'گفتگو' : 'گفتگو';
      case 'adr_select': return 'ثبت عوارض';
      case 'adr_form': return 'ثبت عارضه دارویی';
      case 'consult_form': return 'درخواست مشاوره';
      default: return 'دستیار هوشمند';
    }
  };

  const getSubHeader = () => {
    if (view === 'chat') return 'پاسخگویی با هوش مصنوعی';
    return 'نفس زیست فارمد';
  };

  const handleOptionSelect = (option: string) => {
    if (option === 'company') {
      setCurrentProduct('general');
      setMessages([{ role: 'model', content: 'اطلاعات کاملی درباره شرکت نفس زیست فارمد در اختیار شما هستم. چه سوالی دارید؟', suggestions: ['تاریخچه شرکت؟', 'خط تولید چیست؟', 'اطلاعات تماس'] }]);
      setView('chat');
    } else if (option === 'products') {
      setView('products');
    } else if (option === 'adr') {
      setView('adr_select');
    } else if (option === 'consult') {
      setFormData({ name: '', phone: '', description: '', productName: undefined });
      setView('consult_form');
    }
  };

  const handleProductSelect = (productId: string, productName: string, isAdr = false) => {
    if (isAdr) {
      setFormData({ name: '', phone: '', description: '', productName });
      setView('adr_form');
    } else {
      setCurrentProduct(productId);
      setMessages([{ role: 'model', content: `آماده پاسخگویی درباره **${productName}** هستم. چه سوالی دارید؟`, suggestions: [`${productName} چیست؟`, 'نحوه مصرف؟', 'عوارض جانبی؟'] }]);
      setView('chat');
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: text };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const formPayload = new FormData();
      formPayload.append('message', text);
      formPayload.append('product', currentProduct);
      formPayload.append('history', JSON.stringify(history.slice(-10)));

      // Fix 4.2: Remove VITE_ADMIN_PASSWORD from client-side auth
      const res = await fetch(CHAT_URL, { method: 'POST', body: formPayload, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'model', content: json.reply || 'خطا در دریافت پاسخ', suggestions: json.suggestions || [] }]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = err instanceof Error ? err.message : 'خطای نامشخص';
      setMessages(prev => [...prev, { role: 'model', content: `خطا: ${errorMsg}. لطفاً بعداً تلاش کنید.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (type: 'adr' | 'consult') => {
    // BUG-V4-09: Honeypot check - silently succeed to not reveal the mechanism
    if (honeypot) {
      // Pretend success to not reveal the mechanism
      toast.success('اطلاعات با موفقیت ثبت شد.');
      setView('menu');
      setFormData({ name: '', phone: '', description: '' });
      setHoneypot('');
      return;
    }
    if (!formData.name.trim() || !formData.phone.trim() || !formData.description.trim()) {
      toast.error('لطفاً تمام فیلدها را پر کنید.');
      return;
    }
    const phoneNorm = normalizeDigits(formData.phone);
    if (!/^((\+98|0)?9\d{9})$/.test(phoneNorm)) {
      toast.error('شماره موبایل نامعتبر است.');
      return;
    }
    if (formData.description.length < 10) {
      toast.error('توضیحات باید حداقل ۱۰ کاراکتر باشد.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('type', type === 'adr' ? 'ثبت عارضه دارویی' : 'درخواست مشاوره');
      payload.append('name', formData.name.trim());
      payload.append('phone', phoneNorm);
      payload.append('description', formData.description.trim());
      if (formData.productName) payload.append('product', formData.productName);

      // Fix 4.2: Remove VITE_ADMIN_PASSWORD from client - use CSRF token from server instead
      const res = await fetch(SUBMIT_FORM_URL, { method: 'POST', body: payload, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.status === 'success') {
        toast.success('اطلاعات با موفقیت ثبت شد.');
        setView('menu');
        setFormData({ name: '', phone: '', description: '' });
      } else {
        toast.error(json.message || 'خطا در ثبت اطلاعات.');
      }
    } catch (err) {
      console.error('Form submit error:', err);
      toast.error('ارتباط با سرور برقرار نشد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showBack = view !== 'menu';
  const goBack = () => {
    if (view === 'chat') setView(currentProduct === 'general' ? 'menu' : 'products');
    else if (view === 'adr_form') setView('adr_select');
    else setView('menu');
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-skin-primary text-white shadow-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary focus-visible:ring-offset-2"
        aria-label={isOpen ? 'بستن دستیار' : 'باز کردن دستیار'}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 left-6 z-40 w-[340px] max-w-[calc(100vw-24px)] bg-skin-card border border-skin-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'min(560px, calc(100vh - 120px))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-skin-primary text-white shrink-0">
              {showBack && (
                <button onClick={goBack} className="p-1 rounded-lg hover:bg-white/20 transition-colors" aria-label="برگشت">
                  <ArrowRight size={16} />
                </button>
              )}
              <div className={`p-1.5 rounded-lg ${showBack ? 'bg-white/20' : 'bg-white/20'}`}>
                {view === 'consult_form' ? <PhoneCall size={16} /> :
                 view === 'adr_form' || view === 'adr_select' ? <AlertCircle size={16} /> :
                 <Bot size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{getHeaderTitle()}</p>
                <p className="text-[11px] text-white/70">{getSubHeader()}</p>
              </div>
              {/* REMAINING-07: Clear history button in chat view */}
              {view === 'chat' && (
                <button
                  onClick={() => {
                    setMessages([]);
                    sessionStorage.removeItem('nafas_chat_history');
                  }}
                  className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                  title="پاک کردن تاریخچه"
                  aria-label="پاک کردن تاریخچه"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors" aria-label="بستن">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* MENU */}
              {view === 'menu' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-skin-control-bg rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-skin-primary/10 flex items-center justify-center text-skin-primary shrink-0">
                      <Bot size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-skin-text text-sm">سلام! 👋</p>
                      <p className="text-xs text-skin-muted">به پورتال پشتیبانی نفس فارمد خوش آمدید. چطور می‌تونم کمکتون کنم؟</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <MenuOption icon={<Building2 size={16} />} color="blue" title="سوال در مورد شرکت" sub="تاریخچه، خط مشی و اطلاعات تماس" onClick={() => handleOptionSelect('company')} />
                    <MenuOption icon={<Pill size={16} />} color="green" title="سوال در مورد محصولات" sub="اطلاعات دارویی، نحوه مصرف و عوارض" onClick={() => handleOptionSelect('products')} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MenuOption icon={<AlertTriangle size={16} />} color="red" label="ثبت عوارض" onClick={() => handleOptionSelect('adr')} />
                    <MenuOption icon={<Stethoscope size={16} />} color="purple" label="درخواست مشاوره" onClick={() => handleOptionSelect('consult')} />
                  </div>
                </div>
              )}

              {/* PRODUCTS / ADR SELECT */}
              {(view === 'products' || view === 'adr_select') && (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-skin-muted font-medium">
                    {view === 'products' ? 'محصولی که درباره آن سوال دارید:' : 'دارویی که باعث عارضه شده:'}
                  </p>
                  <div className="space-y-2">
                    {PRODUCTS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleProductSelect(p.id, p.name, view === 'adr_select')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-skin-border hover:border-skin-primary/40 hover:bg-skin-primary/5 transition-all text-right"
                      >
                        <Pill size={16} className="text-skin-primary shrink-0" />
                        <span className="flex-1 text-sm font-medium text-skin-text">{p.name}</span>
                        <ChevronRight size={14} className="text-skin-muted rotate-180 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CHAT */}
              {view === 'chat' && (
                <div className="p-4 space-y-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-skin-primary text-white' : 'bg-skin-control-bg text-skin-primary'}`}>
                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                      </div>
                      <div className={`flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`rounded-2xl px-3 py-2 max-w-[90%] ${msg.role === 'user' ? 'bg-skin-primary text-white rounded-tr-sm' : 'bg-skin-control-bg text-skin-text rounded-tl-sm'}`}>
                          {msg.role === 'model' ? <MarkdownText text={msg.content} /> : <p className="text-sm">{msg.content}</p>}
                        </div>
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {msg.suggestions.map((s, si) => (
                              <button key={si} onClick={() => sendMessage(s)} className="text-[11px] px-2 py-1 bg-skin-primary/10 text-skin-primary rounded-full hover:bg-skin-primary/20 transition-colors border border-skin-primary/20">
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-skin-control-bg flex items-center justify-center shrink-0">
                        <Bot size={12} className="text-skin-primary animate-pulse" />
                      </div>
                      <div className="bg-skin-control-bg rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* FORMS */}
              {(view === 'adr_form' || view === 'consult_form') && (
                <div className="p-4 space-y-3">
                  {view === 'adr_form' && formData.productName && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-2">
                      <AlertTriangle size={12} className="shrink-0" />
                      <span>در حال ثبت گزارش عارضه برای داروی {formData.productName}</span>
                    </div>
                  )}

                  {/* honeypot */}
                  <input type="text" name="_hp" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" tabIndex={-1} aria-hidden="true" />

                  <FormField icon={<User size={12} />} label="نام و نام خانوادگی">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-2.5 bg-skin-control-bg border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all"
                      placeholder="مثلاً: علی احمدی"
                    />
                  </FormField>

                  <FormField icon={<Phone size={12} />} label="شماره تماس">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2.5 bg-skin-control-bg border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all text-left"
                      dir="ltr"
                      placeholder="0912..."
                    />
                  </FormField>

                  <FormField icon={<MessageSquare size={12} />} label={view === 'adr_form' ? 'شرح عارضه مشاهده شده' : 'موضوع و خلاصه درخواست'}>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full p-2.5 bg-skin-control-bg border border-skin-border rounded-xl text-sm focus:border-skin-primary focus:ring-1 focus:ring-skin-primary outline-none transition-all resize-none"
                      placeholder={view === 'adr_form' ? 'عارضه را توصیف کنید...' : 'درخواست خود را بنویسید...'}
                    />
                  </FormField>

                  <button
                    onClick={() => handleFormSubmit(view === 'adr_form' ? 'adr' : 'consult')}
                    disabled={isSubmitting}
                    className="w-full bg-skin-primary hover:bg-skin-primary-hover text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <><RotateCcw size={14} className="animate-spin" /> در حال ارسال...</>
                    ) : (
                      <><Send size={14} /> ارسال</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Input (chat only) */}
            {view === 'chat' && (
              <div className="shrink-0 px-3 py-3 border-t border-skin-border bg-skin-card">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="سوال خود را بنویسید..."
                    disabled={isLoading}
                    className="flex-1 bg-skin-control-bg border border-skin-border rounded-xl px-3 py-2 text-sm outline-none focus:border-skin-primary focus:ring-1 focus:ring-skin-primary transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="w-9 h-9 bg-skin-primary hover:bg-skin-primary-hover text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="ارسال"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
