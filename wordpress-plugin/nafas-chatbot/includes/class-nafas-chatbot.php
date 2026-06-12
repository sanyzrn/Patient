<?php
/**
 * کلاس اصلی افزونه (Singleton).
 *
 * @package NafasChatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * کلاس هسته.
 */
final class Nafas_Chatbot {

	/**
	 * نمونه یکتا.
	 *
	 * @var Nafas_Chatbot|null
	 */
	protected static $instance = null;

	/**
	 * نمونه Frontend.
	 *
	 * @var Nafas_Chatbot_Frontend
	 */
	public $frontend;

	/**
	 * نمونه AJAX.
	 *
	 * @var Nafas_Chatbot_Ajax
	 */
	public $ajax;

	/**
	 * نمونه Admin.
	 *
	 * @var Nafas_Chatbot_Admin
	 */
	public $admin;

	/**
	 * دریافت نمونه یکتا.
	 *
	 * @return Nafas_Chatbot
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * سازنده.
	 */
	private function __construct() {
		$this->frontend = new Nafas_Chatbot_Frontend();
		$this->ajax     = new Nafas_Chatbot_Ajax();

		if ( is_admin() ) {
			$this->admin = new Nafas_Chatbot_Admin();
		}

		// لینک تنظیمات در صفحه افزونه‌ها.
		add_filter( 'plugin_action_links_' . NAFAS_CHATBOT_BASENAME, array( $this, 'action_links' ) );

		// المنتور.
		add_action( 'elementor/widgets/register', array( $this, 'register_elementor_widget' ) );
		add_action( 'elementor/elements/categories_registered', array( $this, 'register_elementor_category' ) );
	}

	/**
	 * افزودن لینک تنظیمات.
	 *
	 * @param array $links لینک‌ها.
	 * @return array
	 */
	public function action_links( $links ) {
		$settings_link = '<a href="' . esc_url( admin_url( 'admin.php?page=nafas-chatbot' ) ) . '">' . esc_html__( 'تنظیمات', 'nafas-chatbot' ) . '</a>';
		array_unshift( $links, $settings_link );
		return $links;
	}

	/**
	 * ثبت دسته‌بندی ویجت در المنتور.
	 *
	 * @param object $elements_manager مدیر المان‌ها.
	 */
	public function register_elementor_category( $elements_manager ) {
		$elements_manager->add_category(
			'nafas',
			array(
				'title' => esc_html__( 'نفس فارمد', 'nafas-chatbot' ),
				'icon'  => 'fa fa-comments',
			)
		);
	}

	/**
	 * ثبت ویجت المنتور.
	 *
	 * @param object $widgets_manager مدیر ویجت‌ها.
	 */
	public function register_elementor_widget( $widgets_manager ) {
		require_once NAFAS_CHATBOT_DIR . 'widgets/class-nafas-chatbot-widget.php';
		$widgets_manager->register( new Nafas_Chatbot_Elementor_Widget() );
	}
}
