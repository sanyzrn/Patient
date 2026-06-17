<?php
/**
 * هندلر چت هوشمند — Gemini API با پشتیبانی multi-turn و پیشنهاد سوال
 * POST params: message, product, history (JSON string)
 * Returns JSON: {"reply": "...", "suggestions": ["...", "..."]}
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
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

// احراز هویت
$expected_token = getenv('CHAT_FORM_TOKEN');
$provided_token = $_SERVER['HTTP_X_FORM_TOKEN'] ?? '';
if (!empty($expected_token) && !hash_equals($expected_token, $provided_token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Rate limiting (در temp دایرکتوری سرور، نه public/)
$ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$file = sys_get_temp_dir() . '/nafas_rl_' . md5($ip) . '.json';
$today = date('Y-m-d');
$rl   = file_exists($file) ? (json_decode(file_get_contents($file), true) ?: []) : [];
if (($rl[$today] ?? 0) >= 100) {
    http_response_code(429);
    echo json_encode(['error' => 'rate_limit', 'reply' => 'محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.']);
    exit;
}
$rl[$today] = ($rl[$today] ?? 0) + 1;
file_put_contents($file, json_encode([$today => $rl[$today]]));

$user_message = trim($_POST['message'] ?? '');
$product_id   = trim($_POST['product']  ?? 'general');
$history_raw  = $_POST['history'] ?? '[]';

if (empty($user_message)) {
    echo json_encode(['reply' => 'لطفاً سوال خود را بپرسید.', 'suggestions' => []]);
    exit;
}

// پردازش تاریخچه مکالمه
$history = [];
$raw_parsed = json_decode($history_raw, true);
if (is_array($raw_parsed)) {
    foreach (array_slice($raw_parsed, -10) as $turn) {
        if (isset($turn['role'], $turn['content']) && in_array($turn['role'], ['user', 'model'])) {
            $history[] = [
                'role'  => $turn['role'],
                'parts' => [['text' => (string)$turn['content']]],
            ];
        }
    }
}

// ─── Gemini API ──────────────────────────────────────────────────────────────
$api_key = getenv('GEMINI_API_KEY');

if (!empty($api_key)) {
    $product_context = ($product_id !== 'general')
        ? " کاربر درباره محصول با شناسه «{$product_id}» سوال می‌پرسد."
        : '';

    $system_prompt = "تو دستیار هوشمند شرکت دانش‌بنیان نفس زیست فارمد هستی. "
        . "وظیفه‌ات پاسخگویی دقیق، مودبانه و حرفه‌ای به سوالات بیماران درباره داروها و محصولات این شرکت است. "
        . "همیشه به فارسی پاسخ بده. پاسخ‌ها باید کوتاه و مفید باشند (حداکثر ۳ پاراگراف). "
        . "از markdown برای قالب‌بندی استفاده کن: **متن bold**، - لیست، ## تیتر. "
        . "در پایان پاسخ، دقیقاً ۲ سوال پیشنهادی مرتبط به صورت آرایه JSON بنویس. "
        . "خروجی تو باید دقیقاً یک JSON معتبر باشد:\n"
        . '{"reply": "متن پاسخ فارسی اینجا", "suggestions": ["سوال پیشنهادی ۱", "سوال پیشنهادی ۲"]}'
        . $product_context;

    // ساخت contents با تاریخچه + سوال جدید
    $contents = $history;
    $contents[] = ['role' => 'user', 'parts' => [['text' => $user_message]]];

    $payload = json_encode([
        'contents'            => $contents,
        'system_instruction'  => ['parts' => [['text' => $system_prompt]]],
        'generationConfig'    => [
            'maxOutputTokens'  => 600,
            'temperature'      => 0.4,
            'responseMimeType' => 'application/json',
        ],
    ]);

    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$api_key}";
    $ch  = curl_init($url);
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
        $gemini = json_decode($response, true);
        $raw_text = $gemini['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if ($raw_text) {
            $parsed = json_decode(trim($raw_text), true);
            if (is_array($parsed) && isset($parsed['reply'])) {
                echo json_encode([
                    'reply'       => trim((string)$parsed['reply']),
                    'suggestions' => array_slice((array)($parsed['suggestions'] ?? []), 0, 3),
                ]);
                exit;
            }
            // اگر JSON پارس نشد، متن خام را به عنوان reply برگردان
            echo json_encode(['reply' => trim($raw_text), 'suggestions' => []]);
            exit;
        }
    }

    error_log("Gemini API error (HTTP {$http_code}): " . ($curl_err ?: substr((string)$response, 0, 300)));
}

// ─── Fallback ────────────────────────────────────────────────────────────────
echo json_encode([
    'reply'       => "سپاس از سوال شما. در حال حاضر قادر به پاسخگویی نیستم.\n\nبرای دریافت اطلاعات دقیق‌تر با شماره‌های شرکت تماس بگیرید یا از بخش **درخواست مشاوره** استفاده کنید.",
    'suggestions' => ['نحوه تماس با شرکت؟', 'محصولات نفس فارمد کدامند؟'],
]);
