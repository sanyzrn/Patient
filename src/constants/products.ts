// Single source of truth for the company's product line, shown in the
// "محصولات" section. Descriptions are sourced from the official company profile.

export interface Product {
  id: string;
  number: string;        // Persian display index (۱…۵)
  name: string;          // Persian brand name
  englishName: string;   // Latin brand name
  category: string;      // therapeutic / product category
  description: string;
  image: string;         // square product image
  features?: string[];   // optional highlight bullets
  matchKeyword: string;  // used to link a product to its catalog, if any
}

export const PRODUCTS: Product[] = [
  {
    id: 'tiotoriva',
    number: '۱',
    name: 'تیوتوریوا',
    englishName: 'TioToriva',
    category: 'داروهای تنفسی',
    description:
      'حاوی ۱۸ میکروگرم ماده مؤثره تیوتروپیوم (Tiotropium) بوده و همراه با دستگاه استنشاقی اختصاصی ارائه می‌شود. این محصول به عنوان یکی از درمان‌های نگهدارنده مؤثر در مدیریت بیماران مبتلا به بیماری مزمن انسدادی ریه (COPD) شناخته می‌شود. مکانیسم اثر دارو از طریق گشادسازی راه‌های هوایی انجام شده و موجب بهبود عملکرد ریوی، تسهیل تنفس و کمک به کاهش علائم بیماری می‌شود.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/TiotorivaSq.webp',
    matchKeyword: 'تیوتوریوا',
  },
  {
    id: 'coldanese',
    number: '۲',
    name: 'کلدانیز پلاس',
    englishName: 'Coldanese Plus',
    category: 'سلامت دستگاه تنفسی',
    description:
      'محصولی نوآورانه با فرمولاسیون تخصصی که با هدف حمایت از سیستم تنفسی و کمک به کاهش علائم ناشی از عفونت‌های شایع ویروسی دستگاه تنفسی طراحی شده است. این فرآورده می‌تواند در تسکین علائم، حمایت از روند بهبود و ارتقای سلامت سیستم تنفسی در بیماری‌هایی نظیر سرماخوردگی، آنفلوانزا و سایر عفونت‌های ویروسی تنفسی نقش مؤثری ایفا نماید.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/Coldanesep.webp',
    matchKeyword: 'کلدانیز',
  },
  {
    id: 'megzolek',
    number: '۳',
    name: 'مگلوزک',
    englishName: 'Meglozek',
    category: 'سلامت اطفال و کودکان',
    description:
      'با در نظر گرفتن نیازهای ویژه کودکان و نوزادان طراحی و فرموله شده است. این محصول با بهره‌گیری از ترکیبات ایمن و سازگار با شرایط فیزیولوژیک کودکان، از پروفایل ایمنی مطلوب و تحمل‌پذیری مناسبی برخوردار بوده و می‌تواند به عنوان گزینه‌ای قابل اعتماد در حوزه سلامت کودکان مورد استفاده قرار گیرد.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/meglozeksq.webp',
    matchKeyword: 'مگلوزک',
  },
  {
    id: 'folinozit',
    number: '۴',
    name: 'فولینوزیت',
    englishName: 'Folinozit',
    category: 'سلامت زنان',
    description:
      'مکملی تخصصی در حوزه سلامت بانوان است که با ترکیبی هدفمند از مواد مؤثره، به حمایت از فرآیندهای متابولیکی، تأمین ریزمغذی‌های ضروری و کمک به حفظ عملکرد طبیعی بدن بانوان کمک می‌کند. این محصول با رویکردی علمی و مبتنی بر نیازهای تغذیه‌ای زنان طراحی شده و می‌تواند نقش مؤثری در ارتقای سلامت عمومی آنان ایفا نماید.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/foli.webp',
    matchKeyword: 'فولینوزیت',
  },
  {
    id: 'capsulizer',
    number: '۵',
    name: 'کپسولایزر',
    englishName: 'Capsulizer',
    category: 'تجهیزات پزشکی',
    description:
      'یک دستگاه پیشرفته استنشاق کپسولی است که با طراحی مهندسی‌شده و ارگونومیک، فرآیند مصرف داروهای استنشاقی را بهینه‌سازی می‌کند.',
    image: 'https://nafaspharmed.com/up/wp-content/uploads/2026/05/capsulizer1.webp',
    features: [
      'افزایش راندمان دارورسانی به ریه‌ها از طریق آزادسازی دقیق دوز دارو',
      'امکان تأیید بصری دریافت کامل دوز دارویی توسط بیمار',
      'طراحی ارگونومیک و کاربرپسند برای تمامی گروه‌های سنی، به‌ویژه سالمندان',
      'عدم نیاز به شست‌وشوی مکرر و دوام بالا برای استفاده طولانی‌مدت',
      'طراحی و تولید منطبق با الزامات و استانداردهای معتبر تجهیزات پزشکی',
    ],
    matchKeyword: 'کپسولایزر',
  },
];
