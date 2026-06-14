<?php
/**
 * هندلرهای AJAX برای چت و ثبت فرم.
 *
 * @package NafasChatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * کلاس AJAX.
 */
class Nafas_Chatbot_Ajax {

	/**
	 * راه‌اندازی هوک‌ها.
	 */
	public function __construct() {
		// چت (برای کاربران لاگین‌شده و مهمان).
		add_action( 'wp_ajax_nafas_chatbot_chat', array( $this, 'handle_chat' ) );
		add_action( 'wp_ajax_nopriv_nafas_chatbot_chat', array( $this, 'handle_chat' ) );

		// ثبت فرم.
		add_action( 'wp_ajax_nafas_chatbot_submit', array( $this, 'handle_submit' ) );
		add_action( 'wp_ajax_nopriv_nafas_chatbot_submit', array( $this, 'handle_submit' ) );

		// تست اتصال هوش مصنوعی (فقط مدیر).
		add_action( 'wp_ajax_nafas_chatbot_test_ai', array( $this, 'handle_test_ai' ) );
	}

	/**
	 * آخرین خطای فراخوانی API (برای تشخیص در تست اتصال).
	 *
	 * @var string
	 */
	protected $last_error = '';

	/**
	 * تست اتصال به موتور هوش مصنوعی پیکربندی‌شده و بازگرداندن نتیجه/خطای واقعی.
	 */
	public function handle_test_ai() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => 'دسترسی غیرمجاز.' ), 403 );
		}
		check_ajax_referer( 'nafas_chatbot_admin', 'nonce' );

		$provider = Nafas_Chatbot_Settings::get( 'ai_provider', 'fallback' );
		if ( 'fallback' === $provider ) {
			wp_send_json_error( array( 'message' => 'موتور پاسخ‌گویی روی «پیام ثابت» تنظیم شده است. ابتدا یک موتور هوش مصنوعی را انتخاب و ذخیره کنید.' ) );
		}

		$this->last_error = '';
		$system   = $this->build_system_text( '', '' );
		$messages = array( array( 'role' => 'user', 'content' => 'سلام، لطفاً در یک جمله کوتاه خودت را معرفی کن.' ) );

		switch ( $provider ) {
			case 'gemini':
				$reply = $this->gemini_reply( $system, $messages );
				break;
			case 'openai':
				$reply = $this->openai_compatible_reply( 'https://api.openai.com/v1/chat/completions', Nafas_Chatbot_Settings::get( 'openai_api_key', '' ), Nafas_Chatbot_Settings::get( 'openai_model', 'gpt-4o-mini' ), $system, $messages );
				break;
			case 'claude':
				$reply = $this->claude_reply( $system, $messages );
				break;
			case 'custom':
				$reply = $this->openai_compatible_reply( Nafas_Chatbot_Settings::get( 'custom_endpoint', '' ), Nafas_Chatbot_Settings::get( 'custom_api_key', '' ), Nafas_Chatbot_Settings::get( 'custom_model', '' ), $system, $messages );
				break;
			case 'webhook':
				$reply = $this->webhook_reply( 'سلام', 'test', '', array() );
				break;
			default:
				$reply = '';
		}

		if ( ! empty( $reply ) ) {
			wp_send_json_success(
				array(
					'message' => 'اتصال موفق بود ✅',
					'reply'   => $reply,
				)
			);
		}

		$err = $this->last_error ? $this->last_error : 'پاسخی از سرویس دریافت نشد (ممکن است کلید، نام مدل یا آدرس نادرست باشد، یا دسترسی سرور به این سرویس مسدود باشد).';
		wp_send_json_error( array( 'message' => $err ) );
	}

	/**
	 * دریافت IP کاربر.
	 *
	 * @return string
	 */
	protected function get_ip() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		return $ip;
	}

	/**
	 * کنترل محدودیت تعداد درخواست روزانه بر اساس IP.
	 *
	 * @param string $bucket نام سطل (chat یا submit).
	 * @return bool true اگر مجاز باشد.
	 */
	protected function check_rate_limit( $bucket ) {
		$limit = (int) Nafas_Chatbot_Settings::get( 'ai_rate_limit', 100 );
		if ( $limit <= 0 ) {
			return true;
		}
		$ip    = $this->get_ip();
		$key   = 'nafas_rl_' . $bucket . '_' . md5( $ip . gmdate( 'Y-m-d' ) );
		$count = (int) get_transient( $key );
		if ( $count >= $limit ) {
			return false;
		}
		set_transient( $key, $count + 1, DAY_IN_SECONDS );
		return true;
	}

	/**
	 * هندلر چت.
	 */
	public function handle_chat() {
		check_ajax_referer( 'nafas_chatbot_nonce', 'nonce' );

		if ( ! $this->check_rate_limit( 'chat' ) ) {
			wp_send_json_error( array( 'message' => 'محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.' ), 429 );
		}

		$message    = isset( $_POST['message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['message'] ) ) : '';
		$product_id = isset( $_POST['product'] ) ? sanitize_text_field( wp_unslash( $_POST['product'] ) ) : 'general';
		$history    = $this->parse_history( isset( $_POST['history'] ) ? wp_unslash( $_POST['history'] ) : '' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- در parse_history پاکسازی می‌شود.

		if ( '' === trim( $message ) ) {
			wp_send_json_error( array( 'message' => 'لطفاً سوال خود را بپرسید.' ), 400 );
		}

		$reply = $this->generate_ai_reply( $message, $product_id, $history );

		// ثبت گفتگو در آمار داشبورد.
		$products_map = Nafas_Chatbot_Settings::products_map();
		$company_id   = Nafas_Chatbot_Settings::get( 'company_id', 'nafas' );
		if ( $company_id === $product_id ) {
			$pname = Nafas_Chatbot_Settings::get( 'company_name', '' );
		} else {
			$pname = isset( $products_map[ $product_id ] ) ? $products_map[ $product_id ] : '';
		}
		Nafas_Chatbot_DB::record_chat( $product_id, $pname );

		// ثبت در تاریخچه گفتگو (در صورت فعال بودن و وجود پاسخ معتبر).
		if ( 'yes' === Nafas_Chatbot_Settings::get( 'chatlog_enabled', 'yes' )
			&& in_array( $this->last_source, array( 'ai', 'bank' ), true )
			&& 0 !== mb_strpos( (string) $reply, '⚠️' ) ) {
			Nafas_Chatbot_DB::log_chat_entry(
				array(
					'product'  => $product_id,
					'question' => $message,
					'answer'   => $reply,
					'source'   => $this->last_source,
					'ip'       => $this->get_ip(),
				)
			);
		}

		wp_send_json_success( array( 'reply' => $reply ) );
	}

	/**
	 * پاکسازی و آماده‌سازی تاریخچه مکالمه دریافتی از کلاینت (حافظه مکالمه سبک).
	 *
	 * @param string $raw رشته JSON تاریخچه.
	 * @return array آرایه‌ای از { role, content } با نقش‌های user/assistant.
	 */
	protected function parse_history( $raw ) {
		if ( empty( $raw ) ) {
			return array();
		}
		$decoded = json_decode( is_string( $raw ) ? $raw : wp_json_encode( $raw ), true );
		if ( ! is_array( $decoded ) ) {
			return array();
		}

		$limit = (int) Nafas_Chatbot_Settings::get( 'ai_history_limit', 8 );
		$limit = max( 0, min( 20, $limit ) );
		if ( 0 === $limit ) {
			return array();
		}

		$out = array();
		foreach ( $decoded as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['role'], $item['content'] ) ) {
				continue;
			}
			$role = ( 'assistant' === $item['role'] ) ? 'assistant' : 'user';
			$text = sanitize_textarea_field( (string) $item['content'] );
			if ( '' === trim( $text ) ) {
				continue;
			}
			// محدودسازی طول هر پیام برای کنترل مصرف توکن.
			if ( mb_strlen( $text ) > 1500 ) {
				$text = mb_substr( $text, 0, 1500 );
			}
			$out[] = array( 'role' => $role, 'content' => $text );
		}

		// فقط آخرین N پیام را نگه می‌داریم.
		if ( count( $out ) > $limit ) {
			$out = array_slice( $out, -$limit );
		}
		return $out;
	}

	/**
	 * ساخت متن سیستمی (دستورالعمل + زمینه محصول + دانش).
	 *
	 * @param string $product_name نام محصول/شرکت فعال.
	 * @param string $knowledge    پایگاه دانش محصول.
	 * @return string
	 */
	protected function build_system_text( $product_name, $knowledge ) {
		$system = (string) Nafas_Chatbot_Settings::get( 'ai_system_prompt', '' );
		if ( $product_name ) {
			$system .= "\n\nموضوع جاری گفتگو: «" . $product_name . '». ' .
				'تمام سوالات کاربر مربوط به همین موضوع است، حتی اگر نام آن را دوباره ذکر نکند.';
		}
		if ( $knowledge ) {
			$system .= "\n\nاطلاعات مرجع برای پاسخ‌گویی:\n" . $knowledge;
		}
		// حالت سخت‌گیرانه: فقط از پایگاه دانش پاسخ بده.
		if ( 'yes' === Nafas_Chatbot_Settings::get( 'ai_strict_knowledge', 'no' ) ) {
			$system .= "\n\n[قانون مهم]: فقط و فقط بر اساس «اطلاعات مرجع» بالا پاسخ بده. " .
				'اگر پاسخ سوال در اطلاعات مرجع موجود نیست، صریحاً بگو که اطلاعات کافی در این مورد نداری و ' .
				'کاربر را به تماس با شرکت یا بخش «درخواست مشاوره» ارجاع بده. از دانش عمومی خودت استفاده نکن و چیزی از خودت نساز.';
		}
		return $system;
	}

	/**
	 * دریافت میزان خلاقیت (temperature) به‌صورت عدد.
	 *
	 * @return float
	 */
	protected function get_temperature() {
		$t = (float) Nafas_Chatbot_Settings::get( 'ai_temperature', 0.4 );
		return max( 0, min( 1, $t ) );
	}

	/**
	 * دریافت حداکثر طول پاسخ.
	 *
	 * @return int
	 */
	protected function get_max_tokens() {
		$m = (int) Nafas_Chatbot_Settings::get( 'ai_max_tokens', 800 );
		return max( 100, min( 4000, $m ) );
	}

	/**
	 * منبع آخرین پاسخ (ai | bank | fallback | filter) برای ثبت در تاریخچه.
	 *
	 * @var string
	 */
	public $last_source = 'fallback';

	/**
	 * تولید پاسخ بر اساس جریان: اول AI، سپس بانک سوال/جواب آفلاین، سپس پیام پیش‌فرض.
	 * (ترتیب با تنظیم qa_mode قابل تغییر است.)
	 *
	 * @param string $message    پیام کاربر.
	 * @param string $product_id شناسه محصول.
	 * @param array  $history    تاریخچه مکالمه.
	 * @return string
	 */
	protected function generate_ai_reply( $message, $product_id, $history = array() ) {
		$this->last_error  = '';
		$this->last_source = 'fallback';

		$provider = Nafas_Chatbot_Settings::get( 'ai_provider', 'fallback' );
		$qa_mode  = Nafas_Chatbot_Settings::get( 'qa_mode', 'ai_first' );

		// نام محصول.
		$products_map = Nafas_Chatbot_Settings::products_map();
		$company_id   = Nafas_Chatbot_Settings::get( 'company_id', 'nafas' );
		if ( $company_id === $product_id ) {
			$product_name = Nafas_Chatbot_Settings::get( 'company_name', '' );
		} else {
			$product_name = isset( $products_map[ $product_id ] ) ? $products_map[ $product_id ] : $product_id;
		}

		// دانش محصول.
		$knowledge_all = (array) Nafas_Chatbot_Settings::get( 'product_knowledge', array() );
		$knowledge     = isset( $knowledge_all[ $product_id ] ) ? $knowledge_all[ $product_id ] : '';

		/**
		 * فیلتر برای جایگزینی کامل منطق پاسخ‌گویی.
		 */
		$pre = apply_filters( 'nafas_chatbot_pre_reply', null, $message, $product_id, $product_name );
		if ( null !== $pre ) {
			$this->last_source = 'filter';
			return (string) $pre;
		}

		$use_ai = ( 'fallback' !== $provider && 'bank_only' !== $qa_mode );

		// حالت «اول بانک».
		if ( 'bank_first' === $qa_mode || 'bank_only' === $qa_mode ) {
			$bank = $this->bank_reply( $product_id, $message );
			if ( '' !== $bank ) {
				$this->last_source = 'bank';
				return $bank;
			}
		}

		// تلاش با هوش مصنوعی.
		if ( $use_ai ) {
			$system   = $this->build_system_text( $product_name, $knowledge );
			$messages = is_array( $history ) ? $history : array();
			// حذف پیام‌های assistant ابتدایی (برخی APIها باید با نقش user شروع شوند).
			while ( ! empty( $messages ) && isset( $messages[0]['role'] ) && 'assistant' === $messages[0]['role'] ) {
				array_shift( $messages );
			}
			$messages[] = array( 'role' => 'user', 'content' => $message );

			$reply = $this->dispatch_ai( $provider, $message, $product_id, $product_name, $system, $messages, $history );
			if ( ! empty( $reply ) ) {
				$this->last_source = 'ai';
				return $reply;
			}
			// ثبت خطای AI در لاگ برای عیب‌یابی.
			if ( $this->last_error ) {
				error_log( '[Nafas Chatbot] AI (' . $provider . ') failed: ' . $this->last_error ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		}

		// حالت «اول AI»: اکنون سراغ بانک می‌رویم (در bank_first قبلاً امتحان شده).
		if ( 'bank_first' !== $qa_mode ) {
			$bank = $this->bank_reply( $product_id, $message );
			if ( '' !== $bank ) {
				$this->last_source = 'bank';
				return $bank;
			}
		}

		// نمایش خطای واقعی AI فقط برای مدیران (وقتی بانک هم پاسخی نداشت).
		if ( $use_ai && $this->last_error && current_user_can( 'manage_options' ) ) {
			return '⚠️ [پیام فقط برای مدیر] خطای موتور هوش مصنوعی: ' . $this->last_error;
		}

		// پیام پیش‌فرض.
		return (string) Nafas_Chatbot_Settings::get( 'ai_fallback_msg', '' );
	}

	/**
	 * فراخوانی ارائه‌دهنده هوش مصنوعی انتخابی.
	 *
	 * @param string $provider     ارائه‌دهنده.
	 * @param string $message      پیام جاری.
	 * @param string $product_id   شناسه محصول.
	 * @param string $product_name نام محصول.
	 * @param string $system       متن سیستمی.
	 * @param array  $messages     پیام‌ها (تاریخچه + جاری).
	 * @param array  $history      تاریخچه خام (برای webhook).
	 * @return string
	 */
	protected function dispatch_ai( $provider, $message, $product_id, $product_name, $system, $messages, $history ) {
		switch ( $provider ) {
			case 'gemini':
				return $this->gemini_reply( $system, $messages );
			case 'openai':
				return $this->openai_compatible_reply(
					'https://api.openai.com/v1/chat/completions',
					Nafas_Chatbot_Settings::get( 'openai_api_key', '' ),
					Nafas_Chatbot_Settings::get( 'openai_model', 'gpt-4o-mini' ),
					$system,
					$messages
				);
			case 'claude':
				return $this->claude_reply( $system, $messages );
			case 'custom':
				return $this->openai_compatible_reply(
					Nafas_Chatbot_Settings::get( 'custom_endpoint', '' ),
					Nafas_Chatbot_Settings::get( 'custom_api_key', '' ),
					Nafas_Chatbot_Settings::get( 'custom_model', '' ),
					$system,
					$messages
				);
			case 'webhook':
				return $this->webhook_reply( $message, $product_id, $product_name, $history );
		}
		return '';
	}

	/**
	 * نرمال‌سازی متن فارسی برای تطبیق (یکسان‌سازی ی/ک، حذف اعراب و علائم).
	 *
	 * @param string $text متن.
	 * @return string
	 */
	protected function normalize_fa( $text ) {
		$text = (string) $text;
		// یکسان‌سازی حروف عربی/فارسی.
		$text = str_replace( array( 'ي', 'ك', 'ۀ', 'ة', 'أ', 'إ', 'آ', 'ؤ', 'ئ' ), array( 'ی', 'ک', 'ه', 'ه', 'ا', 'ا', 'ا', 'و', 'ی' ), $text );
		// حذف اعراب و کشیده.
		$text = preg_replace( '/[\x{064B}-\x{065F}\x{0670}\x{0640}]/u', '', $text );
		// تبدیل علائم و ارقام به فاصله.
		$text = preg_replace( '/[\x{200C}\x{200F}\x{200E}]/u', ' ', $text ); // نیم‌فاصله و علائم جهت.
		$text = preg_replace( '/[^\p{L}\p{N}\s]/u', ' ', $text );
		$text = preg_replace( '/\s+/u', ' ', $text );
		return trim( mb_strtolower( $text ) );
	}

	/**
	 * توکن‌سازی با حذف کلمات پرتکرار کم‌اهمیت.
	 *
	 * @param string $text متن نرمال‌شده.
	 * @return array
	 */
	protected function tokenize_fa( $text ) {
		$stop = array( 'و', 'در', 'به', 'از', 'که', 'را', 'با', 'این', 'آن', 'است', 'هست', 'برای', 'یا', 'تا', 'هم', 'چه', 'چی', 'چیست', 'چطور', 'چگونه', 'ایا', 'آیا', 'می', 'شود', 'کنم', 'کنید', 'کرد', 'های', 'ها', 'یک', 'من', 'شما', 'لطفا', 'لطفاً', 'بگو', 'بگویید', 'دارد', 'دارم', 'مورد', 'درباره', 'راجع' );
		$tokens = array_filter(
			explode( ' ', $text ),
			function ( $t ) use ( $stop ) {
				return '' !== $t && mb_strlen( $t ) > 1 && ! in_array( $t, $stop, true );
			}
		);
		return array_values( array_unique( $tokens ) );
	}

	/**
	 * یافتن پاسخ از بانک سوال/جواب آفلاین.
	 *
	 * @param string $product_id شناسه محصول.
	 * @param string $message    پیام کاربر.
	 * @return string پاسخ یا رشته خالی.
	 */
	protected function bank_reply( $product_id, $message ) {
		$bank = (array) Nafas_Chatbot_Settings::get( 'qa_bank', array() );
		if ( empty( $bank ) ) {
			return '';
		}

		$company_id  = Nafas_Chatbot_Settings::get( 'company_id', 'nafas' );
		$user_tokens = $this->tokenize_fa( $this->normalize_fa( $message ) );
		if ( empty( $user_tokens ) ) {
			return '';
		}

		$best       = '';
		$best_score = 0;

		foreach ( $bank as $entry ) {
			if ( empty( $entry['answer'] ) ) {
				continue;
			}
			$ep = isset( $entry['product'] ) ? $entry['product'] : 'general';
			// فقط ردیف‌های همان محصول یا عمومی.
			if ( 'general' !== $ep && $ep !== $product_id && ! ( $company_id === $product_id && 'general' === $ep ) ) {
				continue;
			}

			// مجموعه توکن‌های مرجع: سوال + کلیدواژه‌ها.
			$ref  = $this->normalize_fa( isset( $entry['question'] ) ? $entry['question'] : '' );
			$kw   = isset( $entry['keywords'] ) ? str_replace( array( '|', '،', ',' ), ' ', $entry['keywords'] ) : '';
			$ref .= ' ' . $this->normalize_fa( $kw );
			$ref_tokens = $this->tokenize_fa( $ref );
			if ( empty( $ref_tokens ) ) {
				continue;
			}

			// امتیاز: نسبت توکن‌های مشترک به توکن‌های سوال کاربر.
			$common = array_intersect( $user_tokens, $ref_tokens );
			$score  = count( $common ) / max( 1, count( $user_tokens ) );
			// امتیاز اضافه برای تطبیق کلیدواژه مستقیم.
			$kw_tokens = $this->tokenize_fa( $this->normalize_fa( $kw ) );
			if ( $kw_tokens && array_intersect( $user_tokens, $kw_tokens ) ) {
				$score += 0.25;
			}

			if ( $score > $best_score ) {
				$best_score = $score;
				$best       = $entry['answer'];
			}
		}

		/**
		 * آستانه پذیرش تطبیق بانک (۰ تا ۱).
		 *
		 * @param float $threshold آستانه.
		 */
		$threshold = (float) apply_filters( 'nafas_chatbot_bank_threshold', 0.34 );
		return ( $best_score >= $threshold ) ? (string) $best : '';
	}

	/**
	 * فراخوانی Google Gemini (با تاریخچه).
	 *
	 * @param string $system   متن سیستمی.
	 * @param array  $messages پیام‌ها.
	 * @return string
	 */
	protected function gemini_reply( $system, $messages ) {
		$api_key = Nafas_Chatbot_Settings::get( 'gemini_api_key', '' );
		if ( empty( $api_key ) ) {
			return '';
		}
		$model = Nafas_Chatbot_Settings::get( 'gemini_model', 'gemini-2.0-flash' );

		// تبدیل پیام‌ها به فرمت Gemini (نقش‌ها: user / model).
		$contents = array();
		foreach ( $messages as $m ) {
			$contents[] = array(
				'role'  => ( 'assistant' === $m['role'] ) ? 'model' : 'user',
				'parts' => array( array( 'text' => $m['content'] ) ),
			);
		}

		$endpoint = sprintf(
			'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
			rawurlencode( $model ),
			rawurlencode( $api_key )
		);

		$body = array(
			'contents'          => $contents,
			'systemInstruction' => array( 'parts' => array( array( 'text' => $system ) ) ),
			'generationConfig'  => array(
				'temperature'     => $this->get_temperature(),
				'maxOutputTokens' => $this->get_max_tokens(),
			),
		);

		$data = $this->remote_json( $endpoint, array( 'Content-Type' => 'application/json' ), $body );
		if ( isset( $data['candidates'][0]['content']['parts'][0]['text'] ) ) {
			return trim( $data['candidates'][0]['content']['parts'][0]['text'] );
		}
		return '';
	}

	/**
	 * فراخوانی Anthropic Claude (Messages API، با تاریخچه).
	 *
	 * @param string $system   متن سیستمی.
	 * @param array  $messages پیام‌ها.
	 * @return string
	 */
	protected function claude_reply( $system, $messages ) {
		$api_key = Nafas_Chatbot_Settings::get( 'claude_api_key', '' );
		if ( empty( $api_key ) ) {
			return '';
		}
		$model = Nafas_Chatbot_Settings::get( 'claude_model', 'claude-opus-4-8' );

		$msgs = array();
		foreach ( $messages as $m ) {
			$msgs[] = array(
				'role'    => ( 'assistant' === $m['role'] ) ? 'assistant' : 'user',
				'content' => $m['content'],
			);
		}

		// نکته: مدل‌های Claude 4.x پارامتر temperature را نمی‌پذیرند، پس ارسال نمی‌شود.
		$body = array(
			'model'      => $model,
			'max_tokens' => $this->get_max_tokens(),
			'system'     => $system,
			'messages'   => $msgs,
		);

		$data = $this->remote_json(
			'https://api.anthropic.com/v1/messages',
			array(
				'Content-Type'      => 'application/json',
				'x-api-key'         => $api_key,
				'anthropic-version' => '2023-06-01',
			),
			$body
		);

		// استخراج متن از بلوک‌های پاسخ.
		if ( isset( $data['content'] ) && is_array( $data['content'] ) ) {
			$text = '';
			foreach ( $data['content'] as $block ) {
				if ( isset( $block['type'], $block['text'] ) && 'text' === $block['type'] ) {
					$text .= $block['text'];
				}
			}
			return trim( $text );
		}
		return '';
	}

	/**
	 * فراخوانی APIهای سازگار با OpenAI (OpenAI و Custom).
	 *
	 * @param string $endpoint آدرس کامل endpoint.
	 * @param string $api_key  کلید API.
	 * @param string $model    نام مدل.
	 * @param string $system   متن سیستمی.
	 * @param array  $messages پیام‌ها.
	 * @return string
	 */
	protected function openai_compatible_reply( $endpoint, $api_key, $model, $system, $messages ) {
		if ( empty( $endpoint ) || empty( $model ) ) {
			return '';
		}

		$msgs = array();
		if ( $system ) {
			$msgs[] = array( 'role' => 'system', 'content' => $system );
		}
		foreach ( $messages as $m ) {
			$msgs[] = array(
				'role'    => ( 'assistant' === $m['role'] ) ? 'assistant' : 'user',
				'content' => $m['content'],
			);
		}

		$headers = array( 'Content-Type' => 'application/json' );
		if ( $api_key ) {
			$headers['Authorization'] = 'Bearer ' . $api_key;
		}

		$body = array(
			'model'       => $model,
			'messages'    => $msgs,
			'max_tokens'  => $this->get_max_tokens(),
			'temperature' => $this->get_temperature(),
		);

		$data = $this->remote_json( $endpoint, $headers, $body );
		if ( isset( $data['choices'][0]['message']['content'] ) ) {
			return trim( $data['choices'][0]['message']['content'] );
		}
		return '';
	}

	/**
	 * ارسال درخواست POST JSON و دریافت پاسخ JSON.
	 *
	 * @param string $url     آدرس.
	 * @param array  $headers هدرها.
	 * @param array  $body    بدنه.
	 * @return array|null
	 */
	protected function remote_json( $url, $headers, $body ) {
		/**
		 * مهلت پاسخ‌گویی API (ثانیه). مدل‌های رایگان گاهی کند هستند؛ مقدار بالاتر از خطای timeout جلوگیری می‌کند.
		 *
		 * @param int $timeout مهلت بر حسب ثانیه.
		 */
		$timeout = (int) apply_filters( 'nafas_chatbot_http_timeout', 60 );

		$response = wp_remote_post(
			$url,
			array(
				'timeout' => $timeout,
				'headers' => $headers,
				'body'    => wp_json_encode( $body ),
			)
		);
		if ( is_wp_error( $response ) ) {
			$this->last_error = 'خطای اتصال: ' . $response->get_error_message();
			return null;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$raw  = wp_remote_retrieve_body( $response );
		if ( 200 !== $code ) {
			// استخراج پیام خطای سرویس برای تشخیص بهتر.
			$detail = '';
			$json   = json_decode( $raw, true );
			if ( isset( $json['error']['message'] ) ) {
				$detail = $json['error']['message'];
			} elseif ( isset( $json['error'] ) && is_string( $json['error'] ) ) {
				$detail = $json['error'];
			} elseif ( isset( $json['message'] ) ) {
				$detail = $json['message'];
			} else {
				$detail = mb_substr( wp_strip_all_tags( (string) $raw ), 0, 300 );
			}
			$this->last_error = 'کد خطای HTTP ' . $code . ( $detail ? ' — ' . $detail : '' );
			return null;
		}
		$data = json_decode( $raw, true );
		if ( ! is_array( $data ) ) {
			$this->last_error = 'پاسخ نامعتبر (JSON قابل پردازش نبود).';
			return null;
		}
		return $data;
	}

	/**
	 * فراخوانی Webhook سفارشی (با تاریخچه).
	 *
	 * @param string $message      پیام.
	 * @param string $product_id   شناسه محصول.
	 * @param string $product_name نام محصول.
	 * @param array  $history      تاریخچه مکالمه.
	 * @return string
	 */
	protected function webhook_reply( $message, $product_id, $product_name, $history = array() ) {
		$url = Nafas_Chatbot_Settings::get( 'ai_webhook_url', '' );
		if ( empty( $url ) ) {
			return '';
		}
		$data = $this->remote_json(
			$url,
			array( 'Content-Type' => 'application/json' ),
			array(
				'message'      => $message,
				'product'      => $product_id,
				'product_name' => $product_name,
				'history'      => $history,
			)
		);
		if ( is_array( $data ) ) {
			if ( isset( $data['reply'] ) ) {
				return (string) $data['reply'];
			}
			if ( isset( $data['message'] ) ) {
				return (string) $data['message'];
			}
		}
		return '';
	}

	/**
	 * هندلر ثبت فرم عوارض / مشاوره.
	 */
	public function handle_submit() {
		check_ajax_referer( 'nafas_chatbot_nonce', 'nonce' );

		if ( ! $this->check_rate_limit( 'submit' ) ) {
			wp_send_json_error( array( 'message' => 'محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.' ), 429 );
		}

		$type        = isset( $_POST['type'] ) ? sanitize_text_field( wp_unslash( $_POST['type'] ) ) : 'نامشخص';
		$name        = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
		$phone       = isset( $_POST['phone'] ) ? sanitize_text_field( wp_unslash( $_POST['phone'] ) ) : '';
		$description = isset( $_POST['description'] ) ? sanitize_textarea_field( wp_unslash( $_POST['description'] ) ) : '';
		$product     = isset( $_POST['product'] ) ? sanitize_text_field( wp_unslash( $_POST['product'] ) ) : '';

		// فیلدهای استاندارد گزارش عوارض دارویی (ADR).
		$severity          = isset( $_POST['severity'] ) ? sanitize_text_field( wp_unslash( $_POST['severity'] ) ) : '';
		$outcome           = isset( $_POST['outcome'] ) ? sanitize_text_field( wp_unslash( $_POST['outcome'] ) ) : '';
		$batch_number      = isset( $_POST['batch_number'] ) ? sanitize_text_field( wp_unslash( $_POST['batch_number'] ) ) : '';
		$concomitant_drugs = isset( $_POST['concomitant_drugs'] ) ? sanitize_textarea_field( wp_unslash( $_POST['concomitant_drugs'] ) ) : '';
		$reporter_type     = isset( $_POST['reporter_type'] ) ? sanitize_text_field( wp_unslash( $_POST['reporter_type'] ) ) : '';

		// اعتبارسنجی پایه.
		if ( mb_strlen( $name ) < 2 || mb_strlen( $name ) > 80 ) {
			wp_send_json_error( array( 'message' => 'نام نامعتبر است.' ), 400 );
		}
		if ( ! preg_match( '/^(\+98|0)?9\d{9}$/', $phone ) ) {
			wp_send_json_error( array( 'message' => 'شماره موبایل نامعتبر است.' ), 400 );
		}
		if ( mb_strlen( $description ) < 10 || mb_strlen( $description ) > 1000 ) {
			wp_send_json_error( array( 'message' => 'طول توضیحات نامعتبر است.' ), 400 );
		}

		$is_adr = ( false !== mb_strpos( $type, 'عوارض' ) );

		// اعتبارسنجی گزینه‌های ADR در برابر مقادیر مجاز.
		if ( $is_adr ) {
			$opts = Nafas_Chatbot_Settings::adr_options();
			if ( $severity && ! in_array( $severity, $opts['severity'], true ) ) {
				$severity = '';
			}
			if ( $outcome && ! in_array( $outcome, $opts['outcome'], true ) ) {
				$outcome = '';
			}
			if ( $reporter_type && ! in_array( $reporter_type, $opts['reporter_type'], true ) ) {
				$reporter_type = '';
			}
		}

		$row = array(
			'type'              => $type,
			'name'              => $name,
			'phone'             => $phone,
			'description'       => $description,
			'product'           => $product ? $product : null,
			'severity'          => $is_adr && $severity ? $severity : null,
			'outcome'           => $is_adr && $outcome ? $outcome : null,
			'batch_number'      => $is_adr && $batch_number ? $batch_number : null,
			'concomitant_drugs' => $is_adr && $concomitant_drugs ? $concomitant_drugs : null,
			'reporter_type'     => $is_adr && $reporter_type ? $reporter_type : null,
			'ip'                => $this->get_ip(),
		);

		$id = Nafas_Chatbot_DB::insert( $row );
		if ( ! $id ) {
			wp_send_json_error( array( 'message' => 'خطا در ذخیره‌سازی اطلاعات. لطفاً مجدداً تلاش کنید.' ), 500 );
		}

		// اعلان‌ها.
		$this->maybe_send_messenger_notification( $row );
		$this->maybe_send_email_notification( $row );

		/**
		 * اکشن پس از ثبت موفق درخواست.
		 */
		do_action( 'nafas_chatbot_after_submit', $id, $row );

		wp_send_json_success( array( 'message' => 'اطلاعات با موفقیت ثبت و ارسال شد.' ) );
	}

	/**
	 * ساخت متن پیام اعلان.
	 *
	 * @param array $row داده‌ها.
	 * @return string
	 */
	protected function build_notification_text( $row ) {
		$msg  = "📥 دریافت درخواست جدید از پورتال آموزش بیمار\n\n";
		$msg .= '📋 نوع فرم: ' . $row['type'] . "\n";
		$msg .= '👤 نام کاربر: ' . $row['name'] . "\n";
		$msg .= '📞 شماره تماس: ' . $row['phone'] . "\n";
		if ( ! empty( $row['product'] ) ) {
			$msg .= '💊 محصول مرتبط: ' . $row['product'] . "\n";
		}

		// بخش استاندارد گزارش عوارض دارویی.
		$has_adr = ! empty( $row['severity'] ) || ! empty( $row['outcome'] ) || ! empty( $row['batch_number'] ) || ! empty( $row['concomitant_drugs'] ) || ! empty( $row['reporter_type'] );
		if ( $has_adr ) {
			$msg .= "\n— — — گزارش استاندارد عارضه — — —\n";
			if ( ! empty( $row['reporter_type'] ) ) {
				$msg .= '🧑‍⚕️ نوع گزارش‌دهنده: ' . $row['reporter_type'] . "\n";
			}
			if ( ! empty( $row['severity'] ) ) {
				$msg .= '⚠️ شدت عارضه: ' . $row['severity'] . "\n";
			}
			if ( ! empty( $row['outcome'] ) ) {
				$msg .= '🏁 پیامد: ' . $row['outcome'] . "\n";
			}
			if ( ! empty( $row['batch_number'] ) ) {
				$msg .= '🔢 شماره سری ساخت (Batch): ' . $row['batch_number'] . "\n";
			}
			if ( ! empty( $row['concomitant_drugs'] ) ) {
				$msg .= '💊 داروهای مصرفی همزمان: ' . $row['concomitant_drugs'] . "\n";
			}
		}

		$msg .= "\n📝 شرح:\n" . $row['description'] . "\n\n";
		$msg .= '⏰ زمان ثبت: ' . current_time( 'H:i - Y/m/d' );
		return $msg;
	}

	/**
	 * ارسال اعلان به پیام‌رسان (بله یا تلگرام).
	 *
	 * @param array $row داده‌ها.
	 */
	protected function maybe_send_messenger_notification( $row ) {
		if ( 'yes' !== Nafas_Chatbot_Settings::get( 'notify_enabled', 'no' ) ) {
			return;
		}
		$token   = Nafas_Chatbot_Settings::get( 'notify_token', '' );
		$chat_id = Nafas_Chatbot_Settings::get( 'notify_chat_id', '' );
		if ( empty( $token ) || empty( $chat_id ) ) {
			return;
		}
		$platform = Nafas_Chatbot_Settings::get( 'notify_platform', 'bale' );
		$base      = 'telegram' === $platform ? 'https://api.telegram.org/bot' : 'https://tapi.bale.ai/bot';
		$url       = $base . $token . '/sendMessage';

		wp_remote_post(
			$url,
			array(
				'timeout' => 8,
				'body'    => array(
					'chat_id' => $chat_id,
					'text'    => $this->build_notification_text( $row ),
				),
			)
		);
	}

	/**
	 * ارسال اعلان ایمیلی.
	 *
	 * @param array $row داده‌ها.
	 */
	protected function maybe_send_email_notification( $row ) {
		if ( 'yes' !== Nafas_Chatbot_Settings::get( 'email_enabled', 'no' ) ) {
			return;
		}
		$to = Nafas_Chatbot_Settings::get( 'email_to', '' );
		if ( empty( $to ) ) {
			$to = get_option( 'admin_email' );
		}
		$subject = 'درخواست جدید: ' . $row['type'];
		wp_mail( $to, $subject, $this->build_notification_text( $row ) );
	}
}
