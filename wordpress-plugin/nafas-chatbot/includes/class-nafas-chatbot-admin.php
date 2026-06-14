<?php
/**
 * پنل مدیریت وردپرس.
 *
 * @package NafasChatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * کلاس Admin.
 */
class Nafas_Chatbot_Admin {

	/**
	 * راه‌اندازی.
	 */
	public function __construct() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_init', array( $this, 'handle_actions' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_action( 'admin_post_nafas_chatbot_export', array( $this, 'export_csv' ) );
	}

	/**
	 * ثبت منوی مدیریت.
	 */
	public function register_menu() {
		$counts   = Nafas_Chatbot_DB::counts();
		$new_count = 0;
		// شمارش درخواست‌های جدید برای نشان (badge).
		global $wpdb;
		$table     = Nafas_Chatbot_DB::table_name();
		// phpcs:ignore WordPress.DB
		$new_count = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE status = %s", 'new' ) );

		$badge = $new_count > 0 ? ' <span class="awaiting-mod">' . esc_html( number_format_i18n( $new_count ) ) . '</span>' : '';

		add_menu_page(
			esc_html__( 'دستیار هوشمند', 'nafas-chatbot' ),
			esc_html__( 'دستیار هوشمند', 'nafas-chatbot' ) . $badge,
			'manage_options',
			'nafas-chatbot',
			array( $this, 'render_dashboard_page' ),
			'dashicons-format-chat',
			58
		);

		add_submenu_page(
			'nafas-chatbot',
			esc_html__( 'داشبورد', 'nafas-chatbot' ),
			esc_html__( 'داشبورد', 'nafas-chatbot' ),
			'manage_options',
			'nafas-chatbot',
			array( $this, 'render_dashboard_page' )
		);

		add_submenu_page(
			'nafas-chatbot',
			esc_html__( 'درخواست‌ها', 'nafas-chatbot' ),
			esc_html__( 'درخواست‌ها', 'nafas-chatbot' ) . $badge,
			'manage_options',
			'nafas-chatbot-submissions',
			array( $this, 'render_submissions_page' )
		);

		add_submenu_page(
			'nafas-chatbot',
			esc_html__( 'تنظیمات', 'nafas-chatbot' ),
			esc_html__( 'تنظیمات', 'nafas-chatbot' ),
			'manage_options',
			'nafas-chatbot-settings',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * رندر صفحه داشبورد.
	 */
	public function render_dashboard_page() {
		$counts       = Nafas_Chatbot_DB::counts();
		$chat_stats   = Nafas_Chatbot_DB::get_chat_stats();
		$product_subs = Nafas_Chatbot_DB::product_submission_counts();
		$recent       = Nafas_Chatbot_DB::get_recent( 6 );
		require NAFAS_CHATBOT_DIR . 'includes/views/dashboard-page.php';
	}

	/**
	 * بارگذاری استایل ادمین.
	 *
	 * @param string $hook هوک صفحه.
	 */
	public function enqueue_assets( $hook ) {
		if ( false === strpos( $hook, 'nafas-chatbot' ) ) {
			return;
		}
		wp_enqueue_style(
			'nafas-chatbot-admin',
			NAFAS_CHATBOT_URL . 'assets/css/admin.css',
			array(),
			NAFAS_CHATBOT_VERSION
		);
		wp_enqueue_script(
			'nafas-chatbot-admin',
			NAFAS_CHATBOT_URL . 'assets/js/admin.js',
			array( 'jquery', 'wp-color-picker' ),
			NAFAS_CHATBOT_VERSION,
			true
		);
		wp_enqueue_style( 'wp-color-picker' );

		wp_localize_script(
			'nafas-chatbot-admin',
			'NafasAdmin',
			array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'   => wp_create_nonce( 'nafas_chatbot_admin' ),
			)
		);
	}

	/**
	 * پردازش اکشن‌های فرم (ذخیره تنظیمات، تغییر وضعیت، حذف).
	 */
	public function handle_actions() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// ذخیره تنظیمات.
		if ( isset( $_POST['nafas_chatbot_save_settings'] ) ) {
			check_admin_referer( 'nafas_chatbot_settings' );
			$this->save_settings();
			add_action( 'admin_notices', function () {
				echo '<div class="notice notice-success is-dismissible"><p>' . esc_html__( 'تنظیمات با موفقیت ذخیره شد.', 'nafas-chatbot' ) . '</p></div>';
			} );
		}

		// تغییر وضعیت درخواست.
		if ( isset( $_GET['nafas_action'], $_GET['sid'] ) && 'status' === $_GET['nafas_action'] ) {
			check_admin_referer( 'nafas_sub_action' );
			$sid    = (int) $_GET['sid'];
			$status = isset( $_GET['status'] ) ? sanitize_text_field( wp_unslash( $_GET['status'] ) ) : 'new';
			Nafas_Chatbot_DB::update_status( $sid, $status );
			wp_safe_redirect( remove_query_arg( array( 'nafas_action', 'sid', 'status', '_wpnonce' ) ) );
			exit;
		}

		// حذف درخواست.
		if ( isset( $_GET['nafas_action'], $_GET['sid'] ) && 'delete' === $_GET['nafas_action'] ) {
			check_admin_referer( 'nafas_sub_action' );
			Nafas_Chatbot_DB::delete( (int) $_GET['sid'] );
			wp_safe_redirect( remove_query_arg( array( 'nafas_action', 'sid', '_wpnonce' ) ) );
			exit;
		}
	}

	/**
	 * ذخیره تنظیمات از فرم.
	 */
	protected function save_settings() {
		$in = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification -- بررسی شده در handle_actions.

		$fields_text = array(
			'company_name', 'company_id', 'header_title', 'company_btn_title', 'company_btn_desc',
			'products_btn_title', 'products_btn_desc', 'adr_btn_title', 'consult_btn_title',
			'position', 'theme_mode', 'ai_provider', 'gemini_model', 'openai_model',
			'claude_model', 'custom_model', 'notify_platform',
		);
		$fields_textarea = array( 'welcome_text', 'disclaimer', 'ai_system_prompt', 'ai_fallback_msg', 'welcome_title' );
		$fields_raw      = array(
			'gemini_api_key', 'openai_api_key', 'claude_api_key', 'custom_api_key',
			'ai_webhook_url', 'notify_token', 'notify_chat_id', 'email_to',
		);
		$fields_color    = array( 'primary_color', 'primary_hover' );
		$fields_toggle   = array(
			'enabled', 'show_company', 'show_products', 'show_adr', 'show_consult',
			'notify_enabled', 'email_enabled', 'ai_strict_knowledge',
		);

		$new = array();

		foreach ( $fields_text as $f ) {
			$new[ $f ] = isset( $in[ $f ] ) ? sanitize_text_field( $in[ $f ] ) : '';
		}
		foreach ( $fields_textarea as $f ) {
			$new[ $f ] = isset( $in[ $f ] ) ? wp_kses_post( $in[ $f ] ) : '';
		}
		foreach ( $fields_raw as $f ) {
			$new[ $f ] = isset( $in[ $f ] ) ? sanitize_text_field( $in[ $f ] ) : '';
		}
		foreach ( $fields_color as $f ) {
			$new[ $f ] = isset( $in[ $f ] ) ? sanitize_hex_color( $in[ $f ] ) : '';
		}
		foreach ( $fields_toggle as $f ) {
			$new[ $f ] = ( isset( $in[ $f ] ) && ( '1' === (string) $in[ $f ] || 'yes' === $in[ $f ] || 'on' === $in[ $f ] ) ) ? 'yes' : 'no';
		}

		$new['email_to']        = isset( $in['email_to'] ) ? sanitize_email( $in['email_to'] ) : '';
		$new['ai_rate_limit']   = isset( $in['ai_rate_limit'] ) ? max( 0, (int) $in['ai_rate_limit'] ) : 100;
		$new['ai_history_limit'] = isset( $in['ai_history_limit'] ) ? max( 0, min( 20, (int) $in['ai_history_limit'] ) ) : 8;
		$new['ai_temperature']  = isset( $in['ai_temperature'] ) ? (string) max( 0, min( 1, (float) $in['ai_temperature'] ) ) : '0.4';
		$new['ai_max_tokens']   = isset( $in['ai_max_tokens'] ) ? max( 100, min( 4000, (int) $in['ai_max_tokens'] ) ) : 800;
		$new['ai_webhook_url']  = isset( $in['ai_webhook_url'] ) ? esc_url_raw( $in['ai_webhook_url'] ) : '';
		$new['custom_endpoint'] = isset( $in['custom_endpoint'] ) ? esc_url_raw( $in['custom_endpoint'] ) : '';

		// آیکون شناور.
		$new['button_size']     = isset( $in['button_size'] ) ? max( 40, min( 120, (int) $in['button_size'] ) ) : 60;
		$new['icon_size']       = isset( $in['icon_size'] ) ? max( 16, min( 80, (int) $in['icon_size'] ) ) : 28;
		$new['button_icon_url'] = isset( $in['button_icon_url'] ) ? esc_url_raw( $in['button_icon_url'] ) : '';

		// محصولات.
		$products = array();
		if ( isset( $in['product_id'] ) && is_array( $in['product_id'] ) ) {
			$ids       = $in['product_id'];
			$names     = isset( $in['product_name'] ) ? $in['product_name'] : array();
			$know      = isset( $in['product_knowledge'] ) ? $in['product_knowledge'] : array();
			$brochures = isset( $in['product_brochure'] ) ? $in['product_brochure'] : array();
			$knowledge_map = array();
			foreach ( $ids as $i => $pid ) {
				$pid = sanitize_key( $pid );
				if ( empty( $pid ) ) {
					continue;
				}
				$pname      = isset( $names[ $i ] ) ? sanitize_text_field( $names[ $i ] ) : $pid;
				$brochure   = isset( $brochures[ $i ] ) ? esc_url_raw( trim( $brochures[ $i ] ) ) : '';
				$products[] = array( 'id' => $pid, 'name' => $pname, 'brochure' => $brochure );
				if ( isset( $know[ $i ] ) && '' !== trim( $know[ $i ] ) ) {
					$knowledge_map[ $pid ] = sanitize_textarea_field( $know[ $i ] );
				}
			}
			$new['product_knowledge'] = $knowledge_map;
		}
		if ( ! empty( $products ) ) {
			$new['products'] = $products;
		}

		// پاسخ‌های پیشنهادی.
		$new['quick_replies_enabled'] = ( isset( $in['quick_replies_enabled'] ) && ( '1' === (string) $in['quick_replies_enabled'] || 'yes' === $in['quick_replies_enabled'] || 'on' === $in['quick_replies_enabled'] ) ) ? 'yes' : 'no';
		$quick = array();
		if ( isset( $in['quick_reply_label'] ) && is_array( $in['quick_reply_label'] ) ) {
			$labels    = $in['quick_reply_label'];
			$questions = isset( $in['quick_reply_question'] ) ? $in['quick_reply_question'] : array();
			foreach ( $labels as $i => $label ) {
				$label = sanitize_text_field( $label );
				$q     = isset( $questions[ $i ] ) ? sanitize_text_field( $questions[ $i ] ) : '';
				if ( '' === $label || '' === $q ) {
					continue;
				}
				$quick[] = array( 'label' => $label, 'question' => $q );
			}
			$new['quick_replies'] = $quick;
		}

		Nafas_Chatbot_Settings::update( $new );
	}

	/**
	 * رندر صفحه تنظیمات.
	 */
	public function render_settings_page() {
		$s = Nafas_Chatbot_Settings::all();
		require NAFAS_CHATBOT_DIR . 'includes/views/settings-page.php';
	}

	/**
	 * رندر صفحه درخواست‌ها.
	 */
	public function render_submissions_page() {
		$type     = isset( $_GET['type'] ) ? sanitize_text_field( wp_unslash( $_GET['type'] ) ) : '';
		$status   = isset( $_GET['status'] ) ? sanitize_text_field( wp_unslash( $_GET['status'] ) ) : '';
		$search   = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : '';
		$paged    = isset( $_GET['paged'] ) ? max( 1, (int) $_GET['paged'] ) : 1;

		$result = Nafas_Chatbot_DB::get_submissions(
			array(
				'type'     => $type,
				'status'   => $status,
				'search'   => $search,
				'page'     => $paged,
				'per_page' => 20,
			)
		);
		$counts = Nafas_Chatbot_DB::counts();

		require NAFAS_CHATBOT_DIR . 'includes/views/submissions-page.php';
	}

	/**
	 * خروجی CSV درخواست‌ها.
	 */
	public function export_csv() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'دسترسی غیرمجاز', 'nafas-chatbot' ) );
		}
		check_admin_referer( 'nafas_export' );

		$rows = Nafas_Chatbot_DB::get_all_for_export();

		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=nafas-submissions-' . gmdate( 'Y-m-d' ) . '.csv' );

		$out = fopen( 'php://output', 'w' );
		// BOM برای پشتیبانی فارسی در اکسل.
		fprintf( $out, chr( 0xEF ) . chr( 0xBB ) . chr( 0xBF ) );
		fputcsv(
			$out,
			array(
				'شناسه', 'نوع', 'نام', 'تلفن', 'محصول', 'شرح',
				'نوع گزارش‌دهنده', 'شدت', 'پیامد', 'شماره سری ساخت', 'داروهای همزمان',
				'وضعیت', 'IP', 'تاریخ',
			)
		);
		foreach ( $rows as $r ) {
			fputcsv(
				$out,
				array(
					$r['id'], $r['type'], $r['name'], $r['phone'], $r['product'], $r['description'],
					isset( $r['reporter_type'] ) ? $r['reporter_type'] : '',
					isset( $r['severity'] ) ? $r['severity'] : '',
					isset( $r['outcome'] ) ? $r['outcome'] : '',
					isset( $r['batch_number'] ) ? $r['batch_number'] : '',
					isset( $r['concomitant_drugs'] ) ? $r['concomitant_drugs'] : '',
					$r['status'], $r['ip'], $r['created_at'],
				)
			);
		}
		fclose( $out ); // phpcs:ignore
		exit;
	}
}
