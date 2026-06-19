<?php
/**
 * Lightweight chat endpoint.
 * Configure GEMINI_API_KEY in the server environment for live AI replies.
 */

header('Content-Type: application/json; charset=utf-8');

// CORS: restrict to ALLOWED_ORIGINS env var (comma-separated). Never use "*".
$allowed_origins = array_filter(array_map('trim', explode(',', getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://localhost:3000')));
$request_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($request_origin !== '' && in_array($request_origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $request_origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(json_encode(['status' => 'ok']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['reply' => 'Method not allowed']));
}

$message = trim($_POST['message'] ?? '');
$product = trim($_POST['product'] ?? 'general');
$history = json_decode($_POST['history'] ?? '[]', true);
if (!is_array($history)) {
    $history = [];
}

if ($message === '') {
    http_response_code(400);
    exit(json_encode(['reply' => 'پیام خالی است.']));
}

$api_key = getenv('GEMINI_API_KEY') ?: '';
if ($api_key === '') {
    exit(json_encode([
        'reply' => local_reply($message, $product),
        'suggestions' => ['اطلاعات تماس', 'محصولات', 'درخواست مشاوره']
    ], JSON_UNESCAPED_UNICODE));
}

$prompt = build_prompt($message, $product, $history);
$payload = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => [['text' => $prompt]]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.4,
        'maxOutputTokens' => 700
    ]
];

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . urlencode($api_key);
$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        'timeout' => 20
    ]
]);

$response = @file_get_contents($url, false, $context);
if ($response === false) {
    http_response_code(502);
    exit(json_encode(['reply' => 'در حال حاضر امکان دریافت پاسخ هوشمند وجود ندارد. لطفاً بعداً دوباره تلاش کنید.'], JSON_UNESCAPED_UNICODE));
}

$decoded = json_decode($response, true);
$reply = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
if ($reply === '') {
    http_response_code(502);
    exit(json_encode(['reply' => 'پاسخ معتبری از سرویس هوش مصنوعی دریافت نشد.'], JSON_UNESCAPED_UNICODE));
}

exit(json_encode([
    'reply' => $reply,
    'suggestions' => ['نحوه مصرف؟', 'عوارض جانبی؟', 'درخواست مشاوره']
], JSON_UNESCAPED_UNICODE));

function build_prompt(string $message, string $product, array $history): string {
    $history_text = '';
    foreach (array_slice($history, -6) as $item) {
        $role = $item['role'] ?? 'user';
        $content = $item['content'] ?? '';
        $history_text .= $role . ': ' . $content . "\n";
    }

    return "You are the NAFAS Pharmed patient support assistant. Reply in Persian unless the user asks otherwise. Keep answers concise, educational, and non-diagnostic. Encourage users to contact a healthcare professional for medical decisions.\n\nProduct context: {$product}\n\nRecent conversation:\n{$history_text}\nUser: {$message}";
}

function local_reply(string $message, string $product): string {
    $product_text = $product !== 'general' ? " درباره محصول انتخاب‌شده" : "";
    return "پیام شما$product_text دریافت شد. در حال حاضر کلید سرویس هوش مصنوعی روی سرور تنظیم نشده است، اما می‌توانید درخواست مشاوره ثبت کنید یا با تیم پشتیبانی نفس فارمد تماس بگیرید. برای تصمیم‌گیری درمانی حتماً با پزشک یا داروساز مشورت کنید.";
}
?>
