// Fix 3.7: Single source of truth for product data (was duplicated in App.tsx and ChatBot.tsx)

export interface Product {
  id: string;
  name: string;
  tagline: string;
  matchKeyword: string;
}

export const PRODUCTS: Product[] = [
  { id: 'capsulizer',  name: 'کپسولایزر',     tagline: 'دستگاه استنشاق کپسول',          matchKeyword: 'کپسولایزر' },
  { id: 'coldanese',   name: 'کلدانیز پلاس',   tagline: 'اسپری بینی برای رینیت آلرژیک',   matchKeyword: 'کلدانیز' },
  { id: 'folinozit',   name: 'فولینوزیت',      tagline: 'ساشه تقویتی اسید فولیک',         matchKeyword: 'فولینوزیت' },
  { id: 'megzolek',    name: 'مگلوزک',         tagline: 'ساشه مکمل ویتامین و مینرال',      matchKeyword: 'مگلوزک' },
  { id: 'tiotoriva',   name: 'تیوتوریوا',      tagline: 'کپسول استنشاقی تیوتروپیوم',      matchKeyword: 'تیوتوریوا' },
];
