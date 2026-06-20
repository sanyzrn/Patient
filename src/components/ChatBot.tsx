import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, ArrowRight, MessageCircle, Building2, BookMarked,
  AlertTriangle, Headphones, ThumbsUp, ThumbsDown, Loader2, Star,
  Mic, Home, Info, Phone
} from 'lucide-react';
import { WP_AJAX_URL } from '../config';
import { PRODUCTS } from '../constants/products';

interface ChatBotProps {
  open: boolean;
  onClose: () => void;
}

type View = 'menu' | 'products' | 'chat' | 'adr' | 'consult' | 'success' | 'csat' | 'about';

// Quick-reply prompts shown when chatting about a specific product
// (mirrors the WordPress plugin defaults).
const QUICK_REPLIES = [
  'نحوه مصرف صحیح این محصول چگونه است؟',
  'عوارض جانبی شایع این محصول چیست؟',
  'این محصول با چه داروها یا غذاهایی تداخل دارد؟',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isNew?: boolean;
  feedback?: 1 | 5 | null;
  logId?: number;
  suggestions?: string[];
}

// ── WordPress admin-ajax helper (form-encoded = no CORS preflight) ────────────
async function wpAjax(action: string, params: Record<string, string>): Promise<{ success: boolean; data: any }> {
  const body = new URLSearchParams({ action, ...params });
  const res = await fetch(WP_AJAX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  return res.json();
}

// ── Minimal, safe inline markdown (no dangerouslySetInnerHTML) ────────────────
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2]) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3]) nodes.push(<code key={key++} className="bg-skin-control-bg px-1 py-0.5 rounded text-[0.85em]">{m[3]}</code>);
    else if (m[4] && m[5]) nodes.push(<a key={key++} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-skin-primary underline">{m[4]}</a>);
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const MarkdownText: React.FC<{ text: string }> = ({ text }) => (
  <div className="space-y-1.5 leading-relaxed">
    {text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-1" />;
      if (/^[-*•]\s+/.test(t)) {
        return (
          <div key={i} className="flex gap-1.5">
            <span className="text-skin-primary">•</span>
            <span>{renderInline(t.replace(/^[-*•]\s+/, ''))}</span>
          </div>
        );
      }
      return <p key={i}>{renderInline(t)}</p>;
    })}
  </div>
);

// ── Typewriter for new assistant replies ──────────────────────────────────────
const Typewriter: React.FC<{ text: string; onDone: () => void }> = ({ text, onDone }) => {
  const [shown, setShown] = useState('');
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); onDone(); }
    }, 18);
    return () => clearInterval(id);
  }, [text, onDone]);
  return <MarkdownText text={shown} />;
};

const uid = () => Math.random().toString(36).slice(2);

