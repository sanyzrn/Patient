<?php
/**
 * مدیریت تنظیمات و گزینه‌های افزونه.
 *
 * @package NafasChatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * کلاس تنظیمات.
 */
class Nafas_Chatbot_Settings {

	/**
	 * کلید گزینه در دیتابیس.
	 */
	const OPTION_KEY = 'nafas_chatbot_settings';

	/**
	 * کش تنظیمات.
	 *
	 * @var array|null
	 */
	protected static $cache = null;

	/**
	 * مقادیر پیش‌فرض تنظیمات.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			// عمومی.
			'enabled'            => 'yes',
			'company_name'       => 'شرکت نفس زیست فارمد',
			'company_id'         => 'nafas',
			'welcome_title'      => 'سلام! 👋',
			'welcome_text'       => 'به پورتال پشتیبانی نفس فارمد خوش آمدید.<br>چطور می‌تونم کمکتون کنم؟',
			'header_title'       => 'دستیار هوشمند',
			'disclaimer'         => 'هوش مصنوعی ممکن است اشتباه کند.',

			// نمایش گزینه‌های منو.
			'show_company'       => 'yes',
			'show_products'      => 'yes',
			'show_adr'           => 'yes',
			'show_consult'       => 'yes',

			// متن دکمه‌های منو.
			'company_btn_title'  => 'سوال در مورد شرکت',
			'company_btn_desc'   => 'تاریخچه، خط مشی و اطلاعات تماس',
			'products_btn_title' => 'سوال در مورد محصولات',
			'products_btn_desc'  => 'اطلاعات دارویی، نحوه مصرف و عوارض',
			'adr_btn_title'      => 'ثبت عوارض',
			'consult_btn_title'  => 'درخواست مشاوره',

			// محصولات.
			'products'           => array(
				array( 'id' => 'capsulizer', 'name' => 'کپسولایزر' ),
				array( 'id' => 'coldanese', 'name' => 'کلدانیز پلاس' ),
				array( 'id' => 'folinozit', 'name' => 'فولینوزیت' ),
				array( 'id' => 'meglozek', 'name' => 'مگلوزک' ),
				array( 'id' => 'tiotoriva', 'name' => 'تیوتوریوا' ),
			),

			// ظاهر.
			'position'           => 'right', // right | left.
			'primary_color'      => '#b61615',
			'primary_hover'      => '#991211',
			'theme_mode'         => 'auto', // auto | light | dark.

			// هوش مصنوعی.
			'ai_provider'        => 'fallback', // fallback | gemini | webhook.
			'gemini_api_key'     => '',
			'gemini_model'       => 'gemini-2.0-flash',
			'ai_webhook_url'     => '',
			'ai_system_prompt'   => 'شما دستیار هوشمند شرکت داروسازی نفس زیست فارمد هستید. به سوالات کاربران درباره محصولات دارویی به زبان فارسی، دقیق، کوتاه و محترمانه پاسخ دهید. در صورت نیاز به اطلاعات پزشکی تخصصی، کاربر را به مشورت با پزشک یا داروساز ارجاع دهید.',
			'ai_fallback_msg'    => 'سپاس از سوال شما در مورد این محصول. من دستیار هوشمند نفس فارمد هستم. به زودی قابلیت پاسخگویی پیشرفته فعال خواهد شد. فعلاً برای دریافت اطلاعات دقیق‌تر می‌توانید با شماره‌های شرکت تماس بگیرید یا از بخش «درخواست مشاوره» استفاده کنید.',
			'ai_rate_limit'      => 100, // درخواست در روز برای هر IP.

			// دانش محصولات (per-product knowledge base).
			'product_knowledge'  => array(),

			// اعلان‌ها (بات بله / تلگرام).
			'notify_enabled'     => 'no',
			'notify_platform'    => 'bale', // bale | telegram.
			'notify_token'       => '',
			'notify_chat_id'     => '',

			// اعلان ایمیل.
			'email_enabled'      => 'no',
			'email_to'           => '',
		);
	}

	/**
	 * دریافت تمام تنظیمات (ادغام با پیش‌فرض‌ها).
	 *
	 * @return array
	 */
	public static function all() {
		if ( null !== self::$cache ) {
			return self::$cache;
		}
		$saved        = get_option( self::OPTION_KEY, array() );
		$saved        = is_array( $saved ) ? $saved : array();
		self::$cache  = wp_parse_args( $saved, self::defaults() );
		return self::$cache;
	}

	/**
	 * دریافت یک گزینه.
	 *
	 * @param string $key     کلید.
	 * @param mixed  $default مقدار پیش‌فرض.
	 * @return mixed
	 */
	public static function get( $key, $default = null ) {
		$all = self::all();
		if ( isset( $all[ $key ] ) ) {
			return $all[ $key ];
		}
		return $default;
	}

	/**
	 * ذخیره تنظیمات.
	 *
	 * @param array $settings تنظیمات.
	 */
	public static function update( $settings ) {
		$merged = wp_parse_args( $settings, self::all() );
		update_option( self::OPTION_KEY, $merged );
		self::$cache = null;
	}

	/**
	 * تنظیم مقادیر پیش‌فرض هنگام فعال‌سازی.
	 */
	public static function set_defaults() {
		$existing = get_option( self::OPTION_KEY, false );
		if ( false === $existing ) {
			add_option( self::OPTION_KEY, self::defaults() );
		}
	}

	/**
	 * دریافت لیست محصولات به صورت آرایه id => name.
	 *
	 * @return array
	 */
	public static function products_map() {
		$map = array();
		foreach ( (array) self::get( 'products', array() ) as $p ) {
			if ( ! empty( $p['id'] ) ) {
				$map[ $p['id'] ] = isset( $p['name'] ) ? $p['name'] : $p['id'];
			}
		}
		return $map;
	}
}
