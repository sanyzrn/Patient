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

		if ( '' === trim( $message ) ) {
			wp_send_json_error( array( 'message' => 'لطفاً سوال خود را بپرسید.' ), 400 );
		}

		$reply = $this->generate_ai_reply( $message, $product_id );

		wp_send_json_success( array( 'reply' => $reply ) );
	}

	/**
	 * تولید پاسخ هوش مصنوعی بر اساس ارائه‌دهنده انتخابی.
	 *
	 * @param string $message    پیام کاربر.
	 * @param string $product_id شناسه محصول.
	 * @return string
	 */
	protected function generate_ai_reply( $message, $product_id ) {
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

		if ( 'gemini' === $provider ) {
			$reply = $this->gemini_reply( $message, $product_name, $knowledge );
			if ( ! empty( $reply ) ) {
				return $reply;
			}
		} elseif ( 'webhook' === $provider ) {
			$reply = $this->webhook_reply( $message, $product_id, $product_name );
			if ( ! empty( $reply ) ) {
				return $reply;
			}
		}

		// fallback.
		return (string) Nafas_Chatbot_Settings::get( 'ai_fallback_msg', '' );
	}

	/**
	 * فراخوانی Gemini API.
	 *
	 * @param string $message      پیام.
	 * @param string $product_name نام محصول.
	 * @param string $knowledge    دانش محصول.
	 * @return string
	 */
	protected function gemini_reply( $message, $product_name, $knowledge ) {
		$api_key = Nafas_Chatbot_Settings::get( 'gemini_api_key', '' );
		if ( empty( $api_key ) ) {
			return '';
		}
		$model  = Nafas_Chatbot_Settings::get( 'gemini_model', 'gemini-2.0-flash' );
		$system = Nafas_Chatbot_Settings::get( 'ai_system_prompt', '' );

		$context = $system . "\n\n";
		if ( $product_name ) {
			$context .= 'موضوع گفتگو: ' . $product_name . "\n";
		}
		if ( $knowledge ) {
			$context .= "اطلاعات مرجع برای پاسخ‌گویی:\n" . $knowledge . "\n";
		}
		$context .= "\nسوال کاربر: " . $message;

		$endpoint = sprintf(
			'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s',
			rawurlencode( $model ),
			rawurlencode( $api_key )
		);

		$body = array(
			'contents'         => array(
				array(
					'parts' => array(
						array( 'text' => $context ),
					),
				),
			),
			'generationConfig' => array(
				'temperature'     => 0.4,
				'maxOutputTokens' => 800,
			),
		);

		$response = wp_remote_post(
			$endpoint,
			array(
				'timeout' => 20,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return '';
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== (int) $code ) {
			return '';
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( isset( $data['candidates'][0]['content']['parts'][0]['text'] ) ) {
			return trim( $data['candidates'][0]['content']['parts'][0]['text'] );
		}
		return '';
	}

	/**
	 * فراخوانی Webhook سفارشی.
	 *
	 * @param string $message      پیام.
	 * @param string $product_id   شناسه محصول.
	 * @param string $product_name نام محصول.
	 * @return string
	 */
	protected function webhook_reply( $message, $product_id, $product_name ) {
		$url = Nafas_Chatbot_Settings::get( 'ai_webhook_url', '' );
		if ( empty( $url ) ) {
			return '';
		}
		$response = wp_remote_post(
			$url,
			array(
				'timeout' => 20,
				'headers' => array( 'Content-Type' => 'application/json' ),
				'body'    => wp_json_encode(
					array(
						'message'      => $message,
						'product'      => $product_id,
						'product_name' => $product_name,
					)
				),
			)
		);
		if ( is_wp_error( $response ) ) {
			return '';
		}
		$raw  = wp_remote_retrieve_body( $response );
		$data = json_decode( $raw, true );
		if ( is_array( $data ) ) {
			if ( isset( $data['reply'] ) ) {
				return (string) $data['reply'];
			}
			if ( isset( $data['message'] ) ) {
				return (string) $data['message'];
			}
		}
		return $raw ? $raw : '';
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

		// اعتبارسنجی.
		if ( mb_strlen( $name ) < 2 || mb_strlen( $name ) > 80 ) {
			wp_send_json_error( array( 'message' => 'نام نامعتبر است.' ), 400 );
		}
		if ( ! preg_match( '/^(\+98|0)?9\d{9}$/', $phone ) ) {
			wp_send_json_error( array( 'message' => 'شماره موبایل نامعتبر است.' ), 400 );
		}
		if ( mb_strlen( $description ) < 10 || mb_strlen( $description ) > 1000 ) {
			wp_send_json_error( array( 'message' => 'طول توضیحات نامعتبر است.' ), 400 );
		}

		$row = array(
			'type'        => $type,
			'name'        => $name,
			'phone'       => $phone,
			'description' => $description,
			'product'     => $product ? $product : null,
			'ip'          => $this->get_ip(),
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
		$msg .= "\n📝 متن درخواست:\n" . $row['description'] . "\n\n";
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