const ChatBot: React.FC<ChatBotProps> = ({ open, onClose }) => {
  const [view, setView] = useState<View>('menu');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [nonce, setNonce] = useState('');
  const [csatDone, setCsatDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const formOpenedAt = useRef(0);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<{ stop: () => void } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechCtor: any = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const toggleMic = () => {
    if (listening) { recogRef.current?.stop(); return; }
    if (!SpeechCtor) return;
    const r = new SpeechCtor();
    r.lang = 'fa-IR'; r.interimResults = false; r.continuous = false;
    r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) setInput(prev => (prev ? prev + ' ' : '') + t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  // Stable client id for server-side rate limiting.
  const cid = useRef<string>('');
  if (!cid.current) {
    cid.current = localStorage.getItem('nafas_chat_cid') || uid();
    localStorage.setItem('nafas_chat_cid', cid.current);
  }

  // Lazily fetch a nonce only when the user actually sends a message or a
  // form — so the menu always works even if the WordPress backend isn't
  // reachable yet. Returns '' on failure.
  const ensureNonce = useCallback(async (): Promise<string> => {
    if (nonce) return nonce;
    try {
      const res = await fetch(`${WP_AJAX_URL}?action=nafas_chatbot_nonce`, { signal: AbortSignal.timeout(15000) });
      const json = await res.json();
      const n: string = json?.success && json.data?.nonce ? json.data.nonce : '';
      if (n) setNonce(n);
      return n;
    } catch {
      return '';
    }
  }, [nonce]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, view, loading]);

  const startChat = (p: { id: string; name: string } | null, seed?: string) => {
    setProduct(p);
    // For a product chat, surface the quick-reply prompts as suggestions.
    const isProduct = !!p && p.id !== 'nafas';
    setMessages([{
      id: uid(),
      role: 'assistant',
      content: seed || 'سلام! چطور می‌تونم کمکتون کنم؟ سوالتون رو بنویسید.',
      suggestions: isProduct ? QUICK_REPLIES : undefined,
    }]);
    setView('chat');
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: Message = { id: uid(), role: 'user', content: trimmed };
    const history = [...messages, userMsg]
      .filter(m => m.content)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const n = await ensureNonce();
      if (!n) {
        setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: 'در حال حاضر ارتباط با دستیار برقرار نیست. لطفاً بعداً دوباره تلاش کنید.' }]);
        return;
      }
      const json = await wpAjax('nafas_chatbot_chat', {
        message: trimmed,
        product: product?.id || 'general',
        history: JSON.stringify(history),
        nonce: n,
        cid: cid.current,
      });
      if (json.success && json.data?.reply) {
        setMessages(prev => [...prev, {
          id: uid(), role: 'assistant', content: json.data.reply, isNew: true,
          logId: json.data.log_id, suggestions: json.data.suggestions || [],
        }]);
      } else {
        const msg = json?.data?.message || 'در حال حاضر امکان پاسخ‌گویی نیست. لطفاً بعداً تلاش کنید.';
        setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: msg }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: 'ارتباط با سرور برقرار نشد.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, ensureNonce, messages, product]);

  const sendFeedback = async (logId: number | undefined, rating: 1 | 5) => {
    setMessages(prev => prev.map(m => m.logId === logId ? { ...m, feedback: rating } : m));
    if (logId) {
      const n = await ensureNonce();
      if (n) { try { await wpAjax('nafas_chatbot_feedback', { log_id: String(logId), rating: String(rating), nonce: n }); } catch { /* best effort */ } }
    }
  };

  const hadConversation = messages.some(m => m.role === 'user');

  const handleClose = () => {
    if (hadConversation && !csatDone) { setView('csat'); return; }
    resetAndClose();
  };
  const resetAndClose = () => {
    setView('menu'); setMessages([]); setProduct(null); setInput('');
    onClose();
  };

  const submitCsat = async (score: number) => {
    setCsatDone(true);
    const n = await ensureNonce();
    if (n) { try { await wpAjax('nafas_chatbot_csat', { score: String(score), nonce: n }); } catch { /* best effort */ } }
    resetAndClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:inset-auto md:bottom-6 md:left-6 flex items-end md:items-stretch justify-center md:justify-start" dir="rtl">
      {/* Mobile backdrop */}
      <div className="md:hidden absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative w-full md:w-[380px] h-[88vh] md:h-[600px] max-h-[680px] bg-skin-card md:rounded-2xl rounded-t-2xl shadow-2xl border border-skin-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-skin-primary text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {view !== 'menu' && (
              <button onClick={() => setView('menu')} className="p-1 hover:bg-white/15 rounded-lg transition-colors" aria-label="بازگشت">
                <ArrowRight size={18} />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm">دستیار هوشمند نفس</p>
              <p className="text-[11px] text-white/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> آنلاین
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-white/15 rounded-lg transition-colors" aria-label="بستن">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-skin-base">
          {view === 'menu' ? (
            <MenuView onStartChat={startChat} onProducts={() => setView('products')} onAdr={() => { formOpenedAt.current = Date.now(); setView('adr'); }} onConsult={() => { formOpenedAt.current = Date.now(); setView('consult'); }} />
          ) : view === 'products' ? (
            <ProductsView onPick={(p) => startChat(p, `دربارهٔ «${p.name}» چه سوالی دارید؟`)} />
          ) : view === 'chat' ? (
            <ChatView
              messages={messages}
              loading={loading}
              onFeedback={sendFeedback}
              onSuggestion={(s) => send(s)}
              onTypewriterDone={(id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, isNew: false } : m))}
            />
          ) : view === 'adr' ? (
            <AdrForm ensureNonce={ensureNonce} product={product} openedAt={formOpenedAt} onDone={() => setView('success')} />
          ) : view === 'consult' ? (
            <ConsultForm ensureNonce={ensureNonce} product={product} openedAt={formOpenedAt} onDone={() => setView('success')} />
          ) : view === 'success' ? (
            <SuccessView onBack={() => setView('menu')} />
          ) : view === 'csat' ? (
            <CsatView onSubmit={submitCsat} onSkip={resetAndClose} />
          ) : view === 'about' ? (
            <AboutView />
          ) : null}
        </div>

        {/* Composer (chat only) */}
        {view === 'chat' && (
          <div className="shrink-0 border-t border-skin-border p-2 bg-skin-card">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                rows={1}
                placeholder="پیامتان را بنویسید…"
                className="flex-1 resize-none max-h-24 px-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-xl outline-none focus:border-skin-primary"
              />
              {SpeechCtor && (
                <button type="button" onClick={toggleMic} aria-label="گفتن با صدا" className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${listening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-skin-control-bg text-skin-muted hover:text-skin-primary'}`}>
                  <Mic size={18} />
                </button>
              )}
              <button type="submit" disabled={loading || !input.trim()} className="w-10 h-10 shrink-0 rounded-xl bg-skin-primary hover:bg-skin-primary-hover text-white flex items-center justify-center disabled:opacity-50 transition-colors">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        )}

        {/* Bottom nav */}
        {(
          <div className="shrink-0 grid grid-cols-3 border-t border-skin-border bg-skin-card text-[11px]">
            <button onClick={() => setView('menu')} className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${view === 'menu' ? 'text-skin-primary' : 'text-skin-muted hover:text-skin-primary'}`}>
              <Home size={16} /> صفحه نخست
            </button>
            <button onClick={() => setView('about')} className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${view === 'about' ? 'text-skin-primary' : 'text-skin-muted hover:text-skin-primary'}`}>
              <Info size={16} /> دربارهٔ نفس
            </button>
            <a href="tel:02192001520" className="flex flex-col items-center gap-0.5 py-2 text-skin-muted hover:text-skin-primary transition-colors">
              <Phone size={16} /> تماس با نفس
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Menu ──────────────────────────────────────────────────────────────────────
const MenuButton: React.FC<{ icon: React.ReactNode; title: string; desc?: string; onClick: () => void }> = ({ icon, title, desc, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 p-3 bg-skin-card border border-skin-border rounded-xl hover:border-skin-primary/40 hover:shadow-sm transition-all text-right">
    <span className="w-10 h-10 shrink-0 rounded-lg bg-skin-primary/10 text-skin-primary flex items-center justify-center">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block font-bold text-sm text-skin-text">{title}</span>
      {desc && <span className="block text-xs text-skin-muted mt-0.5">{desc}</span>}
    </span>
    <ArrowRight size={16} className="text-skin-muted rotate-180" />
  </button>
);

const MenuView: React.FC<{
  onStartChat: (p: { id: string; name: string } | null) => void; onProducts: () => void; onAdr: () => void; onConsult: () => void;
}> = ({ onStartChat, onProducts, onAdr, onConsult }) => (
  <div className="space-y-3">
    <div className="bg-skin-card border border-skin-border rounded-xl p-4 text-center">
      <p className="font-black text-skin-text">سلام! 👋</p>
      <p className="text-sm text-skin-muted mt-1">به دستیار هوشمند نفس زیست فارمد خوش آمدید. چطور می‌تونیم کمکتون کنیم؟</p>
    </div>
    <MenuButton icon={<Building2 size={20} />} title="سوال دربارهٔ شرکت" onClick={() => onStartChat({ id: 'nafas', name: 'نفس زیست فارمد' })} />
    <MenuButton icon={<BookMarked size={20} />} title="سوال دربارهٔ محصولات" onClick={onProducts} />
    <MenuButton icon={<AlertTriangle size={20} />} title="ثبت عوارض دارویی" onClick={onAdr} />
    <MenuButton icon={<Headphones size={20} />} title="درخواست مشاوره" onClick={onConsult} />
    <p className="text-[11px] text-skin-muted text-center px-2 pt-1">این گفتگو جایگزین مشاورهٔ پزشک نیست؛ برای تصمیم درمانی با پزشک یا داروساز مشورت کنید.</p>
  </div>
);

const ProductsView: React.FC<{ onPick: (p: { id: string; name: string }) => void }> = ({ onPick }) => (
  <div className="space-y-2">
    <p className="text-xs text-skin-muted px-1 mb-1">محصول مورد نظر را انتخاب کنید:</p>
    {PRODUCTS.map(p => (
      <button key={p.id} onClick={() => onPick({ id: p.id, name: p.name })} className="w-full flex items-center gap-3 p-3 bg-skin-card border border-skin-border rounded-xl hover:border-skin-primary/40 transition-all text-right">
        <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-white" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
        <span className="flex-1 font-bold text-sm text-skin-text">{p.name}</span>
        <ArrowRight size={16} className="text-skin-muted rotate-180" />
      </button>
    ))}
  </div>
);

// ── Chat ──────────────────────────────────────────────────────────────────────
const ChatView: React.FC<{
  messages: Message[];
  loading: boolean;
  onFeedback: (logId: number | undefined, rating: 1 | 5) => void;
  onSuggestion: (s: string) => void;
  onTypewriterDone: (id: string) => void;
}> = ({ messages, loading, onFeedback, onSuggestion, onTypewriterDone }) => (
  <div className="space-y-3">
    {messages.map(m => (
      <div key={m.id} className={m.role === 'user' ? 'flex justify-start' : 'flex justify-end'}>
        <div className={`max-w-[85%] ${m.role === 'user' ? 'order-2' : ''}`}>
          <div className={`px-3 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-skin-primary text-white rounded-tr-sm' : 'bg-skin-card border border-skin-border text-skin-text rounded-tl-sm'}`}>
            {m.role === 'assistant' && m.isNew
              ? <Typewriter text={m.content} onDone={() => onTypewriterDone(m.id)} />
              : <MarkdownText text={m.content} />}
          </div>
          {m.role === 'assistant' && !m.isNew && m.logId && (
            <div className="flex items-center gap-1 mt-1 px-1">
              <button onClick={() => onFeedback(m.logId, 5)} className={`p-1 rounded ${m.feedback === 5 ? 'text-emerald-600' : 'text-skin-muted hover:text-emerald-600'}`} aria-label="مفید بود"><ThumbsUp size={13} /></button>
              <button onClick={() => onFeedback(m.logId, 1)} className={`p-1 rounded ${m.feedback === 1 ? 'text-red-600' : 'text-skin-muted hover:text-red-600'}`} aria-label="مفید نبود"><ThumbsDown size={13} /></button>
            </div>
          )}
          {m.role === 'assistant' && !m.isNew && m.suggestions && m.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {m.suggestions.map((s, i) => (
                <button key={i} onClick={() => onSuggestion(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-skin-primary/10 text-skin-primary hover:bg-skin-primary/20 transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    ))}
    {loading && (
      <div className="flex justify-end">
        <div className="bg-skin-card border border-skin-border rounded-2xl rounded-tl-sm px-3 py-2.5">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-skin-muted animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-skin-muted animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-skin-muted animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </div>
    )}
  </div>
);

// ── Shared form field ─────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-xs text-skin-muted mb-1 block">{label}</span>
    {children}
  </label>
);
const inputCls = 'w-full px-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-xl outline-none focus:border-skin-primary';

const Honeypot: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input aria-hidden tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
);

// ── ADR form (adverse drug reaction) ──────────────────────────────────────────
const AdrForm: React.FC<{ ensureNonce: () => Promise<string>; product: { id: string; name: string } | null; openedAt: React.MutableRefObject<number>; onDone: () => void }> = ({ ensureNonce, product, openedAt, onDone }) => {
  const [f, setF] = useState({ name: '', phone: '', description: '', severity: '', batch_number: '', concomitant_drugs: '' });
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim() || f.description.trim().length < 10) { setErr('نام، تلفن و شرح حداقل ۱۰ کاراکتر الزامی است.'); return; }
    if (!/^(\+98|0)?9\d{9}$/.test(f.phone.trim())) { setErr('شمارهٔ موبایل معتبر نیست.'); return; }
    setBusy(true); setErr('');
    try {
      const nonce = await ensureNonce();
      if (!nonce) { setErr('ارتباط با سرور برقرار نشد. لطفاً بعداً تلاش کنید.'); return; }
      const json = await wpAjax('nafas_chatbot_submit', {
        type: 'گزارش عوارض دارویی', name: f.name, phone: f.phone, description: f.description,
        product: product?.id || '', severity: f.severity, outcome: '', batch_number: f.batch_number,
        concomitant_drugs: f.concomitant_drugs, reporter_type: 'بیمار',
        nfx_hp: hp, nfx_elapsed: String(Date.now() - openedAt.current), nonce,
      });
      if (json.success) onDone(); else setErr(json?.data?.message || 'ثبت ناموفق بود.');
    } catch { setErr('ارتباط با سرور برقرار نشد.'); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-bold text-skin-text">ثبت گزارش عوارض دارویی</p>
      <Honeypot value={hp} onChange={setHp} />
      <Field label="نام و نام خانوادگی"><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <Field label="شمارهٔ تماس"><input className={inputCls} dir="ltr" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxxxx" /></Field>
      <Field label="شدت عارضه">
        <select className={inputCls} value={f.severity} onChange={e => set('severity', e.target.value)}>
          <option value="">انتخاب…</option>
          <option>خفیف</option><option>متوسط</option><option>شدید</option><option>تهدیدکننده حیات</option>
        </select>
      </Field>
      <Field label="شمارهٔ سری ساخت (اختیاری)"><input className={inputCls} value={f.batch_number} onChange={e => set('batch_number', e.target.value)} /></Field>
      <Field label="داروهای همزمان (اختیاری)"><input className={inputCls} value={f.concomitant_drugs} onChange={e => set('concomitant_drugs', e.target.value)} /></Field>
      <Field label="شرح عارضه"><textarea className={`${inputCls} resize-y`} rows={3} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button disabled={busy} className="w-full bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors">{busy ? 'در حال ارسال…' : 'ثبت گزارش'}</button>
    </form>
  );
};

// ── Consult form ──────────────────────────────────────────────────────────────
const ConsultForm: React.FC<{ ensureNonce: () => Promise<string>; product: { id: string; name: string } | null; openedAt: React.MutableRefObject<number>; onDone: () => void }> = ({ ensureNonce, product, openedAt, onDone }) => {
  const [f, setF] = useState({ name: '', phone: '', description: '' });
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim() || f.description.trim().length < 10) { setErr('نام، تلفن و توضیحات حداقل ۱۰ کاراکتر الزامی است.'); return; }
    if (!/^(\+98|0)?9\d{9}$/.test(f.phone.trim())) { setErr('شمارهٔ موبایل معتبر نیست.'); return; }
    setBusy(true); setErr('');
    try {
      const nonce = await ensureNonce();
      if (!nonce) { setErr('ارتباط با سرور برقرار نشد. لطفاً بعداً تلاش کنید.'); return; }
      const json = await wpAjax('nafas_chatbot_submit', {
        type: 'درخواست مشاوره', name: f.name, phone: f.phone, description: f.description,
        product: product?.id || '', severity: '', outcome: '', batch_number: '', concomitant_drugs: '', reporter_type: 'بیمار',
        nfx_hp: hp, nfx_elapsed: String(Date.now() - openedAt.current), nonce,
      });
      if (json.success) onDone(); else setErr(json?.data?.message || 'ثبت ناموفق بود.');
    } catch { setErr('ارتباط با سرور برقرار نشد.'); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-bold text-skin-text">درخواست مشاوره</p>
      <Honeypot value={hp} onChange={setHp} />
      <Field label="نام و نام خانوادگی"><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <Field label="شمارهٔ تماس"><input className={inputCls} dir="ltr" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxxxx" /></Field>
      <Field label="توضیحات"><textarea className={`${inputCls} resize-y`} rows={4} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button disabled={busy} className="w-full bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors">{busy ? 'در حال ارسال…' : 'ارسال درخواست'}</button>
    </form>
  );
};

const SuccessView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
    <p className="font-bold text-skin-text">با موفقیت ثبت شد</p>
    <p className="text-sm text-skin-muted">کارشناسان ما در اسرع وقت با شما تماس می‌گیرند.</p>
    <button onClick={onBack} className="text-sm font-bold text-skin-primary">بازگشت به منو</button>
  </div>
);

const CsatView: React.FC<{ onSubmit: (score: number) => void; onSkip: () => void }> = ({ onSubmit, onSkip }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-4">
      <p className="font-bold text-skin-text">از گفتگو با ما راضی بودید؟</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onSubmit(n)} aria-label={`${n} ستاره`}>
            <Star size={28} className={n <= hover ? 'text-amber-400 fill-amber-400' : 'text-skin-border'} />
          </button>
        ))}
      </div>
      <button onClick={onSkip} className="text-xs text-skin-muted hover:text-skin-text">رد کردن</button>
    </div>
  );
};

const AboutView: React.FC = () => (
  <div className="space-y-3 text-center">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-skin-primary/10 text-skin-primary flex items-center justify-center">
      <Building2 size={26} />
    </div>
    <p className="font-black text-skin-text">نفس زیست فارمد</p>
    <p className="text-xs font-bold text-skin-primary">مراقب شما در هر نفس</p>
    <p className="text-[13px] text-skin-muted leading-relaxed text-justify px-1">
      شرکت دانش‌بنیان نوع یک، توسعه‌دهندهٔ فناوری‌های پیشرفتهٔ دارورسانی و نخستین داروی استنشاقی پودر خشک (DPI) بومی در ایران.
    </p>
    <a href="https://nafaspharmed.com" target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-bold text-skin-primary underline">nafaspharmed.com</a>
  </div>
);

export default ChatBot;
