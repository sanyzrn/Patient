<div dir="rtl">

# آموزش و حمایت از بیمار | نفس زیست فارمد

پورتال جامع آموزش و حمایت از بیماران شرکت **نفس زیست فارمد**؛ شامل کاتالوگ‌های آموزشی تعاملی، بروشورهای دارویی (PDF با حالت کتاب‌خوان)، ویدئوهای آموزشی، دستیار هوشمند چت و پنل مدیریت محتوا.

اپلیکیشن یک **SPA** مبتنی بر React 19 + TypeScript است که به‌صورت **PWA** قابل نصب روی موبایل و دسکتاپ بوده و با یک بک‌اند سبک PHP برای ذخیرهٔ محتوا، ثبت فرم‌ها و پاسخ هوشمند چت کار می‌کند.

---

## ✨ امکانات

- **کاتالوگ‌های آموزشی** با جست‌وجوی پیشرفته (عنوان، توضیح و فهرست مطالب) به کمک Fuse.js
- **کتاب‌خوان PDF تعاملی** (`BookViewer`) با حالت ورق‌زدن، هایلایت، یادداشت‌گذاری و خروجی JSON یادداشت‌ها
- **پخش‌کنندهٔ ویدئو** آموزشی
- **دستیار هوشمند چت** (`ChatBot`) با گفت‌وگوی چندمرحله‌ای، نمایش Markdown، افکت تایپ، پیشنهادها و امتیازدهی — متصل به Gemini از طریق بک‌اند
- **پنل مدیریت** برای ویرایش کاتالوگ‌ها، ویدئوها و بنرها بدون نیاز به استقرار مجدد
- **Command Palette** (جست‌وجوی سریع با صفحه‌کلید)، **علاقه‌مندی‌ها**، **رکورد مطالعه**، **QR Code** و افکت‌های UX
- **PWA**: کش آفلاین، نصب‌پذیری، به‌روزرسانی خودکار (Workbox)
- کاملاً **راست‌چین (RTL) و فارسی** با فونت وزیرمتن

---

## 🧱 پشتهٔ فنی

| لایه | فناوری |
|------|--------|
| فرانت‌اند | React 19، TypeScript 5.9، Vite 7 |
| استایل | Tailwind CSS 4 |
| انیمیشن | Motion |
| نمودار | Recharts |
| PDF | pdfjs-dist + react-pageflip |
| جست‌وجو | Fuse.js |
| PWA | vite-plugin-pwa (Workbox) |
| بک‌اند | PHP (بدون فریم‌ورک) |
| هوش مصنوعی | Google Gemini 1.5 Flash |

---

## 📁 ساختار پروژه

</div>

```
.
├── index.html              # نقطهٔ ورود؛ data.js را قبل از اپ بارگذاری می‌کند
├── data.ts                 # دادهٔ پیش‌فرض کاتالوگ‌ها/ویدئوها/بنرها (منبع حقیقت)
├── vite.config.ts          # پیکربندی Vite + PWA + chunking
├── scripts/
│   └── sync-data.mjs       # data.ts → public/data.js
├── public/                 # دارایی‌های استاتیک + بک‌اند PHP
│   ├── api.php             # API مدیریت: ورود، ذخیرهٔ محتوا (توکن X-Admin-Token)
│   ├── chat.php            # endpoint چت هوشمند (Gemini)
│   ├── submit_form.php     # ثبت فرم تماس/مشاوره/عوارض
│   ├── rate_limit.php      # محدودسازی نرخ درخواست
│   ├── admin-credentials-manager.php  # مدیریت رمز ادمین (bcrypt)
│   ├── data.js             # خروجی همگام‌شدهٔ data.ts
│   └── icon-*.png, favicon.svg, .htaccess
└── src/
    ├── main.tsx            # bootstrap React
    ├── App.tsx             # کامپوننت ریشه و مسیریابی
    ├── components/         # ChatBot, BookViewer, AdminPanel, CommandPalette, ...
    ├── context/            # CatalogContext
    ├── hooks/              # useFavorites, useReadingStreak, useCachedCatalogs, ...
    ├── utils/              # helpers, analytics, confetti, tts, cn
    ├── constants/          # products, storageKeys
    └── types.ts
```

