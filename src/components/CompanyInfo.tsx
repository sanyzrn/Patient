import React from 'react';
import { motion } from 'motion/react';
import {
  Target, Eye, HeartPulse, Wind, ShieldCheck, FlaskConical,
  Users, TrendingUp, Sparkles, Building2, Award
} from 'lucide-react';

// ─── Shared bits ──────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const SectionTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block text-skin-primary font-bold text-xs tracking-[0.15em] mb-2">{children}</span>
);

const ABOUT_PARAGRAPHS = [
  'این شرکت با تکیه بر دانش فنی بومی، بهره‌گیری از فناوری‌های روز دنیا و همکاری تیمی از متخصصان حوزه‌های داروسازی، بیوتکنولوژی، مهندسی پزشکی و علوم پایه، توانسته است جایگاه ارزشمندی در توسعه محصولات دانش‌بنیان حوزه سلامت به دست آورد.',
  'نفس زیست فارمد پس از سال‌ها تحقیق و توسعه مستمر، موفق به بومی‌سازی و تسلط بر دانش فنی پیشرفته در حوزه‌های فرمولاسیون دارویی و مهندسی آیرودینامیک ذرات (Aerodynamic Particle Engineering) گردیده است. این دستاورد علمی راهبردی، زمینه تولید نخستین داروی استنشاقی پودر خشک (Dry Powder Inhaler - DPI) مبتنی بر دانش فنی بومی در ایران را فراهم ساخته و موجب کسب گواهی دانش‌بنیان نوع یک برای این مجموعه شده است.',
  'تعهد به نوآوری، کیفیت، توسعه پایدار، خودکفایی ملی و ارتقای سطح سلامت جامعه، از مهم‌ترین ارزش‌های سازمانی نفس زیست فارمد به شمار می‌رود. این شرکت با بهره‌گیری از استانداردهای سخت‌گیرانه کنترل کیفیت، همکاری با مراکز علمی و تحقیقاتی و تمرکز بر توسعه بازارهای داخلی و بین‌المللی، مسیر رشد و تعالی خود را با قدرت ادامه می‌دهد.',
];

const STATS = [
  { num: '۱۳۹۸', label: 'سال تأسیس' },
  { num: 'DPI', label: 'نخستین داروی استنشاقی پودر خشک بومی' },
  { num: '۵+', label: 'محصول تخصصی سلامت' },
  { num: 'نوع ۱', label: 'شرکت دانش‌بنیان' },
];

const ADVANTAGES = [
  'شرکت دانش‌بنیان نوع یک',
  'توسعه‌دهنده فناوری داروهای استنشاقی پودر خشک (DPI) در ایران',
  'دانش فنی بومی در حوزه فرمولاسیون دارویی و مهندسی آیرودینامیک ذرات',
  'بهره‌گیری از تیم متخصص و چندرشته‌ای در حوزه سلامت',
  'تمرکز بر تحقیق و توسعه مستمر و نوآوری فناورانه',
  'رعایت استانداردهای سخت‌گیرانه کنترل کیفیت و الزامات صنعت داروسازی',
  'رویکرد توسعه‌محور در بازارهای داخلی و صادراتی',
];

const VALUE_CHIPS = ['نوآوری', 'کیفیت', 'توسعه پایدار', 'خودکفایی ملی', 'ارتقای سلامت جامعه'];

