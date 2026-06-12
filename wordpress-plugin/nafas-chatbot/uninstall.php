<?php
/**
 * حذف کامل افزونه: پاکسازی گزینه‌ها و جدول دیتابیس.
 *
 * @package NafasChatbot
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// حذف گزینه‌ها.
delete_option( 'nafas_chatbot_settings' );

// حذف جدول درخواست‌ها.
global $wpdb;
$table = $wpdb->prefix . 'nafas_chatbot_submissions';
$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore WordPress.DB
