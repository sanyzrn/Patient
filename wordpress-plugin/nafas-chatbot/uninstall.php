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
delete_option( 'nafas_chatbot_chat_stats' );
delete_option( 'nafas_chatbot_db_version' );

// حذف جداول.
global $wpdb;
$table   = $wpdb->prefix . 'nafas_chatbot_submissions';
$chatlog = $wpdb->prefix . 'nafas_chatbot_chatlog';
$wpdb->query( "DROP TABLE IF EXISTS {$table}" ); // phpcs:ignore WordPress.DB
$wpdb->query( "DROP TABLE IF EXISTS {$chatlog}" ); // phpcs:ignore WordPress.DB
