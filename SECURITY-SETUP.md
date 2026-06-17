# 🔒 راهنمای تنظیم امنیتی — فاز صفر

> **مهم:** این فایل آخرین دستورالعمل‌های امنیتی برای deployment و توسعه فاز صفر را شرح می‌دهد.

---

## ۱. متغیرهای محیطی (Environment Variables)

### برای توسعه محلی (`.env.local`)
```bash
VITE_ADMIN_PASSWORD=dev-password-123
VITE_CHAT_FORM_TOKEN=dev-token-xyz
VITE_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

هم‌چنین برای PHP در محیط local:
```bash
export ALLOWED_ORIGINS="http://localhost:5173"
export CHAT_FORM_TOKEN="dev-token-xyz"
export FORM_SUBMIT_TOKEN="dev-token-xyz"
```

### برای Production
**هرگز** این متغیرها را در `.env.local` قرار ندهید. آن‌ها را در تنظیمات هاست خود تعریف کنید:

**Vercel / Netlify:**
- در بخش "Environment Variables" پروژه تنظیم کنید

**سرورهای مشترک / cPanel:**
```bash
# در `public_html/.htaccess` یا PHP `ini_set()`:
SetEnv BALE_TOKEN "your-real-bale-token"
SetEnv BALE_CHAT_ID "your-real-chat-id"
SetEnv ALLOWED_ORIGINS "https://nafaspharmed.com"
```

---

## ۲. 🚨 کاری که باید فوراً انجام دهید

### ۲.۱ توکن بله را Revoke کنید
1. وارد [BotFather بله](https://tapi.bale.ai) شوید
2. توکن قدیمی را **delete/revoke** کنید (توکن `1804437858:DetvFi-...` که در گیت commit شده است)
3. یک توکن جدید تولید کنید و آن را در تنظیمات هاست ذخیره کنید

**چرا؟** توکن قدیمی در تاریخچه‌ی git برای همیشه وجود دارد و هر کسی می‌تواند آن را استفاده کند.

### ۲.۲ رمز ادمین وبسایت را تغییر دهید
رمز قدیمی (`JU=:zzBTj.Cg4m*ja=0q7t^H~^0Zzm@2#*c`) در `App.tsx` بود و لو رفته است. یک رمز جدید و قوی انتخاب کنید.

### ۲.۳ توکن‌های فرم را مشخص کنید
دو توکن مستقل برای امنیت بیشتر:
- `CHAT_FORM_TOKEN`: برای endpoint `chat.php`
- `FORM_SUBMIT_TOKEN`: برای endpoint `submit_form.php`

هر دو حروف الفبایی تصادفی باشند (مثل: `abc123xyz789...`).

---

## ۳. CORS و Allowed Origins

فایل‌های PHP حالا CORS را محدود می‌کنند:

```php
$allowed_origins = explode(',', getenv('ALLOWED_ORIGINS') ?: 'https://nafaspharmed.com');
```

**مثال:**
```
ALLOWED_ORIGINS=https://nafaspharmed.com,https://www.nafaspharmed.com,https://patient.nafaspharmed.com
```

---

## ۴. فایل‌های حساس در `.gitignore`

اضافه شده‌اند:
- `.env*` (تمام فایل‌های env محلی)
- `public/config.php` (تنظیمات راز)
- `public/submit_form.php` و `public/chat.php` (درازتر اختیاری است؛ تنها محتوای راز را اگر custom تعریف کنید)
- `public/rate_*.txt` (فایل‌های rate limiting)

---

## ۵. Testing Locally

### ۵.۱ Vite Dev Server
```bash
npm install
npm run dev
# http://localhost:5173
```

فایل‌های PHP (`chat.php`, `submit_form.php`) را می‌توانید **نمی‌توانید** مستقیماً آزمایش کنید بدون PHP server.

### ۵.۲ با PHP Local Server (اختیاری)
اگر می‌خواهید PHP را محلی آزمایش کنید:
```bash
# در مسیر `public/`
php -S localhost:8000

# بعد تغییر API_URL در ChatBot.tsx به http://localhost:8000/chat.php
```

---

## ۶. Deployment Checklist

- [ ] توکن بله **revoke** شده در BotFather
- [ ] توکن جدید بله در محیط سرور تعریف شده
- [ ] `VITE_ADMIN_PASSWORD` یک رمز قوی است (حداقل ۱۶ کاراکتر)
- [ ] `VITE_CHAT_FORM_TOKEN` و `FORM_SUBMIT_TOKEN` تولید شده و در محیط سرور تنظیم شده
- [ ] `ALLOWED_ORIGINS` به دامنه‌های صحیح محدود شده
- [ ] `npm run build` بدون خطا اجرا می‌شود
- [ ] فایل `dist/` روی هاست آپلود شده
- [ ] فایل‌های PHP روی سرور (هاست) قرار دارند
- [ ] متغیرهای محیطی PHP در هاست تعریف شده‌اند

---

## ۷. بعدی (Roadmap)

این فاز صفر شامل **immediate security fixes** است. بعد از اطمینان از اینکه همه چیز کار می‌کند:
- **فاز یک:** API داده سمت سرور (پایان وابستگی به localStorage)
- **فاز دو:** UX و امکانات اضافی

---

*آخرین به‌روزرسانی: خرداد ۱۴۰۵*