<div dir="rtl">

---

## 🚀 راه‌اندازی

### پیش‌نیازها
- Node.js نسخهٔ ۲۰ یا بالاتر
- برای بک‌اند: PHP نسخهٔ ۷.۴ یا بالاتر

### نصب و اجرای محیط توسعه

</div>

```bash
npm install
npm run dev      # اجرای سرور توسعه روی http://localhost:5173
```

<div dir="rtl">

### اسکریپت‌ها

</div>

```bash
npm run dev        # سرور توسعهٔ Vite
npm run build      # بیلد تولیدی در dist/
npm run preview    # پیش‌نمایش بیلد تولیدی
npm run sync-data  # همگام‌سازی data.ts → public/data.js
```

<div dir="rtl">

---

## 🔐 متغیرهای محیطی

این فایل **هرگز نباید commit شود** (در `.gitignore` قرار دارد). یک فایل `.env.local` در ریشهٔ پروژه برای فرانت‌اند بسازید:

</div>

```bash
# .env.local  (فقط توسعهٔ محلی)
VITE_API_BASE_URL=https://example.com      # آدرس پایهٔ بک‌اند (اختیاری)
VITE_ADMIN_PASSWORD=dev-password-123       # رمز ادمین محیط توسعه
```

<div dir="rtl">

متغیرهای سمت سرور (PHP) باید در محیط وب‌سرور تنظیم شوند، نه در کد:

| متغیر | کاربرد |
|-------|--------|
| `GEMINI_API_KEY` | کلید Google Gemini برای `chat.php` |
| `ALLOWED_ORIGINS` | فهرست دامنه‌های مجاز CORS (با کاما جدا شوند)، مثلاً `https://app.example.com` |

> اگر `GEMINI_API_KEY` تنظیم نشده باشد، `chat.php` به‌صورت ایمن یک پاسخ محلی برمی‌گرداند و خطا نمی‌دهد.
>
> اگر `ALLOWED_ORIGINS` تنظیم نشده باشد، به‌طور پیش‌فرض فقط `localhost:5173` و `localhost:3000` (محیط توسعه) مجاز هستند — هیچ‌گاه از `*` استفاده نمی‌شود.

---

## 🔄 جریان داده

دادهٔ پیش‌فرض در `data.ts` نگه‌داری می‌شود. با اجرای `npm run sync-data` به `public/data.js` کپی می‌شود و `index.html` آن را قبل از اجرای React بارگذاری می‌کند. در محیط تولید، پنل مدیریت محتوا را از طریق `api.php` ذخیره می‌کند و اپ نسخهٔ سروری را روی دادهٔ پیش‌فرض اولویت می‌دهد.

---

## 🛡️ نکات امنیتی استقرار

- فایل‌های runtime بک‌اند (مانند `.admin-credentials.json`، `.admin-tokens.json`، `.form-submissions.json` و پوشهٔ `public/data/`) **نباید** در ریپازیتوری قرار گیرند و در `.gitignore` لحاظ شده‌اند.
- رمز ادمین با **bcrypt** هش می‌شود (`admin-credentials-manager.php`).
- کلیدهای سرویس (Gemini) فقط از متغیر محیطی خوانده می‌شوند، نه از کد.
- CORS در همهٔ endpointهای PHP به متغیر `ALLOWED_ORIGINS` محدود شده و origin درخواست را تنها در صورت مجاز بودن بازتاب می‌دهد (بدون `*`). برای تولید، `ALLOWED_ORIGINS` را روی دامنهٔ خود تنظیم کنید.

---

## 📦 استقرار

پس از `npm run build`، محتویات پوشهٔ `dist/` را روی هاست استاتیک قرار دهید و فایل‌های PHP داخل `public/` را روی یک سرور PHP منتشر کنید. فایل `.htaccess` برای مسیریابی SPA و هدرهای امنیتی موجود است.

---

> شرکت نفس زیست فارمد — تمامی حقوق محفوظ است.

</div>
