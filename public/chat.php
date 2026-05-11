<?php
/**
 * هندلر چت هوشمند (Placeholder)
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
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

    // در اینجا می‌توانید از APIهای هوش مصنوعی مثل Gemini استفاده کنید.
    // فعلاً یک پاسخ پیش‌فرض برمی‌گردانیم.
    
    if (empty($user_message)) {
        echo "لطفاً سوال خود را بپرسید.";
        exit;
    }

    echo "سپاس از سوال شما در مورد این محصول. من دستیار هوشمند نفس فارمد هستم. به زودی قابلیت پاسخگویی پیشرفته فعال خواهد شد. فعلاً برای دریافت اطلاعات دقیق‌تر می‌توانید با شماره‌های شرکت تماس بگیرید یا از بخش 'درخواست مشاوره' استفاده کنید.";

} else {
    http_response_code(405);
    echo "Method Not Allowed";
}
