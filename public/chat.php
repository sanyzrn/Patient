<?php
/**
 * هندلر چت هوشمند
 * توکن: ارسال در هدر X-Form-Token یا متغیر محیطی CHAT_FORM_TOKEN
 */

// تنظیم CORS
$allowed_origins = explode(',', getenv('ALLOWED_ORIGINS') ?: 'https://nafaspharmed.com');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: " . $allowed_origins[0]);
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Form-Token");
header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// احراز هویت: بررسی توکن
$expected_token = getenv('CHAT_FORM_TOKEN');
$provided_token = $_SERVER['HTTP_X_FORM_TOKEN'] ?? '';

if (empty($expected_token) || $expected_token !== $provided_token) {
    http_response_code(401);
    echo "دسترسی رد شد. توکن معتبر نیست.";
    exit;
}

$limit = 100; // تعداد مجاز در روز
$ip = $_SERVER['REMOTE_ADDR'];
$file = __DIR__ . "/rate_$ip.txt";
$today = date('Y-m-d');

$data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];

if (!isset($data[$today])) {
    $data = [$today => 0];
}

if ($data[$today] >= $limit) {
    http_response_code(429);
    echo "محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.";
    exit;
}

$data[$today]++;
file_put_contents($file, json_encode($data));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_message = isset($_POST['message']) ? $_POST['message'] : '';
    $product_id = isset($_POST['product']) ? $_POST['product'] : 'general';

    if (empty($user_message)) {
        echo "لطفاً سوال خود را بپرسید.";
        exit;
    }

    echo "سپاس از سوال شما در مورد این محصول. من دستیار هوشمند نفس فارمد هستم. به زودی قابلیت پاسخگویی پیشرفته فعال خواهد شد. فعلاً برای دریافت اطلاعات دقیق‌تر می‌توانید با شماره‌های شرکت تماس بگیرید یا از بخش 'درخواست مشاوره' استفاده کنید.";

} else {
    http_response_code(405);
    echo "Method Not Allowed";
}