// ─── Company info block (placed below catalogs & videos) ──────────────────────
const CompanyInfo: React.FC = () => {
  return (
    <div className="space-y-14 mb-12">

      {/* ── ABOUT ─────────────────────────────────────────────── */}
      <motion.section
        id="about"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="scroll-mt-24"
      >
        <div className="text-center mb-8">
          <SectionTag>درباره ما</SectionTag>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">دانش بومی، استانداردهای جهانی</h2>
          <p className="text-skin-muted text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
            نفس زیست فارمد از سال ۱۳۹۸ با هدف توسعه فناوری‌های پیشرفته دارورسانی و تولید محصولات دارویی نوآورانه فعالیت می‌کند.
          </p>
        </div>

        <div className="bg-skin-card border border-skin-border rounded-2xl p-6 md:p-8">
          <div className="space-y-4 text-sm md:text-[15px] leading-loose text-skin-text/90 text-justify">
            {ABOUT_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-skin-border">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-skin-primary tracking-tight">{s.num}</p>
                <p className="text-[11px] text-skin-muted mt-1 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── MISSION / VISION / VALUES ─────────────────────────── */}
      <motion.section
        id="mission"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5 }}
        className="scroll-mt-24"
      >
        <div className="text-center mb-8">
          <SectionTag>هویت سازمانی</SectionTag>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">مأموریت و چشم‌انداز</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mission */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <Target size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-2">مأموریت شرکت</h3>
            <p className="text-sm text-skin-muted leading-relaxed">
              توسعه و تولید فرآورده‌های دارویی و تجهیزات پزشکی نوآورانه با بهره‌گیری از دانش فنی پیشرفته، به منظور بهبود کیفیت زندگی بیماران، ارتقای سطح سلامت جامعه و ایجاد دسترسی پایدار به درمان‌های مؤثر و ایمن.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-skin-card border border-skin-border rounded-2xl p-6 hover:border-skin-primary/30 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-skin-primary/10 text-skin-primary flex items-center justify-center mb-4">
              <Eye size={22} />
            </div>
            <h3 className="font-black text-skin-text mb-2">چشم‌انداز شرکت</h3>
            <p className="text-sm text-skin-muted leading-relaxed">
              تبدیل شدن به یکی از شرکت‌های پیشرو منطقه در حوزه فناوری‌های دارورسانی پیشرفته، داروهای استنشاقی و محصولات نوآورانه سلامت با حضور مؤثر در بازارهای بین‌المللی.
            </p>
          </div>

          {/* Values — accent card */}
          <div className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 65%, #000))' }}>
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center mb-4">
              <HeartPulse size={22} />
            </div>
            <h3 className="font-black mb-3">ارزش‌های ما</h3>
            <div className="flex flex-wrap gap-2">
              {VALUE_CHIPS.map((v) => (
                <span key={v} className="text-xs font-bold bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">{v}</span>
              ))}
            </div>
            <p className="text-xs text-white/85 mt-4 leading-relaxed">
              این ارزش‌ها قطب‌نمای تمامی تصمیمات و فعالیت‌های نفس زیست فارمد هستند.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── ADVANTAGES ────────────────────────────────────────── */}
      <motion.section
        id="advantages"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5 }}
        className="scroll-mt-24"
      >
        <div className="text-center mb-8">
          <SectionTag>چرا نفس زیست فارمد</SectionTag>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">مزیت‌های رقابتی</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ADVANTAGES.map((adv, i) => {
            const icons = [Award, Wind, FlaskConical, Users, TrendingUp, ShieldCheck, Sparkles];
            const Icon = icons[i % icons.length]!;
            return (
              <div key={i} className="flex items-start gap-3 bg-skin-card border border-skin-border rounded-xl p-4 hover:border-skin-primary/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-skin-primary/10 text-skin-primary flex items-center justify-center">
                  <Icon size={17} />
                </span>
                <p className="text-sm text-skin-text leading-relaxed font-medium pt-1">{adv}</p>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* ── CLOSING / SLOGAN ──────────────────────────────────── */}
      <motion.section
        id="company-closing"
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="scroll-mt-24"
      >
        <div className="relative overflow-hidden rounded-3xl px-6 py-12 md:py-16 text-center text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 60%, #000))' }}>
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(420px 220px at 80% -10%, #fff, transparent), radial-gradient(360px 200px at 10% 110%, #fff, transparent)' }} />
          <div className="relative max-w-3xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-5">
              <Building2 size={24} />
            </div>
            <p className="text-sm md:text-base text-white/90 leading-loose">
              نفس زیست فارمد با تکیه بر دانش، نوآوری و مسئولیت‌پذیری اجتماعی، در مسیر توسعه فناوری‌های نوین سلامت و ارائه راهکارهای درمانی مؤثر گام برمی‌دارد و در تلاش است سهم مؤثری در ارتقای سلامت جامعه و توسعه صنعت داروسازی کشور ایفا نماید.
            </p>
            <div className="flex items-center justify-center gap-2 mt-7">
              <HeartPulse size={20} className="text-white/90" />
              <p className="text-xl md:text-2xl font-black tracking-tight">«مراقب شما در هر نفس»</p>
            </div>
          </div>
        </div>
      </motion.section>

    </div>
  );
};

export default CompanyInfo;
