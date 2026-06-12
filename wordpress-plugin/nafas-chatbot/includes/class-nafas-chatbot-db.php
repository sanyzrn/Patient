<?php
/**
 * مدیریت دیتابیس و ذخیره درخواست‌ها.
 *
 * @package NafasChatbot
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * کلاس دیتابیس.
 */
class Nafas_Chatbot_DB {

	/**
	 * نام جدول (بدون پیشوند).
	 */
	const TABLE = 'nafas_chatbot_submissions';

	/**
	 * دریافت نام کامل جدول.
	 *
	 * @return string
	 */
	public static function table_name() {
		global $wpdb;
		return $wpdb->prefix . self::TABLE;
	}

	/**
	 * ساخت جدول دیتابیس.
	 */
	public static function create_table() {
		global $wpdb;
		$table           = self::table_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			type VARCHAR(100) NOT NULL DEFAULT '',
			name VARCHAR(191) NOT NULL DEFAULT '',
			phone VARCHAR(50) NOT NULL DEFAULT '',
			product VARCHAR(191) NULL,
			description TEXT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'new',
			ip VARCHAR(100) NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY type (type),
			KEY status (status),
			KEY created_at (created_at)
		) {$charset_collate};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	/**
	 * درج یک درخواست جدید.
	 *
	 * @param array $data داده‌ها.
	 * @return int|false شناسه ردیف یا false.
	 */
	public static function insert( $data ) {
		global $wpdb;
		$inserted = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery
			self::table_name(),
			array(
				'type'        => isset( $data['type'] ) ? $data['type'] : '',
				'name'        => isset( $data['name'] ) ? $data['name'] : '',
				'phone'       => isset( $data['phone'] ) ? $data['phone'] : '',
				'product'     => isset( $data['product'] ) ? $data['product'] : null,
				'description' => isset( $data['description'] ) ? $data['description'] : '',
				'status'      => 'new',
				'ip'          => isset( $data['ip'] ) ? $data['ip'] : '',
				'created_at'  => current_time( 'mysql' ),
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
		);
		return $inserted ? $wpdb->insert_id : false;
	}

	/**
	 * دریافت لیست درخواست‌ها با فیلتر و صفحه‌بندی.
	 *
	 * @param array $args آرگومان‌ها.
	 * @return array
	 */
	public static function get_submissions( $args = array() ) {
		global $wpdb;
		$table = self::table_name();

		$defaults = array(
			'type'     => '',
			'status'   => '',
			'search'   => '',
			'per_page' => 20,
			'page'     => 1,
			'orderby'  => 'created_at',
			'order'    => 'DESC',
		);
		$args = wp_parse_args( $args, $defaults );

		$where  = array( '1=1' );
		$params = array();

		if ( ! empty( $args['type'] ) ) {
			$where[]  = 'type = %s';
			$params[] = $args['type'];
		}
		if ( ! empty( $args['status'] ) ) {
			$where[]  = 'status = %s';
			$params[] = $args['status'];
		}
		if ( ! empty( $args['search'] ) ) {
			$like     = '%' . $wpdb->esc_like( $args['search'] ) . '%';
			$where[]  = '(name LIKE %s OR phone LIKE %s OR description LIKE %s)';
			$params[] = $like;
			$params[] = $like;
			$params[] = $like;
		}

		$where_sql = implode( ' AND ', $where );

		// مرتب‌سازی امن.
		$allowed_orderby = array( 'id', 'created_at', 'name', 'type', 'status' );
		$orderby         = in_array( $args['orderby'], $allowed_orderby, true ) ? $args['orderby'] : 'created_at';
		$order           = 'ASC' === strtoupper( $args['order'] ) ? 'ASC' : 'DESC';

		$per_page = max( 1, (int) $args['per_page'] );
		$offset   = ( max( 1, (int) $args['page'] ) - 1 ) * $per_page;

		// شمارش کل.
		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where_sql}";
		$total     = $params ? $wpdb->get_var( $wpdb->prepare( $count_sql, $params ) ) : $wpdb->get_var( $count_sql ); // phpcs:ignore

		// واکشی ردیف‌ها.
		$query     = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY {$orderby} {$order} LIMIT %d OFFSET %d";
		$q_params  = array_merge( $params, array( $per_page, $offset ) );
		$rows      = $wpdb->get_results( $wpdb->prepare( $query, $q_params ) ); // phpcs:ignore

		return array(
			'items'       => $rows,
			'total'       => (int) $total,
			'total_pages' => (int) ceil( $total / $per_page ),
			'page'        => (int) $args['page'],
			'per_page'    => $per_page,
		);
	}

	/**
	 * شمارش بر اساس نوع.
	 *
	 * @return array
	 */
	public static function counts() {
		global $wpdb;
		$table = self::table_name();
		$rows  = $wpdb->get_results( "SELECT type, COUNT(*) AS c FROM {$table} GROUP BY type", ARRAY_A ); // phpcs:ignore
		$out   = array( 'total' => 0 );
		foreach ( (array) $rows as $r ) {
			$out[ $r['type'] ] = (int) $r['c'];
			$out['total']     += (int) $r['c'];
		}
		return $out;
	}

	/**
	 * تغییر وضعیت یک درخواست.
	 *
	 * @param int    $id     شناسه.
	 * @param string $status وضعیت.
	 * @return bool
	 */
	public static function update_status( $id, $status ) {
		global $wpdb;
		$allowed = array( 'new', 'in_progress', 'done', 'archived' );
		if ( ! in_array( $status, $allowed, true ) ) {
			return false;
		}
		return (bool) $wpdb->update( // phpcs:ignore
			self::table_name(),
			array( 'status' => $status ),
			array( 'id' => (int) $id ),
			array( '%s' ),
			array( '%d' )
		);
	}

	/**
	 * حذف یک درخواست.
	 *
	 * @param int $id شناسه.
	 * @return bool
	 */
	public static function delete( $id ) {
		global $wpdb;
		return (bool) $wpdb->delete( self::table_name(), array( 'id' => (int) $id ), array( '%d' ) ); // phpcs:ignore
	}

	/**
	 * دریافت همه ردیف‌ها برای خروجی CSV.
	 *
	 * @return array
	 */
	public static function get_all_for_export() {
		global $wpdb;
		$table = self::table_name();
		return $wpdb->get_results( "SELECT * FROM {$table} ORDER BY created_at DESC", ARRAY_A ); // phpcs:ignore
	}
}
