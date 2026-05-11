<?php
// Read the generated index.html
$html_path = __DIR__ . '/index.html';
if (!file_exists($html_path)) {
    die("Error: index.html not found.");
}
$html = file_get_contents($html_path);

// Check if we have a 'cat' parameter
if (isset($_GET['cat']) && !empty($_GET['cat'])) {
    $catId = $_GET['cat'];
    
    // Read data.js
    $jsData = @file_get_contents(__DIR__ . '/data.js');
    if ($jsData) {
        $start = strpos($jsData, '{');
        $end = strrpos($jsData, '}');
        if ($start !== false && $end !== false) {
            $jsonStr = substr($jsData, $start, $end - $start + 1);
            $data = json_decode($jsonStr, true);
            
            if (isset($data['catalogs']) && is_array($data['catalogs'])) {
                foreach ($data['catalogs'] as $cat) {
                    if (isset($cat['id']) && $cat['id'] === $catId) {
                        $title = htmlspecialchars($cat['title'] . " | آموزش بیمار");
                        $desc = htmlspecialchars($cat['description']);
                        $image = htmlspecialchars($cat['coverImage']);
                        
                        // Replace OG tags in HTML safely
                        $html = preg_replace('/<meta property="og:title" content="[^"]*" \/>/i', '<meta property="og:title" content="' . $title . '" />', $html);
                        $html = preg_replace('/<meta property="og:description" content="[^"]*" \/>/i', '<meta property="og:description" content="' . $desc . '" />', $html);
                        $html = preg_replace('/<meta property="og:image" content="[^"]*" \/>/i', '<meta property="og:image" content="' . $image . '" />', $html);
                        
                        // Twitter tags
                        $html = preg_replace('/<meta name="twitter:title" content="[^"]*" \/>/i', '<meta name="twitter:title" content="' . $title . '" />', $html);
                        $html = preg_replace('/<meta name="twitter:description" content="[^"]*" \/>/i', '<meta name="twitter:description" content="' . $desc . '" />', $html);
                        $html = preg_replace('/<meta name="twitter:image" content="[^"]*" \/>/i', '<meta name="twitter:image" content="' . $image . '" />', $html);
                        
                        // Also replace main <title> tag
                        $html = preg_replace('/<title>.*<\/title>/i', '<title>' . $title . '</title>', $html);
                        break;
                    }
                }
            }
        }
    }
}

echo $html;
