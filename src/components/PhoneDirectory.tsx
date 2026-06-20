import React, { useState, useMemo } from 'react';
import { X, Search, Phone, Hash } from 'lucide-react';

interface PhoneDirectoryProps {
  open: boolean;
  onClose: () => void;
}

interface Extension {
  unit: string;
  person?: string;
  ext: string;
}

// NOTE: sample data for the preview. Replace with the real ~30 extensions.
const MAIN_LINE = '02192001520';
const EXTENSIONS: Extension[] = [
  { unit: 'پذیرش و اپراتور', ext: '100' },
  { unit: 'دفتر مدیرعامل', ext: '101' },
  { unit: 'روابط عمومی', ext: '102' },
  { unit: 'فروش و بازاریابی', ext: '110' },
  { unit: 'بازرگانی', ext: '115' },
  { unit: 'مالی و حسابداری', ext: '120' },
  { unit: 'منابع انسانی', ext: '130' },
  { unit: 'تحقیق و توسعه (R&D)', ext: '140' },
  { unit: 'تضمین کیفیت (QA)', ext: '145' },
  { unit: 'کنترل کیفیت (QC)', ext: '150' },
  { unit: 'تولید', ext: '160' },
  { unit: 'انبار', ext: '170' },
  { unit: 'فناوری اطلاعات (IT)', ext: '180' },
  { unit: 'پشتیبانی فنی', ext: '190' },
];

const PhoneDirectory: React.FC<PhoneDirectoryProps> = ({ open, onClose }) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return EXTENSIONS;
    return EXTENSIONS.filter(e => e.unit.toLowerCase().includes(t) || (e.person ?? '').toLowerCase().includes(t) || e.ext.includes(t));
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-skin-card rounded-2xl shadow-2xl border border-skin-border flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-skin-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-skin-primary/10 text-skin-primary flex items-center justify-center"><Hash size={16} /></span>
            <div className="leading-tight">
              <p className="font-bold text-sm text-skin-text">دفترچهٔ تلفن داخلی</p>
              <p className="text-[11px] text-skin-muted">شمارهٔ مرکزی: ۰۲۱ ۹۲۰۰ ۱۵۲۰</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-skin-muted hover:bg-skin-control-bg" aria-label="بستن"><X size={18} /></button>
        </div>

        {/* Search */}
        <div className="shrink-0 p-3 border-b border-skin-border">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="جست‌وجوی واحد یا شماره…" className="w-full pr-9 pl-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-xl outline-none focus:border-skin-primary" />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-skin-border">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-skin-muted">واحدی یافت نشد.</p>
          ) : filtered.map((e, i) => (
            <a key={i} href={`tel:${MAIN_LINE},,${e.ext}`} className="flex items-center gap-3 px-4 py-3 hover:bg-skin-control-bg/60 transition-colors">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-skin-primary/10 text-skin-primary flex items-center justify-center"><Phone size={15} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-skin-text truncate">{e.unit}</span>
                {e.person && <span className="block text-xs text-skin-muted">{e.person}</span>}
              </span>
              <span className="text-sm font-bold text-skin-primary tabular-nums font-mono">{e.ext}</span>
            </a>
          ))}
        </div>

        <p className="shrink-0 px-4 py-2 text-[10px] text-skin-muted border-t border-skin-border text-center">پیش‌نمایش با دادهٔ نمونه — لیست واقعی داخلی‌ها جایگزین می‌شود.</p>
      </div>
    </div>
  );
};

export default PhoneDirectory;
