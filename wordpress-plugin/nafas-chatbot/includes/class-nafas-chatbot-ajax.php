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
		return $system;
	}

	/**
	 * تولید پاسخ هوش مصنوعی بر اساس ارائه‌دهنده انتخابی (با حافظه مکالمه).
	 *
	 * @param string $message    پیام کاربر.
	 * @param string $product_id شناسه محصول.
	 * @param array  $history    تاریخچه مکالمه.
	 * @return string
	 */
	protected function generate_ai_reply( $message, $product_id, $history = array() ) {
		$provider = Nafas_Chatbot_Settings::get( 'ai_provider', 'fallback' );

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
		 *
		 * @param string|null $reply اگر مقداردهی شود همان بازگردانده می‌شود.
		 */
		$pre = apply_filters( 'nafas_chatbot_pre_reply', null, $message, $product_id, $product_name );
		if ( null !== $pre ) {
			return (string) $pre;
		}

		$system = $this->build_system_text( $product_name, $knowledge );

		// ساخت آرایه پیام‌ها: تاریخچه + پیام جاری.
		$messages = is_array( $history ) ? $history : array();
		// حذف پیام‌های assistant ابتدایی (برخی APIها باید با نقش user شروع شوند).
		while ( ! empty( $messages ) && isset( $messages[0]['role'] ) && 'assistant' === $messages[0]['role'] ) {
			array_shift( $messages );
		}
		$messages[] = array( 'role' => 'user', 'content' => $message );

		$reply = '';
		switch ( $provider ) {
			case 'gemini':
				$reply = $this->gemini_reply( $system, $messages );
				break;
			case 'openai':
				$reply = $this->openai_compatible_reply(
					'https://api.openai.com/v1/chat/completions',
					Nafas_Chatbot_Settings::get( 'openai_api_key', '' ),
					Nafas_Chatbot_Settings::get( 'openai_model', 'gpt-4o-mini' ),
					$system,
					$messages
				);
				break;
			case 'claude':
				$reply = $this->claude_reply( $system, $messages );
				break;
			case 'custom':
				$reply = $this->openai_compatible_reply(
					Nafas_Chatbot_Settings::get( 'custom_endpoint', '' ),
					Nafas_Chatbot_Settings::get( 'custom_api_key', '' ),
					Nafas_Chatbot_Settings::get( 'custom_model', '' ),
					$system,
					$messages
				);
				break;
			case 'webhook':
				$reply = $this->webhook_reply( $message, $product_id, $product_name, $history );
				break;
		}

		if ( ! empty( $reply ) ) {
			return $reply;
		}

		// fallback.
		return (string) Nafas_Chatbot_Settings::get( 'ai_fallback_msg', '' );
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
				'temperature'     => 0.4,
				'maxOutputTokens' => 800,
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

		$body = array(
			'model'      => $model,
			'max_tokens' => 800,
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
			'max_tokens'  => 800,
			'temperature' => 0.4,
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
		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 25,
				'headers' => $headers,
				'body'    => wp_json_encode( $body ),
			)
		);
		if ( is_wp_error( $response ) ) {
			return null;
		}
		if ( 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		return is_array( $data ) ? $data : null;
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
