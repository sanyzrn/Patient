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
	 * نام جدول تاریخچه گفتگو.
	 */
	const CHATLOG_TABLE = 'nafas_chatbot_chatlog';

	/**
	 * نام جدول بانک سوال/جواب.
	 */
	const QA_TABLE = 'nafas_chatbot_qa';

	/**
	 * نام جدول پایگاه دانش (تکه‌های اسناد).
	 */
	const KB_TABLE = 'nafas_chatbot_kb';

	/**
	 * نسخه ساختار دیتابیس (برای مهاجرت).
	 */
	const DB_VERSION = '5';

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
	 * نام کامل جدول تاریخچه گفتگو.
	 *
	 * @return string
	 */
	public static function chatlog_table_name() {
		global $wpdb;
		return $wpdb->prefix . self::CHATLOG_TABLE;
	}

	/**
	 * نام کامل جدول بانک سوال/جواب.
	 *
	 * @return string
	 */
	public static function qa_table_name() {
		global $wpdb;
		return $wpdb->prefix . self::QA_TABLE;
	}

	/**
	 * نام کامل جدول پایگاه دانش.
	 *
	 * @return string
	 */
	public static function kb_table_name() {
		global $wpdb;
		return $wpdb->prefix . self::KB_TABLE;
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
			severity VARCHAR(50) NULL,
			outcome VARCHAR(100) NULL,
			batch_number VARCHAR(100) NULL,
			concomitant_drugs TEXT NULL,
			reporter_type VARCHAR(50) NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'new',
			ip VARCHAR(100) NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY type (type),
			KEY status (status),
			KEY created_at (created_at)
		) {$charset_collate};";

		// جدول تاریخچه گفتگو.
		$chatlog = self::chatlog_table_name();
		$sql2    = "CREATE TABLE {$chatlog} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			product VARCHAR(191) NULL,
			question TEXT NULL,
			answer TEXT NULL,
			source VARCHAR(20) NOT NULL DEFAULT 'ai',
			in_bank TINYINT(1) NOT NULL DEFAULT 0,
			rating TINYINT(1) NOT NULL DEFAULT 0,
			ip VARCHAR(100) NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY source (source),
			KEY created_at (created_at)
		) {$charset_collate};";

		// جدول بانک سوال/جواب (با ایندکس FULLTEXT برای جستجوی مقیاس‌پذیر).
		$qa   = self::qa_table_name();
		$sql3 = "CREATE TABLE {$qa} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			product_id VARCHAR(100) NOT NULL DEFAULT 'general',
			question TEXT NOT NULL,
			keywords TEXT NULL,
			answer LONGTEXT NOT NULL,
			usage_count INT UNSIGNED NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY product_id (product_id),
			FULLTEXT KEY ft_qa (question, keywords)
		) {$charset_collate};";

		// جدول پایگاه دانش (تکه‌های اسناد + ایندکس FULLTEXT برای بازیابی هیبریدی).
		$kb   = self::kb_table_name();
		$sql4 = "CREATE TABLE {$kb} (
			id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			doc_id VARCHAR(40) NOT NULL DEFAULT '',
			product_id VARCHAR(100) NOT NULL DEFAULT 'general',
			source_title VARCHAR(191) NOT NULL DEFAULT '',
			chunk LONGTEXT NOT NULL,
			search_text LONGTEXT NULL,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY product_id (product_id),
			KEY doc_id (doc_id),
			FULLTEXT KEY ft_kb (search_text)
		) {$charset_collate};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
		dbDelta( $sql2 );
		dbDelta( $sql3 );
		dbDelta( $sql4 );

		update_option( 'nafas_chatbot_db_version', self::DB_VERSION );
	}

	/**
	 * در صورت نیاز ساختار دیتابیس را به‌روزرسانی می‌کند (افزودن ستون/جدول جدید + مهاجرت).
	 */
	public static function maybe_upgrade() {
		if ( get_option( 'nafas_chatbot_db_version' ) !== self::DB_VERSION ) {
			self::create_table();
			self::migrate_qa_from_options();
		}
	}

	/**
	 * مهاجرت یک‌بارهٔ بانک Q&A از wp_options به جدول مستقل.
	 */
	public static function migrate_qa_from_options() {
		if ( get_option( 'nafas_chatbot_qa_migrated' ) ) {
			return;
		}
		$opts = get_option( Nafas_Chatbot_Settings::OPTION_KEY, array() );
		$bank = ( is_array( $opts ) && ! empty( $opts['qa_bank'] ) && is_array( $opts['qa_bank'] ) ) ? $opts['qa_bank'] : array();
		if ( $bank ) {
			foreach ( $bank as $row ) {
				if ( empty( $row['question'] ) || empty( $row['answer'] ) ) {
					continue;
				}
				self::qa_insert(
					array(
						'product_id' => isset( $row['product'] ) ? $row['product'] : 'general',
						'question'   => $row['question'],
						'keywords'   => isset( $row['keywords'] ) ? $row['keywords'] : '',
						'answer'     => $row['answer'],
					)
				);
			}
			// خالی کردن آرایه قدیمی برای جلوگیری از حجیم‌شدن options.
			if ( is_array( $opts ) ) {
				$opts['qa_bank'] = array();
				update_option( Nafas_Chatbot_Settings::OPTION_KEY, $opts );
			}
		}
		update_option( 'nafas_chatbot_qa_migrated', 1, false );
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
				'type'              => isset( $data['type'] ) ? $data['type'] : '',
				'name'              => isset( $data['name'] ) ? $data['name'] : '',
				'phone'             => isset( $data['phone'] ) ? $data['phone'] : '',
				'product'           => isset( $data['product'] ) ? $data['product'] : null,
				'description'       => isset( $data['description'] ) ? $data['description'] : '',
				'severity'          => isset( $data['severity'] ) ? $data['severity'] : null,
				'outcome'           => isset( $data['outcome'] ) ? $data['outcome'] : null,
				'batch_number'      => isset( $data['batch_number'] ) ? $data['batch_number'] : null,
				'concomitant_drugs' => isset( $data['concomitant_drugs'] ) ? $data['concomitant_drugs'] : null,
				'reporter_type'     => isset( $data['reporter_type'] ) ? $data['reporter_type'] : null,
				'status'            => 'new',
				'ip'                => isset( $data['ip'] ) ? $data['ip'] : '',
				'created_at'        => current_time( 'mysql' ),
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
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
			'type'      => '',
			'status'    => '',
			'search'    => '',
			'date_from' => '',
			'date_to'   => '',
			'per_page'  => 20,
			'page'      => 1,
			'orderby'   => 'created_at',
			'order'     => 'DESC',
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
		// بازهٔ تاریخ (YYYY-MM-DD).
		if ( ! empty( $args['date_from'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $args['date_from'] ) ) {
			$where[]  = 'created_at >= %s';
			$params[] = $args['date_from'] . ' 00:00:00';
		}
		if ( ! empty( $args['date_to'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $args['date_to'] ) ) {
			$where[]  = 'created_at <= %s';
			$params[] = $args['date_to'] . ' 23:59:59';
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

	/**
	 * دریافت ردیف‌های فیلترشده برای خروجی CSV (نوع/وضعیت/جستجو/بازهٔ تاریخ).
	 *
	 * @param array $args فیلترها.
	 * @return array
	 */
	public static function get_filtered_for_export( $args ) {
		global $wpdb;
		$table = self::table_name();
		$args  = wp_parse_args(
			$args,
			array( 'type' => '', 'status' => '', 'search' => '', 'date_from' => '', 'date_to' => '' )
		);

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
		if ( ! empty( $args['date_from'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $args['date_from'] ) ) {
			$where[]  = 'created_at >= %s';
			$params[] = $args['date_from'] . ' 00:00:00';
		}
		if ( ! empty( $args['date_to'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $args['date_to'] ) ) {
			$where[]  = 'created_at <= %s';
			$params[] = $args['date_to'] . ' 23:59:59';
		}
		$where_sql = implode( ' AND ', $where );
		$sql       = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY created_at DESC";
		// phpcs:ignore WordPress.DB
		return $params ? $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A ) : $wpdb->get_results( $sql, ARRAY_A );
	}

	/**
	 * دریافت یک درخواست بر اساس شناسه.
	 *
	 * @param int $id شناسه.
	 * @return object|null
	 */
	public static function get( $id ) {
		global $wpdb;
		$table = self::table_name();
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", (int) $id ) ); // phpcs:ignore
	}

	/**
	 * آخرین درخواست‌ها.
	 *
	 * @param int $limit تعداد.
	 * @return array
	 */
	public static function get_recent( $limit = 5 ) {
		global $wpdb;
		$table = self::table_name();
		return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT %d", (int) $limit ) ); // phpcs:ignore
	}

	/**
	 * شمارش درخواست‌ها بر اساس محصول.
	 *
	 * @return array product_name => count.
	 */
	public static function product_submission_counts() {
		global $wpdb;
		$table = self::table_name();
		$rows  = $wpdb->get_results( "SELECT product, COUNT(*) AS c FROM {$table} WHERE product IS NOT NULL AND product <> '' GROUP BY product ORDER BY c DESC", ARRAY_A ); // phpcs:ignore
		$out   = array();
		foreach ( (array) $rows as $r ) {
			$out[ $r['product'] ] = (int) $r['c'];
		}
		return $out;
	}

	/**
	 * ثبت یک گفتگوی چت در آمار (افزایش شمارنده کل و به تفکیک محصول).
	 *
	 * @param string $product_id   شناسه محصول.
	 * @param string $product_name نام محصول.
	 */
	public static function record_chat( $product_id, $product_name = '' ) {
		$stats = get_option( 'nafas_chatbot_chat_stats', array() );
		if ( ! is_array( $stats ) ) {
			$stats = array();
		}
		$stats['total'] = isset( $stats['total'] ) ? (int) $stats['total'] + 1 : 1;

		if ( ! empty( $product_id ) ) {
			if ( ! isset( $stats['by_product'] ) || ! is_array( $stats['by_product'] ) ) {
				$stats['by_product'] = array();
			}
			$key = $product_name ? $product_name : $product_id;
			$stats['by_product'][ $key ] = isset( $stats['by_product'][ $key ] ) ? (int) $stats['by_product'][ $key ] + 1 : 1;
		}

		// آمار روزانه (۱۴ روز اخیر) برای نمودار روند.
		$today = current_time( 'Y-m-d' );
		if ( ! isset( $stats['daily'] ) || ! is_array( $stats['daily'] ) ) {
			$stats['daily'] = array();
		}
		$stats['daily'][ $today ] = isset( $stats['daily'][ $today ] ) ? (int) $stats['daily'][ $today ] + 1 : 1;
		if ( count( $stats['daily'] ) > 30 ) {
			$stats['daily'] = array_slice( $stats['daily'], -30, null, true );
		}

		update_option( 'nafas_chatbot_chat_stats', $stats, false );
	}

	/**
	 * دریافت آمار گفتگوها.
	 *
	 * @return array
	 */
	public static function get_chat_stats() {
		$stats = get_option( 'nafas_chatbot_chat_stats', array() );
		return is_array( $stats ) ? $stats : array();
	}

	/* ---------------- تاریخچه گفتگو ---------------- */

	/**
	 * ثبت یک گفتگو در تاریخچه.
	 *
	 * @param array $data داده‌ها.
	 * @return int|false
	 */
	public static function log_chat_entry( $data ) {
		global $wpdb;
		$inserted = $wpdb->insert( // phpcs:ignore WordPress.DB
			self::chatlog_table_name(),
			array(
				'product'    => isset( $data['product'] ) ? $data['product'] : null,
				'question'   => isset( $data['question'] ) ? $data['question'] : '',
				'answer'     => isset( $data['answer'] ) ? $data['answer'] : '',
				'source'     => isset( $data['source'] ) ? $data['source'] : 'ai',
				'in_bank'    => 0,
				'ip'         => isset( $data['ip'] ) ? $data['ip'] : '',
				'created_at' => current_time( 'mysql' ),
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s', '%s' )
		);
		return $inserted ? $wpdb->insert_id : false;
	}

	/**
	 * دریافت تاریخچه گفتگو با فیلتر و صفحه‌بندی.
	 *
	 * @param array $args آرگومان‌ها.
	 * @return array
	 */
	public static function get_chatlog( $args = array() ) {
		global $wpdb;
		$table = self::chatlog_table_name();
		$args  = wp_parse_args(
			$args,
			array(
				'source'   => '',
				'search'   => '',
				'per_page' => 20,
				'page'     => 1,
			)
		);

		$where  = array( '1=1' );
		$params = array();
		if ( ! empty( $args['source'] ) ) {
			$where[]  = 'source = %s';
			$params[] = $args['source'];
		}
		if ( ! empty( $args['search'] ) ) {
			$like     = '%' . $wpdb->esc_like( $args['search'] ) . '%';
			$where[]  = '(question LIKE %s OR answer LIKE %s)';
			$params[] = $like;
			$params[] = $like;
		}
		$where_sql = implode( ' AND ', $where );

		$per_page = max( 1, (int) $args['per_page'] );
		$offset   = ( max( 1, (int) $args['page'] ) - 1 ) * $per_page;

		$count_sql = "SELECT COUNT(*) FROM {$table} WHERE {$where_sql}";
		$total     = $params ? $wpdb->get_var( $wpdb->prepare( $count_sql, $params ) ) : $wpdb->get_var( $count_sql ); // phpcs:ignore

		$query    = "SELECT * FROM {$table} WHERE {$where_sql} ORDER BY created_at DESC LIMIT %d OFFSET %d";
		$q_params = array_merge( $params, array( $per_page, $offset ) );
		$rows     = $wpdb->get_results( $wpdb->prepare( $query, $q_params ) ); // phpcs:ignore

		return array(
			'items'       => $rows,
			'total'       => (int) $total,
			'total_pages' => (int) ceil( $total / $per_page ),
			'page'        => (int) $args['page'],
		);
	}

	/**
	 * دریافت یک ردیف تاریخچه.
	 *
	 * @param int $id شناسه.
	 * @return object|null
	 */
	public static function get_chatlog_entry( $id ) {
		global $wpdb;
		$table = self::chatlog_table_name();
		return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE id = %d", (int) $id ) ); // phpcs:ignore
	}

	/**
	 * علامت‌گذاری یک ردیف به‌عنوان افزوده‌شده به بانک.
	 *
	 * @param int $id شناسه.
	 */
	public static function mark_chatlog_in_bank( $id ) {
		global $wpdb;
		$wpdb->update( self::chatlog_table_name(), array( 'in_bank' => 1 ), array( 'id' => (int) $id ), array( '%d' ), array( '%d' ) ); // phpcs:ignore
	}

	/**
	 * حذف یک ردیف تاریخچه.
	 *
	 * @param int $id شناسه.
	 */
	public static function delete_chatlog_entry( $id ) {
		global $wpdb;
		$wpdb->delete( self::chatlog_table_name(), array( 'id' => (int) $id ), array( '%d' ) ); // phpcs:ignore
	}

	/**
	 * پاک‌سازی کامل تاریخچه گفتگو.
	 */
	public static function clear_chatlog() {
		global $wpdb;
		$table = self::chatlog_table_name();
		$wpdb->query( "TRUNCATE TABLE {$table}" ); // phpcs:ignore
	}

	/**
	 * حذف ردیف‌های تاریخچه قدیمی‌تر از تعداد روز مشخص (برای WP-Cron).
	 *
	 * @param int $days تعداد روز نگهداری.
	 * @return int تعداد ردیف‌های حذف‌شده.
	 */
	public static function purge_old_chatlog( $days ) {
		$days = (int) $days;
		if ( $days <= 0 ) {
			return 0;
		}
		global $wpdb;
		$table = self::chatlog_table_name();
		return (int) $wpdb->query( // phpcs:ignore WordPress.DB
			$wpdb->prepare( "DELETE FROM {$table} WHERE created_at < DATE_SUB( %s, INTERVAL %d DAY )", current_time( 'mysql' ), $days )
		);
	}

	/**
	 * ثبت امتیاز بازخورد یک پاسخ (1 = مفید، -1 = نامفید).
	 *
	 * @param int $id     شناسه ردیف تاریخچه.
	 * @param int $rating امتیاز.
	 */
	public static function set_chatlog_rating( $id, $rating ) {
		global $wpdb;
		$rating = ( $rating > 0 ) ? 1 : -1;
		$wpdb->update( self::chatlog_table_name(), array( 'rating' => $rating ), array( 'id' => (int) $id ), array( '%d' ), array( '%d' ) ); // phpcs:ignore
	}

	/**
	 * شمارش ردیف‌های تاریخچه بر اساس منبع.
	 *
	 * @param string $source منبع.
	 * @return int
	 */
	public static function count_chatlog_source( $source ) {
		global $wpdb;
		$table = self::chatlog_table_name();
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE source = %s", $source ) ); // phpcs:ignore
	}

	/**
	 * شمارش بازخوردهای مثبت/منفی.
	 *
	 * @return array
	 */
	public static function feedback_counts() {
		global $wpdb;
		$table = self::chatlog_table_name();
		return array(
			'up'   => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE rating = 1" ),  // phpcs:ignore
			'down' => (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE rating = -1" ), // phpcs:ignore
		);
	}

	/**
	 * شمارش گزارش‌های عارضهٔ جدی.
	 *
	 * @param array $severities فهرست شدت‌های جدی.
	 * @return int
	 */
	public static function serious_adr_count( $severities ) {
		$severities = array_filter( (array) $severities );
		if ( empty( $severities ) ) {
			return 0;
		}
		global $wpdb;
		$table        = self::table_name();
		$placeholders = implode( ', ', array_fill( 0, count( $severities ), '%s' ) );
		// phpcs:ignore WordPress.DB
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE severity IN ( {$placeholders} )", $severities ) );
	}

	/* ---------------- بانک سوال/جواب ---------------- */

	/**
	 * درج یک ردیف در بانک.
	 *
	 * @param array $data داده‌ها.
	 * @return int|false
	 */
	public static function qa_insert( $data ) {
		global $wpdb;
		$ok = $wpdb->insert( // phpcs:ignore WordPress.DB
			self::qa_table_name(),
			array(
				'product_id'  => isset( $data['product_id'] ) ? $data['product_id'] : 'general',
				'question'    => isset( $data['question'] ) ? $data['question'] : '',
				'keywords'    => isset( $data['keywords'] ) ? $data['keywords'] : '',
				'answer'      => isset( $data['answer'] ) ? $data['answer'] : '',
				'usage_count' => 0,
				'created_at'  => current_time( 'mysql' ),
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s' )
		);
		return $ok ? $wpdb->insert_id : false;
	}

	/**
	 * دریافت همهٔ ردیف‌های بانک (برای پنل).
	 *
	 * @return array
	 */
	public static function qa_get_all() {
		global $wpdb;
		$table = self::qa_table_name();
		return $wpdb->get_results( "SELECT * FROM {$table} ORDER BY id ASC", ARRAY_A ); // phpcs:ignore
	}

	/**
	 * شمارش ردیف‌های بانک.
	 *
	 * @return int
	 */
	public static function qa_count() {
		global $wpdb;
		$table = self::qa_table_name();
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ); // phpcs:ignore
	}

	/**
	 * جایگزینی کامل بانک با مجموعهٔ جدید (برای ذخیرهٔ پنل).
	 *
	 * @param array $rows ردیف‌ها.
	 */
	public static function qa_replace_all( $rows ) {
		global $wpdb;
		$table = self::qa_table_name();
		$wpdb->query( "TRUNCATE TABLE {$table}" ); // phpcs:ignore
		foreach ( (array) $rows as $r ) {
			if ( empty( $r['question'] ) || empty( $r['answer'] ) ) {
				continue;
			}
			self::qa_insert( $r );
		}
	}

	/**
	 * ردیف‌های کاندید برای تطبیق (همان محصول یا عمومی).
	 *
	 * @param string $product_id شناسه محصول.
	 * @return array
	 */
	public static function qa_candidates( $product_id ) {
		global $wpdb;
		$table = self::qa_table_name();
		return $wpdb->get_results( // phpcs:ignore WordPress.DB
			$wpdb->prepare( "SELECT * FROM {$table} WHERE product_id = %s OR product_id = 'general'", $product_id ),
			ARRAY_A
		);
	}

	/**
	 * افزایش شمارندهٔ استفاده.
	 *
	 * @param int $id شناسه.
	 */
	public static function qa_increment_usage( $id ) {
		global $wpdb;
		$table = self::qa_table_name();
		$wpdb->query( $wpdb->prepare( "UPDATE {$table} SET usage_count = usage_count + 1 WHERE id = %d", (int) $id ) ); // phpcs:ignore
	}

	/* ---------------- نظرسنجی رضایت (CSAT) ---------------- */

	/**
	 * ثبت یک امتیاز رضایت (۱ تا ۵) در آمار تجمعی.
	 *
	 * @param int $score امتیاز ۱-۵.
	 */
	public static function record_csat( $score ) {
		$score = (int) $score;
		if ( $score < 1 || $score > 5 ) {
			return;
		}
		$stats = get_option( 'nafas_chatbot_csat', array() );
		if ( ! is_array( $stats ) ) {
			$stats = array();
		}
		$stats['count']   = isset( $stats['count'] ) ? (int) $stats['count'] + 1 : 1;
		$stats['sum']     = isset( $stats['sum'] ) ? (int) $stats['sum'] + $score : $score;
		if ( ! isset( $stats['dist'] ) || ! is_array( $stats['dist'] ) ) {
			$stats['dist'] = array();
		}
		$stats['dist'][ $score ] = isset( $stats['dist'][ $score ] ) ? (int) $stats['dist'][ $score ] + 1 : 1;
		update_option( 'nafas_chatbot_csat', $stats, false );
	}

	/**
	 * دریافت آمار رضایت (تعداد، میانگین، توزیع).
	 *
	 * @return array
	 */
	public static function get_csat_stats() {
		$stats = get_option( 'nafas_chatbot_csat', array() );
		$count = ( is_array( $stats ) && isset( $stats['count'] ) ) ? (int) $stats['count'] : 0;
		$sum   = ( is_array( $stats ) && isset( $stats['sum'] ) ) ? (int) $stats['sum'] : 0;
		return array(
			'count' => $count,
			'sum'   => $sum,
			'avg'   => $count > 0 ? round( $sum / $count, 1 ) : 0,
			'dist'  => ( is_array( $stats ) && isset( $stats['dist'] ) ) ? $stats['dist'] : array(),
		);
	}

	/* ---------------- پایگاه دانش هیبریدی (KB) ---------------- */

	/**
	 * تکه‌سازی (chunk) یک متن بلند به قطعات هم‌اندازه و معنادار.
	 *
	 * @param string $text متن خام.
	 * @param int    $size حداکثر طول هر تکه (کاراکتر).
	 * @return array فهرست تکه‌ها.
	 */
	public static function kb_chunk_text( $text, $size = 700 ) {
		$text = trim( (string) $text );
		if ( '' === $text ) {
			return array();
		}
		$size  = max( 200, min( 2000, (int) $size ) );
		$text  = preg_replace( "/\r\n|\r/", "\n", $text );
		$paras = preg_split( "/\n{2,}/", $text );

		$chunks = array();
		$buf    = '';
		$flush  = function () use ( &$buf, &$chunks ) {
			if ( '' !== trim( $buf ) ) {
				$chunks[] = trim( $buf );
			}
			$buf = '';
		};

		foreach ( (array) $paras as $p ) {
			$p = trim( $p );
			if ( '' === $p ) {
				continue;
			}
			if ( mb_strlen( $p ) > $size ) {
				$flush();
				// پاراگراف خیلی بلند: تقسیم بر اساس جمله.
				$sentences = preg_split( '/(?<=[.!؟?\x{06D4}])\s+/u', $p );
				$sbuf      = '';
				foreach ( (array) $sentences as $sen ) {
					$sen = trim( $sen );
					if ( '' === $sen ) {
						continue;
					}
					if ( '' !== trim( $sbuf ) && ( mb_strlen( $sbuf ) + mb_strlen( $sen ) + 1 ) > $size ) {
						$chunks[] = trim( $sbuf );
						$sbuf     = '';
					}
					$sbuf .= ( '' === $sbuf ? '' : ' ' ) . $sen;
				}
				if ( '' !== trim( $sbuf ) ) {
					$chunks[] = trim( $sbuf );
				}
			} else {
				if ( '' !== trim( $buf ) && ( mb_strlen( $buf ) + mb_strlen( $p ) + 2 ) > $size ) {
					$flush();
				}
				$buf .= ( '' === $buf ? '' : "\n" ) . $p;
			}
		}
		$flush();
		return $chunks;
	}

	/**
	 * افزودن یک سند به پایگاه دانش (تکه‌سازی + درج).
	 *
	 * @param string $product_id شناسه محصول (یا general).
	 * @param string $title      عنوان سند.
	 * @param string $text       متن سند.
	 * @return int تعداد تکه‌های درج‌شده.
	 */
	public static function kb_insert_document( $product_id, $title, $text ) {
		$chunks = self::kb_chunk_text( $text );
		if ( empty( $chunks ) ) {
			return 0;
		}
		global $wpdb;
		$doc_id = substr( md5( $title . microtime() . wp_rand() ), 0, 32 );
		$now    = current_time( 'mysql' );
		$pid    = $product_id ? $product_id : 'general';
		$title  = '' !== trim( $title ) ? $title : __( 'سند بدون عنوان', 'nafas-chatbot' );
		foreach ( $chunks as $c ) {
			$wpdb->insert( // phpcs:ignore WordPress.DB
				self::kb_table_name(),
				array(
					'doc_id'       => $doc_id,
					'product_id'   => $pid,
					'source_title' => $title,
					'chunk'        => $c,
					'search_text'  => Nafas_Chatbot_Ajax::normalize( $c ),
					'created_at'   => $now,
				),
				array( '%s', '%s', '%s', '%s', '%s', '%s' )
			);
		}
		return count( $chunks );
	}

	/**
	 * ردیف‌های کاندید پایگاه دانش (محصول جاری یا عمومی) برای بازیابی.
	 *
	 * @param string $product_id شناسه محصول.
	 * @return array
	 */
	public static function kb_candidates( $product_id ) {
		global $wpdb;
		$table = self::kb_table_name();
		return $wpdb->get_results( // phpcs:ignore WordPress.DB
			$wpdb->prepare( "SELECT id, source_title, chunk, search_text FROM {$table} WHERE product_id = %s OR product_id = 'general' LIMIT 800", $product_id ),
			ARRAY_A
		);
	}

	/**
	 * شمارش کل تکه‌های پایگاه دانش.
	 *
	 * @return int
	 */
	public static function kb_count() {
		global $wpdb;
		$table = self::kb_table_name();
		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ); // phpcs:ignore
	}

	/**
	 * فهرست اسناد (گروه‌بندی بر اساس doc_id) برای نمایش در پنل.
	 *
	 * @return array
	 */
	public static function kb_get_documents() {
		global $wpdb;
		$table = self::kb_table_name();
		// phpcs:ignore WordPress.DB
		return $wpdb->get_results( "SELECT doc_id, product_id, source_title, COUNT(*) AS chunks, MAX(created_at) AS created_at FROM {$table} GROUP BY doc_id, product_id, source_title ORDER BY created_at DESC", ARRAY_A );
	}

	/**
	 * حذف یک سند کامل بر اساس doc_id.
	 *
	 * @param string $doc_id شناسه سند.
	 */
	public static function kb_delete_document( $doc_id ) {
		global $wpdb;
		$wpdb->delete( self::kb_table_name(), array( 'doc_id' => $doc_id ), array( '%s' ) ); // phpcs:ignore
	}

	/**
	 * پاک‌سازی کامل پایگاه دانش.
	 */
	public static function kb_clear() {
		global $wpdb;
		$table = self::kb_table_name();
		$wpdb->query( "TRUNCATE TABLE {$table}" ); // phpcs:ignore
	}
}
