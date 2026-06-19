<?php
/**
 * Stores contact, consultation, and adverse-event submissions.
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
    exit(json_encode(['status' => 'error', 'message' => 'Method not allowed']));
}

if (!empty($_POST['_hp'] ?? '')) {
    exit(json_encode(['status' => 'success']));
}

$type = trim($_POST['type'] ?? 'Submission');
$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$description = trim($_POST['description'] ?? '');
$product = trim($_POST['product'] ?? '');

if ($name === '' || $phone === '' || $description === '') {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Required fields are missing']));
}

if (!preg_match('/^((\+98|0)?9\d{9})$/', $phone)) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Invalid phone number']));
}

$description_length = function_exists('mb_strlen') ? mb_strlen($description, 'UTF-8') : strlen($description);
if ($description_length < 10) {
    http_response_code(400);
    exit(json_encode(['status' => 'error', 'message' => 'Description is too short']));
}

$file = __DIR__ . '/.form-submissions.json';
$items = [];
if (file_exists($file)) {
    $decoded = json_decode(file_get_contents($file), true);
    if (is_array($decoded)) {
        $items = $decoded;
    }
}

$items[] = [
    'type' => $type,
    'name' => $name,
    'phone' => $phone,
    'description' => $description,
    'product' => $product,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    'created_at' => date('c')
];

if (count($items) > 1000) {
    $items = array_slice($items, -1000);
}

$encoded = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded === false || file_put_contents($file, $encoded, LOCK_EX) === false) {
    http_response_code(500);
    exit(json_encode(['status' => 'error', 'message' => 'Unable to save submission']));
}
chmod($file, 0600);

exit(json_encode(['status' => 'success']));
?>
