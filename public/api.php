<?php
/**
 * NAFAS Pharmed Admin API
 *
 * Actions:
 * - GET: returns saved server content when it exists
 * - POST login: validates admin password and issues a session token
 * - POST save_data: validates X-Admin-Token and saves catalogs/videos/banners
 */

header('Content-Type: application/json; charset=utf-8');

// CORS: restrict to ALLOWED_ORIGINS env var (comma-separated). Never use "*".
$allowed_origins = array_filter(array_map('trim', explode(',', getenv('ALLOWED_ORIGINS') ?: 'http://localhost:5173,http://localhost:3000')));
$request_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($request_origin !== '' && in_array($request_origin, $allowed_origins, true)) {
    header('Access-Control-Allow-Origin: ' . $request_origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Password, X-Admin-Token');
header('Access-Control-Max-Age: 3600');

const TOKEN_TTL_SECONDS = 86400;

$credentials_file = __DIR__ . '/.admin-credentials.json';
$token_file = __DIR__ . '/.admin-tokens.json';
$content_dir = __DIR__ . '/data';
$content_file = __DIR__ . '/data/content.json';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(json_encode(['status' => 'ok']));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($content_file)) {
        readfile($content_file);
        exit;
    }

    http_response_code(404);
    exit(json_encode(['error' => 'No server content saved']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed', 'valid' => false]));
}

$request_body = json_decode(file_get_contents('php://input'), true);
if (!is_array($request_body)) {
    $request_body = [];
}

$action = $request_body['action'] ?? (isset($request_body['password']) ? 'login' : '');

if ($action === 'save_data') {
    save_data($request_body, $token_file, $content_dir, $content_file);
}

if ($action === 'login' || $action === '') {
    login($request_body, $credentials_file, $token_file);
}

http_response_code(400);
exit(json_encode(['error' => 'Unknown action', 'valid' => false]));

function ensure_credentials(string $credentials_file): array {
    if (!file_exists($credentials_file)) {
        $default_credentials = [
            'password' => password_hash('nafas-admin-2026', PASSWORD_BCRYPT),
            'created_at' => date('Y-m-d H:i:s'),
            'note' => 'CHANGE PASSWORD IMMEDIATELY - Default credentials are NOT secure'
        ];
        file_put_contents($credentials_file, json_encode($default_credentials, JSON_PRETTY_PRINT));
        chmod($credentials_file, 0600);
    }

    $credentials = json_decode(file_get_contents($credentials_file), true);
    if (!$credentials || !isset($credentials['password'])) {
        http_response_code(500);
        exit(json_encode(['error' => 'Configuration error', 'valid' => false]));
    }

    return $credentials;
}

function login(array $request_body, string $credentials_file, string $token_file): void {
    $credentials = ensure_credentials($credentials_file);
    $submitted_password = $_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? $request_body['password'] ?? '';

    if (empty($submitted_password)) {
        http_response_code(400);
        exit(json_encode(['error' => 'Password is required', 'valid' => false]));
    }

    if (!password_verify($submitted_password, $credentials['password'])) {
        http_response_code(401);
        exit(json_encode(['error' => 'Invalid password', 'valid' => false]));
    }

    $token = bin2hex(random_bytes(32));
    $tokens = load_tokens($token_file);
    $tokens[$token] = [
        'created_at' => time(),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ];

    write_tokens($token_file, prune_tokens($tokens));

    http_response_code(200);
    exit(json_encode([
        'valid' => true,
        'token' => $token,
        'message' => 'Welcome'
    ]));
}

function save_data(array $request_body, string $token_file, string $content_dir, string $content_file): void {
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if (!is_valid_token($token, $token_file)) {
        http_response_code(401);
        exit(json_encode(['success' => false, 'error' => 'Invalid or expired admin token']));
    }

    $catalogs = $request_body['catalogs'] ?? null;
    $videos = $request_body['videos'] ?? null;
    $banners = $request_body['banners'] ?? [];

    if (!is_array($catalogs) || !is_array($videos) || !is_array($banners)) {
        http_response_code(400);
        exit(json_encode(['success' => false, 'error' => 'Invalid data payload']));
    }

    foreach ($catalogs as $catalog) {
        if (!is_array($catalog) || empty($catalog['id']) || empty($catalog['title']) || !isset($catalog['pages']) || !is_array($catalog['pages'])) {
            http_response_code(400);
            exit(json_encode(['success' => false, 'error' => 'Invalid catalog payload']));
        }
    }

    if (!is_dir($content_dir)) {
        mkdir($content_dir, 0755, true);
    }

    $payload = [
        'catalogs' => array_values($catalogs),
        'videos' => array_values($videos),
        'banners' => array_values($banners),
        'updated_at' => date('c')
    ];

    $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false || file_put_contents($content_file, $encoded, LOCK_EX) === false) {
        http_response_code(500);
        exit(json_encode(['success' => false, 'error' => 'Unable to write content file']));
    }

    chmod($content_file, 0640);
    http_response_code(200);
    exit(json_encode(['success' => true, 'message' => 'Data saved']));
}

function load_tokens(string $token_file): array {
    if (!file_exists($token_file)) {
        return [];
    }

    $tokens = json_decode(file_get_contents($token_file), true);
    return is_array($tokens) ? $tokens : [];
}

function prune_tokens(array $tokens): array {
    $now = time();
    return array_filter($tokens, function ($token_data) use ($now) {
        return is_array($token_data)
            && isset($token_data['created_at'])
            && ($now - (int)$token_data['created_at']) < TOKEN_TTL_SECONDS;
    });
}

function write_tokens(string $token_file, array $tokens): void {
    file_put_contents($token_file, json_encode($tokens, JSON_PRETTY_PRINT), LOCK_EX);
    chmod($token_file, 0600);
}

function is_valid_token(string $submitted_token, string $token_file): bool {
    if ($submitted_token === '') {
        return false;
    }

    $tokens = prune_tokens(load_tokens($token_file));
    write_tokens($token_file, $tokens);

    foreach (array_keys($tokens) as $stored_token) {
        if (hash_equals($stored_token, $submitted_token)) {
            return true;
        }
    }

    return false;
}
?>
