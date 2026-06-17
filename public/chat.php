<?php
/**
 * هندلر چت هوشمند — اتصال به Gemini API
 * توکن فرم: X-Form-Token header (== CHAT_FORM_TOKEN env var)
 * کلید Gemini: GEMINI_API_KEY env var
 */

// CORS
$allowed_origins = explode(',', getenv('ALLOWED_ORIGINS') ?: 'https://nafaspharmed.com');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: " . trim($allowed_origins[0]));
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Form-Token");
header("Content-Type: text/plain; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// احراز هویت
$expected_token = getenv('CHAT_FORM_TOKEN');
$provided_token = $_SERVER['HTTP_X_FORM_TOKEN'] ?? '';

if (!empty($expected_token) && !hash_equals($expected_token, $provided_token)) {
    http_response_code(401);
    echo "دسترسی رد شد.";
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Method Not Allowed";
    exit;
}

// Rate limiting
$ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$file = sys_get_temp_dir() . '/nafas_rate_' . md5($ip) . '.json';
$today = date('Y-m-d');
$rl   = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
if (($rl[$today] ?? 0) >= 100) {
    http_response_code(429);
    echo "محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.";
    exit;
}
$rl[$today] = ($rl[$today] ?? 0) + 1;
file_put_contents($file, json_encode([$today => $rl[$today]]));

$user_message = trim($_POST['message'] ?? '');
$product_id   = trim($_POST['product']  ?? 'general');

if (empty($user_message)) {
    echo "لطفاً سوال خود را بپرسید.";
    exit;
}

// ─── Gemini API ──────────────────────────────────────────────────────────────
$api_key = getenv('GEMINI_API_KEY');

if (!empty($api_key)) {
    $system_prompt = "تو دستیار هوشمند شرکت دانش‌بنیان نفس زیست فارمد هستی. "
        . "وظیفه‌ات پاسخگویی دقیق و حرفه‌ای به سوالات بیماران درباره داروها و محصولات این شرکت است. "
        . "همیشه به فارسی پاسخ بده، صادقانه و کوتاه (حداکثر ۳ پاراگراف). "
        . "اگر سوال خارج از حوزه داروی نفس فارمد است، مودبانه راهنمایی کن با متخصص مشورت کنند."
        . (($product_id !== 'general') ? " کاربر در مورد محصول با شناسه «$product_id» سوال می‌پرسد." : '');

    $payload = json_encode([
        'contents' => [
            ['role' => 'user', 'parts' => [['text' => $user_message]]]
        ],
        'system_instruction' => [
            'parts' => [['text' => $system_prompt]]
        ],
        'generationConfig' => [
            'maxOutputTokens' => 512,
            'temperature'     => 0.4,
        ]
    ]);

    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$api_key";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    ]);

    $response  = curl_exec($ch);
    $curl_err  = curl_error($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response !== false && $http_code === 200) {
        $data = json_decode($response, true);
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if ($text) {
            echo trim($text);
            exit;
        }
    }

    // اگر Gemini خطا داد، log کن و به fallback برو
    error_log("Gemini API error (HTTP $http_code): " . ($curl_err ?: substr($response, 0, 200)));
}

// ─── Fallback ────────────────────────────────────────────────────────────────
echo "سپاس از سوال شما. من دستیار هوشمند نفس فارمد هستم. "
   . "در حال حاضر قادر به پاسخگویی نیستم. "
   . "برای دریافت اطلاعات دقیق‌تر با شماره‌های شرکت تماس بگیرید یا از بخش «درخواست مشاوره» استفاده کنید.";
