<?php
/**
 * Fix 4.8: Shared rate-limit helper included by chat.php and submit_form.php.
 * Usage:
 *   require_once __DIR__ . '/rate_limit.php';
 *   nafas_check_rate_limit($limit_per_day);
 *
 * On limit exceeded, sends 429 JSON response and exits.
 */

function nafas_check_rate_limit(int $limit = 100): void {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    // Fix 1.8: store rate-limit files in system temp dir, not web root
    $file = sys_get_temp_dir() . '/nafas_rl_' . md5($ip) . '.json';
    $today = date('Y-m-d');

    $data = [];
    if (file_exists($file)) {
        $raw = file_get_contents($file);
        $data = $raw !== false ? (json_decode($raw, true) ?: []) : [];
    }

    $count = $data[$today] ?? 0;

    if ($count >= $limit) {
        http_response_code(429);
        echo json_encode([
            'status'  => 'blocked',
            'error'   => 'rate_limit',
            'message' => 'محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.',
            'reply'   => 'محدودیت روزانه درخواست پر شده. لطفاً فردا مجدداً تلاش کنید.',
        ]);
        exit;
    }

    $data[$today] = $count + 1;
    // Only keep today's entry to avoid unbounded growth
    file_put_contents($file, json_encode([$today => $data[$today]]));
}
