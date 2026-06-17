<?php
/**
 * اسکریپت ثبت فرم‌های مشاوره و عوارض و ارسال نوتیفیکیشن به بات بله
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
header("Content-Type: application/json; charset=UTF-8");

// مدیریت درخواست‌های OPTIONS (Preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// احراز هویت: بررسی توکن
$expected_token = getenv('FORM_SUBMIT_TOKEN');
$provided_token = $_SERVER['HTTP_X_FORM_TOKEN'] ?? '';

if (empty($expected_token) || $expected_token !== $provided_token) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "دسترسی رد شد. توکن معتبر نیست."]);
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
    echo json_encode([
        "status" => "blocked",
        "message" => "محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید."
    ]);
    exit;
}

$data[$today]++;
file_put_contents($file, json_encode($data));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // دریافت داده‌ها از $_POST (فرمت x-www-form-urlencoded)
    $type = isset($_POST['type']) ? $_POST['type'] : 'نامشخص';
    $name = isset($_POST['name']) ? $_POST['name'] : 'نامشخص';
    $phone = isset($_POST['phone']) ? $_POST['phone'] : 'نامشخص';
    $description = isset($_POST['description']) ? $_POST['description'] : 'توضیحاتی وارد نشده است';
    $product = isset($_POST['product']) ? $_POST['product'] : null;

    // اعتبارسنجی و پاک‌سازی ورودی‌ها
    $type = trim(strip_tags($type));
    $name = trim(strip_tags($name));
    $phone = trim(strip_tags($phone));
    $description = trim(strip_tags($description));
    $product = $product ? trim(strip_tags($product)) : null;

    if (mb_strlen($name) < 2 || mb_strlen($name) > 80) {
        http_response_code(400);
        echo json_encode([ "status" => "error", "message" => "نام نامعتبر است." ]);
        exit;
    }

    if (!preg_match('/^(\+98|0)?9\d{9}$/', $phone)) {
        http_response_code(400);
        echo json_encode([ "status" => "error", "message" => "شماره موبایل نامعتبر است." ]);
        exit;
    }

    if (mb_strlen($description) < 10 || mb_strlen($description) > 1000) {
        http_response_code(400);
        echo json_encode([ "status" => "error", "message" => "طول توضیحات نامعتبر است." ]);
        exit;
    }

    // --- ذخیره در فایل ---
    $backupFile = __DIR__ . "/requests.php";
    $requests = [];
    if (file_exists($backupFile)) {
        $content = file_get_contents($backupFile);
        $content = str_replace('<?php die("Access Denied"); ?>', '', $content);
        $requests = json_decode($content, true);
        if (!is_array($requests)) $requests = [];
    }
    
    $requests[] = [
        'type' => $type,
        'name' => $name,
        'phone' => $phone,
        'description' => $description,
        'product' => $product,
        'ip' => $ip,
        'date' => date("Y-m-d H:i:s")
    ];
    
    $json_content = json_encode($requests, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($backupFile, '<?php die("Access Denied"); ?>' . "\n" . $json_content);

    // --- تنظیمات بات بله ---
    // توکن و chat_id را از متغیرهای محیطی بخوانید (BALE_TOKEN, BALE_CHAT_ID)
    $token = getenv('BALE_TOKEN');
    $chat_id = getenv('BALE_CHAT_ID');

    // --- ساخت متن پیام ---
    $message = "📥 دریافت درخواست جدید از پورتال آموزش بیمار\n\n";
    $message .= "📋 نوع فرم: " . $type . "\n";
    $message .= "👤 نام کاربر: " . $name . "\n";
    $message .= "📞 شماره تماس: " . $phone . "\n";

    if ($product) {
        $message .= "💊 محصول مرتبط: " . $product . "\n";
    }

    $message .= "\n📝 متن درخواست:\n" . $description . "\n\n";
    $message .= "⏰ زمان ثبت: " . date("H:i - Y/m/d");

    // --- ارسال به بات بله (فقط اگر توکن و chat_id موجود باشند) ---
    if (!empty($token) && !empty($chat_id)) {
        $url = "https://tapi.bale.ai/bot" . $token . "/sendMessage";

        $params = [
            'chat_id' => $chat_id,
            'text' => $message
        ];

        // ارسال درخواست POST با cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            error_log("Failed to send notification to Bale for: " . $name . " Error: " . $curl_error);
        }
    }

    // ارسال پاسخ موفقیت به فرانت‌اِند
    echo json_encode([
        "status" => "success",
        "message" => "اطلاعات با موفقیت ثبت و ارسال شد."
    ]);

} else {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "فقط متد POST مجاز است."
    ]);
}
