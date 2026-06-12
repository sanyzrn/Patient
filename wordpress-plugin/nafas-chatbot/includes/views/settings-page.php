<?php
/**
 * نمای صفحه تنظیمات.
 *
 * @package NafasChatbot
 * @var array $s تنظیمات.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<div class="wrap nafas-admin" dir="rtl">
	<h1 class="nafas-admin__title">
		<span class="dashicons dashicons-format-chat"></span>
		<?php esc_html_e( 'دستیار هوشمند نفس فارمد', 'nafas-chatbot' ); ?>
		<span class="nafas-admin__ver">v<?php echo esc_html( NAFAS_CHATBOT_VERSION ); ?></span>
	</h1>

	<form method="post" action="" class="nafas-settings-form">
		<?php wp_nonce_field( 'nafas_chatbot_settings' ); ?>

		<div class="nafas-tabs">
			<nav class="nafas-tabs__nav">
				<a href="#tab-general" class="nafas-tab is-active"><?php esc_html_e( 'عمومی', 'nafas-chatbot' ); ?></a>
				<a href="#tab-menu" class="nafas-tab"><?php esc_html_e( 'منو و متن‌ها', 'nafas-chatbot' ); ?></a>
				<a href="#tab-products" class="nafas-tab"><?php esc_html_e( 'محصولات', 'nafas-chatbot' ); ?></a>
				<a href="#tab-appearance" class="nafas-tab"><?php esc_html_e( 'ظاهر', 'nafas-chatbot' ); ?></a>
				<a href="#tab-ai" class="nafas-tab"><?php esc_html_e( 'هوش مصنوعی', 'nafas-chatbot' ); ?></a>
				<a href="#tab-notify" class="nafas-tab"><?php esc_html_e( 'اعلان‌ها', 'nafas-chatbot' ); ?></a>
			</nav>

			<!-- عمومی -->
			<div id="tab-general" class="nafas-tab-panel is-active">
				<table class="form-table">
					<tr>
						<th><?php esc_html_e( 'فعال‌سازی دکمه شناور', 'nafas-chatbot' ); ?></th>
						<td>
							<label class="nafas-switch">
								<input type="checkbox" name="enabled" value="yes" <?php checked( $s['enabled'], 'yes' ); ?>>
								<span class="nafas-switch__slider"></span>
							</label>
							<p class="description"><?php esc_html_e( 'نمایش خودکار دکمه چت‌بات در تمام صفحات سایت.', 'nafas-chatbot' ); ?></p>
						</td>
					</tr>
					<tr>
						<th><label for="company_name"><?php esc_html_e( 'نام شرکت', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="company_name" name="company_name" value="<?php echo esc_attr( $s['company_name'] ); ?>" class="regular-text"></td>
					</tr>
					<tr>
						<th><label for="company_id"><?php esc_html_e( 'شناسه شرکت', 'nafas-chatbot' ); ?></label></th>
						<td>
							<input type="text" id="company_id" name="company_id" value="<?php echo esc_attr( $s['company_id'] ); ?>" class="regular-text" dir="ltr">
							<p class="description"><?php esc_html_e( 'یک شناسه انگلیسی یکتا برای حالت گفتگو درباره شرکت.', 'nafas-chatbot' ); ?></p>
						</td>
					</tr>
					<tr>
						<th><label for="header_title"><?php esc_html_e( 'عنوان هدر پیش‌فرض', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="header_title" name="header_title" value="<?php echo esc_attr( $s['header_title'] ); ?>" class="regular-text"></td>
					</tr>
					<tr>
						<th><label for="ai_rate_limit"><?php esc_html_e( 'محدودیت درخواست روزانه (هر IP)', 'nafas-chatbot' ); ?></label></th>
						<td>
							<input type="number" id="ai_rate_limit" name="ai_rate_limit" value="<?php echo esc_attr( $s['ai_rate_limit'] ); ?>" min="0" class="small-text">
							<p class="description"><?php esc_html_e( 'برای غیرفعال کردن محدودیت، مقدار صفر وارد کنید.', 'nafas-chatbot' ); ?></p>
						</td>
					</tr>
				</table>
			</div>

			<!-- منو -->
			<div id="tab-menu" class="nafas-tab-panel">
				<table class="form-table">
					<tr>
						<th><label for="welcome_title"><?php esc_html_e( 'عنوان خوش‌آمد', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="welcome_title" name="welcome_title" value="<?php echo esc_attr( $s['welcome_title'] ); ?>" class="regular-text"></td>
					</tr>
					<tr>
						<th><label for="welcome_text"><?php esc_html_e( 'متن خوش‌آمد', 'nafas-chatbot' ); ?></label></th>
						<td><textarea id="welcome_text" name="welcome_text" rows="2" class="large-text"><?php echo esc_textarea( $s['welcome_text'] ); ?></textarea>
						<p class="description"><?php esc_html_e( 'می‌توانید از تگ <br> استفاده کنید.', 'nafas-chatbot' ); ?></p></td>
					</tr>
					<tr><th colspan="2"><h3 class="nafas-section"><?php esc_html_e( 'گزینه‌های منو', 'nafas-chatbot' ); ?></h3></th></tr>

					<tr>
						<th><?php esc_html_e( 'سوال درباره شرکت', 'nafas-chatbot' ); ?></th>
						<td>
							<label class="nafas-switch"><input type="checkbox" name="show_company" value="yes" <?php checked( $s['show_company'], 'yes' ); ?>><span class="nafas-switch__slider"></span></label>
							<input type="text" name="company_btn_title" value="<?php echo esc_attr( $s['company_btn_title'] ); ?>" class="regular-text" placeholder="<?php esc_attr_e( 'عنوان', 'nafas-chatbot' ); ?>">
							<input type="text" name="company_btn_desc" value="<?php echo esc_attr( $s['company_btn_desc'] ); ?>" class="regular-text" placeholder="<?php esc_attr_e( 'توضیح کوتاه', 'nafas-chatbot' ); ?>">
						</td>
					</tr>
					<tr>
						<th><?php esc_html_e( 'سوال درباره محصولات', 'nafas-chatbot' ); ?></th>
						<td>
							<label class="nafas-switch"><input type="checkbox" name="show_products" value="yes" <?php checked( $s['show_products'], 'yes' ); ?>><span class="nafas-switch__slider"></span></label>
							<input type="text" name="products_btn_title" value="<?php echo esc_attr( $s['products_btn_title'] ); ?>" class="regular-text" placeholder="<?php esc_attr_e( 'عنوان', 'nafas-chatbot' ); ?>">
							<input type="text" name="products_btn_desc" value="<?php echo esc_attr( $s['products_btn_desc'] ); ?>" class="regular-text" placeholder="<?php esc_attr_e( 'توضیح کوتاه', 'nafas-chatbot' ); ?>">
						</td>
					</tr>
					<tr>
						<th><?php esc_html_e( 'ثبت عوارض', 'nafas-chatbot' ); ?></th>
						<td>
							<label class="nafas-switch"><input type="checkbox" name="show_adr" value="yes" <?php checked( $s['show_adr'], 'yes' ); ?>><span class="nafas-switch__slider"></span></label>
							<input type="text" name="adr_btn_title" value="<?php echo esc_attr( $s['adr_btn_title'] ); ?>" class="regular-text" placeholder="<?php esc_attr_e( 'عنوان', 'nafas-chatbot' ); ?>">
						</td>
					</tr>
					<tr>
						<th><?php esc_html_e( 'درخواست مشاوره', 'nafas-chatbot' ); ?></th>
						<td>
							<label class="nafas-switch"><input type="checkbox" name="show_consult" value="yes" <?php checked( $s['show_consult'], 'yes' ); ?>><span class="nafas-switch__slider"></span></label>
							<input type="text" name="consult_btn_title" value="<?php echo esc_attr( $s['consult_btn_title'] ); ?>" class="regular-text" placeholder="<?php esc_attr_e( 'عنوان', 'nafas-chatbot' ); ?>">
						</td>
					</tr>
					<tr>
						<th><label for="disclaimer"><?php esc_html_e( 'متن سلب مسئولیت', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="disclaimer" name="disclaimer" value="<?php echo esc_attr( $s['disclaimer'] ); ?>" class="large-text"></td>
					</tr>
				</table>
			</div>

			<!-- محصولات -->
			<div id="tab-products" class="nafas-tab-panel">
				<h3 class="nafas-section"><?php esc_html_e( 'مدیریت محصولات', 'nafas-chatbot' ); ?></h3>
				<p class="description"><?php esc_html_e( 'محصولاتی که در منوی چت‌بات و فرم گزارش عوارض نمایش داده می‌شوند. می‌توانید برای هر محصول یک «پایگاه دانش» وارد کنید تا هوش مصنوعی بر اساس آن پاسخ دهد.', 'nafas-chatbot' ); ?></p>

				<table class="nafas-products-table widefat" id="nafas-products">
					<thead>
						<tr>
							<th style="width:140px"><?php esc_html_e( 'شناسه (انگلیسی)', 'nafas-chatbot' ); ?></th>
							<th style="width:170px"><?php esc_html_e( 'نام نمایشی', 'nafas-chatbot' ); ?></th>
							<th><?php esc_html_e( 'پایگاه دانش (اختیاری)', 'nafas-chatbot' ); ?></th>
							<th style="width:200px"><?php esc_html_e( 'لینک بروشور', 'nafas-chatbot' ); ?></th>
							<th style="width:40px"></th>
						</tr>
					</thead>
					<tbody>
						<?php
						$products  = (array) $s['products'];
						$knowledge = (array) $s['product_knowledge'];
						foreach ( $products as $p ) :
							$pid   = isset( $p['id'] ) ? $p['id'] : '';
							$pname = isset( $p['name'] ) ? $p['name'] : '';
							$pbr   = isset( $p['brochure'] ) ? $p['brochure'] : '';
							$pk    = isset( $knowledge[ $pid ] ) ? $knowledge[ $pid ] : '';
							?>
							<tr class="nafas-product-row">
								<td><input type="text" name="product_id[]" value="<?php echo esc_attr( $pid ); ?>" dir="ltr" class="widefat"></td>
								<td><input type="text" name="product_name[]" value="<?php echo esc_attr( $pname ); ?>" class="widefat"></td>
								<td><textarea name="product_knowledge[]" rows="2" class="widefat"><?php echo esc_textarea( $pk ); ?></textarea></td>
								<td><input type="url" name="product_brochure[]" value="<?php echo esc_attr( $pbr ); ?>" dir="ltr" class="widefat" placeholder="https://..."></td>
								<td><button type="button" class="button nafas-remove-product">&times;</button></td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
				<p><button type="button" class="button button-secondary" id="nafas-add-product"><?php esc_html_e( '+ افزودن محصول', 'nafas-chatbot' ); ?></button></p>

				<h3 class="nafas-section" style="margin-top:32px"><?php esc_html_e( 'پاسخ‌های پیشنهادی (Quick Replies)', 'nafas-chatbot' ); ?></h3>
				<p class="description"><?php esc_html_e( 'دکمه‌های پیشنهادی که هنگام گفتگو درباره یک محصول نمایش داده می‌شوند. کاربر با یک کلیک، سوال آماده را می‌پرسد. دکمه «بروشور» در صورت تنظیم لینک، به‌صورت خودکار به محصول اضافه می‌شود.', 'nafas-chatbot' ); ?></p>

				<table class="form-table">
					<tr>
						<th><?php esc_html_e( 'فعال‌سازی', 'nafas-chatbot' ); ?></th>
						<td><label class="nafas-switch"><input type="checkbox" name="quick_replies_enabled" value="yes" <?php checked( $s['quick_replies_enabled'], 'yes' ); ?>><span class="nafas-switch__slider"></span></label></td>
					</tr>
				</table>

				<table class="nafas-products-table widefat" id="nafas-quick-replies">
					<thead>
						<tr>
							<th style="width:200px"><?php esc_html_e( 'برچسب دکمه', 'nafas-chatbot' ); ?></th>
							<th><?php esc_html_e( 'سوالی که ارسال می‌شود', 'nafas-chatbot' ); ?></th>
							<th style="width:40px"></th>
						</tr>
					</thead>
					<tbody>
						<?php foreach ( (array) $s['quick_replies'] as $qr ) : ?>
							<tr class="nafas-quick-row">
								<td><input type="text" name="quick_reply_label[]" value="<?php echo esc_attr( isset( $qr['label'] ) ? $qr['label'] : '' ); ?>" class="widefat"></td>
								<td><input type="text" name="quick_reply_question[]" value="<?php echo esc_attr( isset( $qr['question'] ) ? $qr['question'] : '' ); ?>" class="widefat"></td>
								<td><button type="button" class="button nafas-remove-quick">&times;</button></td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>
				<p><button type="button" class="button button-secondary" id="nafas-add-quick"><?php esc_html_e( '+ افزودن پاسخ پیشنهادی', 'nafas-chatbot' ); ?></button></p>
			</div>

			<!-- ظاهر -->
			<div id="tab-appearance" class="nafas-tab-panel">
				<table class="form-table">
					<tr>
						<th><label for="position"><?php esc_html_e( 'موقعیت دکمه', 'nafas-chatbot' ); ?></label></th>
						<td>
							<select name="position" id="position">
								<option value="right" <?php selected( $s['position'], 'right' ); ?>><?php esc_html_e( 'پایین راست', 'nafas-chatbot' ); ?></option>
								<option value="left" <?php selected( $s['position'], 'left' ); ?>><?php esc_html_e( 'پایین چپ', 'nafas-chatbot' ); ?></option>
							</select>
						</td>
					</tr>
					<tr>
						<th><label for="primary_color"><?php esc_html_e( 'رنگ اصلی', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="primary_color" name="primary_color" value="<?php echo esc_attr( $s['primary_color'] ); ?>" class="nafas-color-picker" data-default-color="#b61615"></td>
					</tr>
					<tr>
						<th><label for="primary_hover"><?php esc_html_e( 'رنگ اصلی (هاور)', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="primary_hover" name="primary_hover" value="<?php echo esc_attr( $s['primary_hover'] ); ?>" class="nafas-color-picker" data-default-color="#991211"></td>
					</tr>
					<tr>
						<th><label for="theme_mode"><?php esc_html_e( 'حالت تم', 'nafas-chatbot' ); ?></label></th>
						<td>
							<select name="theme_mode" id="theme_mode">
								<option value="auto" <?php selected( $s['theme_mode'], 'auto' ); ?>><?php esc_html_e( 'خودکار (سیستم کاربر)', 'nafas-chatbot' ); ?></option>
								<option value="light" <?php selected( $s['theme_mode'], 'light' ); ?>><?php esc_html_e( 'روشن', 'nafas-chatbot' ); ?></option>
								<option value="dark" <?php selected( $s['theme_mode'], 'dark' ); ?>><?php esc_html_e( 'تیره', 'nafas-chatbot' ); ?></option>
							</select>
						</td>
					</tr>
				</table>
			</div>

			<!-- هوش مصنوعی -->
			<div id="tab-ai" class="nafas-tab-panel">
				<table class="form-table">
					<tr>
						<th><label for="ai_provider"><?php esc_html_e( 'موتور پاسخ‌گویی', 'nafas-chatbot' ); ?></label></th>
						<td>
							<select name="ai_provider" id="ai_provider">
								<option value="fallback" <?php selected( $s['ai_provider'], 'fallback' ); ?>><?php esc_html_e( 'پیام ثابت (بدون AI)', 'nafas-chatbot' ); ?></option>
								<option value="gemini" <?php selected( $s['ai_provider'], 'gemini' ); ?>><?php esc_html_e( 'Google Gemini', 'nafas-chatbot' ); ?></option>
								<option value="webhook" <?php selected( $s['ai_provider'], 'webhook' ); ?>><?php esc_html_e( 'Webhook سفارشی', 'nafas-chatbot' ); ?></option>
							</select>
						</td>
					</tr>
					<tr class="nafas-ai-gemini">
						<th><label for="gemini_api_key"><?php esc_html_e( 'کلید API جمینای', 'nafas-chatbot' ); ?></label></th>
						<td>
							<input type="password" id="gemini_api_key" name="gemini_api_key" value="<?php echo esc_attr( $s['gemini_api_key'] ); ?>" class="regular-text" dir="ltr" autocomplete="off">
							<p class="description"><?php esc_html_e( 'کلید را از Google AI Studio دریافت کنید.', 'nafas-chatbot' ); ?></p>
						</td>
					</tr>
					<tr class="nafas-ai-gemini">
						<th><label for="gemini_model"><?php esc_html_e( 'مدل جمینای', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="gemini_model" name="gemini_model" value="<?php echo esc_attr( $s['gemini_model'] ); ?>" class="regular-text" dir="ltr" placeholder="gemini-2.0-flash"></td>
					</tr>
					<tr class="nafas-ai-webhook">
						<th><label for="ai_webhook_url"><?php esc_html_e( 'آدرس Webhook', 'nafas-chatbot' ); ?></label></th>
						<td>
							<input type="url" id="ai_webhook_url" name="ai_webhook_url" value="<?php echo esc_attr( $s['ai_webhook_url'] ); ?>" class="large-text" dir="ltr">
							<p class="description"><?php esc_html_e( 'یک درخواست POST با فیلدهای message و product ارسال و پاسخ JSON با کلید reply انتظار می‌رود.', 'nafas-chatbot' ); ?></p>
						</td>
					</tr>
					<tr class="nafas-ai-gemini">
						<th><label for="ai_system_prompt"><?php esc_html_e( 'دستورالعمل سیستمی', 'nafas-chatbot' ); ?></label></th>
						<td><textarea id="ai_system_prompt" name="ai_system_prompt" rows="4" class="large-text"><?php echo esc_textarea( $s['ai_system_prompt'] ); ?></textarea></td>
					</tr>
					<tr>
						<th><label for="ai_fallback_msg"><?php esc_html_e( 'پیام پیش‌فرض/جایگزین', 'nafas-chatbot' ); ?></label></th>
						<td>
							<textarea id="ai_fallback_msg" name="ai_fallback_msg" rows="3" class="large-text"><?php echo esc_textarea( $s['ai_fallback_msg'] ); ?></textarea>
							<p class="description"><?php esc_html_e( 'وقتی موتور AI غیرفعال است یا پاسخی دریافت نشود، این پیام نمایش داده می‌شود.', 'nafas-chatbot' ); ?></p>
						</td>
					</tr>
				</table>
			</div>

			<!-- اعلان‌ها -->
			<div id="tab-notify" class="nafas-tab-panel">
				<h3 class="nafas-section"><?php esc_html_e( 'اعلان پیام‌رسان (بله / تلگرام)', 'nafas-chatbot' ); ?></h3>
				<table class="form-table">
					<tr>
						<th><?php esc_html_e( 'فعال‌سازی', 'nafas-chatbot' ); ?></th>
						<td><label class="nafas-switch"><input type="checkbox" name="notify_enabled" value="yes" <?php checked( $s['notify_enabled'], 'yes' ); ?>><span class="nafas-switch__slider"></span></label></td>
					</tr>
					<tr>
						<th><label for="notify_platform"><?php esc_html_e( 'پلتفرم', 'nafas-chatbot' ); ?></label></th>
						<td>
							<select name="notify_platform" id="notify_platform">
								<option value="bale" <?php selected( $s['notify_platform'], 'bale' ); ?>><?php esc_html_e( 'بله (Bale)', 'nafas-chatbot' ); ?></option>
								<option value="telegram" <?php selected( $s['notify_platform'], 'telegram' ); ?>><?php esc_html_e( 'تلگرام', 'nafas-chatbot' ); ?></option>
							</select>
						</td>
					</tr>
					<tr>
						<th><label for="notify_token"><?php esc_html_e( 'توکن بات', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="notify_token" name="notify_token" value="<?php echo esc_attr( $s['notify_token'] ); ?>" class="regular-text" dir="ltr" autocomplete="off"></td>
					</tr>
					<tr>
						<th><label for="notify_chat_id"><?php esc_html_e( 'شناسه چت (Chat ID)', 'nafas-chatbot' ); ?></label></th>
						<td><input type="text" id="notify_chat_id" name="notify_chat_id" value="<?php echo esc_attr( $s['notify_chat_id'] ); ?>" class="regular-text" dir="ltr"></td>
					</tr>
				</table>

				<h3 class="nafas-section"><?php esc_html_e( 'اعلان ایمیلی', 'nafas-chatbot' ); ?></h3>
				<table class="form-table">
					<tr>
						<th><?php esc_html_e( 'فعال‌سازی', 'nafas-chatbot' ); ?></th>
						<td><label class="nafas-switch"><input type="checkbox" name="email_enabled" value="yes" <?php checked( $s['email_enabled'], 'yes' ); ?>><span class="nafas-switch__slider"></span></label></td>
					</tr>
					<tr>
						<th><label for="email_to"><?php esc_html_e( 'ایمیل دریافت‌کننده', 'nafas-chatbot' ); ?></label></th>
						<td>
							<input type="email" id="email_to" name="email_to" value="<?php echo esc_attr( $s['email_to'] ); ?>" class="regular-text" dir="ltr">
							<p class="description"><?php esc_html_e( 'در صورت خالی بودن، به ایمیل مدیر سایت ارسال می‌شود.', 'nafas-chatbot' ); ?></p>
						</td>
					</tr>
				</table>
			</div>
		</div>

		<p class="submit">
			<button type="submit" name="nafas_chatbot_save_settings" class="button button-primary button-hero">
				<?php esc_html_e( 'ذخیره تنظیمات', 'nafas-chatbot' ); ?>
			</button>
		</p>
	</form>
</div>
