<?php
/**
 * Data API — خواندن و نوشتن data.json سمت سرور
 * GET  /api.php            → بازگشت داده‌های کنونی (عمومی)
 * POST /api.php            → ذخیره داده (نیازمند X-Admin-Token)
 */

// CORS
$allowed_origins = explode(',', getenv('ALLOWED_ORIGINS') ?: 'https://nafaspharmed.com');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: " . trim($allowed_origins[0]));
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Token");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$data_file = __DIR__ . '/data.json';

// ─── GET ─────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($data_file)) {
        echo file_get_contents($data_file);
    } else {
        echo json_encode(['catalogs' => [], 'videos' => [], 'banners' => []]);
    }
    exit;
}

// ─── POST ────────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // احراز هویت
    $expected_token = getenv('ADMIN_API_TOKEN');
    $provided_token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';

    if (empty($expected_token) || !hash_equals($expected_token, $provided_token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }

    $body = file_get_contents('php://input');
    $parsed = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
        exit;
    }

    if (!isset($parsed['catalogs'], $parsed['videos']) ||
        !is_array($parsed['catalogs']) || !is_array($parsed['videos'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required arrays: catalogs, videos']);
        exit;
    }

    $written = file_put_contents(
        $data_file,
        json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
    );

    if ($written === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not write data.json — check server permissions']);
        exit;
    }

    echo json_encode(['success' => true, 'bytes' => $written]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
