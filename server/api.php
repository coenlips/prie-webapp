<?php
// Online back-up voor de receptenapp.
// Zet dit bestand samen met config.php in een map op je website,
// bijvoorbeeld https://coenlips.nl/recepten-api/api.php
// De tabellen worden bij de eerste aanroep vanzelf aangemaakt.

declare(strict_types=1);

$config = __DIR__ . '/config.php';
if (!is_file($config)) fail(500, 'config.php ontbreekt op de server.');
try {
    require $config;
} catch (Throwable $e) {
    fail(500, 'Fout in config.php op regel ' . $e->getLine() . '. Controleer de aanhalingstekens (gebruik \', geen ’).');
}
foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'APP_PASSWORD', 'ALLOWED_ORIGINS'] as $c) {
    if (!defined($c)) fail(500, "In config.php ontbreekt $c.");
}

/* ---------- CORS: alleen de app mag deze API aanroepen ---------- */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, X-Token');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/* ---------- Hulpfuncties ---------- */

function fail(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function out($data): void {
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    } catch (PDOException $e) {
        fail(500, 'Kan geen verbinding maken met de database. Controleer config.php.');
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        data LONGTEXT NULL,
        deleted TINYINT(1) NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten_tokens (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        created_at BIGINT NOT NULL,
        last_used BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // Postvak: recepten die vanuit Safari (via een opdracht) zijn gedeeld
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten_inbox (
        id INT AUTO_INCREMENT PRIMARY KEY,
        created_at BIGINT NOT NULL,
        data LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    return $pdo;
}

function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function now_ms(): int { return (int) round(microtime(true) * 1000); }

function require_token(): void {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) fail(401, 'Niet ingelogd.');
    $hash = hash('sha256', $token);
    $st = db()->prepare('UPDATE recepten_tokens SET last_used = ? WHERE token_hash = ?');
    $st->execute([now_ms(), $hash]);
    if ($st->rowCount() === 0) {
        $check = db()->prepare('SELECT 1 FROM recepten_tokens WHERE token_hash = ?');
        $check->execute([$hash]);
        if (!$check->fetchColumn()) fail(401, 'Niet ingelogd.');
    }
}


/* ---------- Webpagina's ophalen (voor recepten importeren) ---------- */

const FETCH_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

// Alleen openbare adressen: nooit iets binnen het netwerk van de server zelf.
function check_public_url(string $url): array {
    $p = parse_url($url);
    if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['http', 'https'], true) || empty($p['host'])) fail(400, 'Ongeldig adres.');
    if (isset($p['user']) || isset($p['pass'])) fail(400, 'Ongeldig adres.');
    $host = $p['host'];
    if (defined('FETCH_SKIP_IP_CHECK') && FETCH_SKIP_IP_CHECK) return $p;   // alleen voor lokaal testen
    $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : (gethostbynamel($host) ?: []);
    if (!$ips) fail(400, 'Deze website bestaat niet of is niet bereikbaar.');
    foreach ($ips as $ip) {
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) fail(400, 'Dit adres is niet toegestaan.');
    }
    return $p;
}

// Haalt een adres op (volgt zelf maximaal 5 doorverwijzingen, elke keer opnieuw gecontroleerd).
function http_get(string $url, int $maxBytes, string $accept): array {
    for ($hop = 0; $hop < 6; $hop++) {
        check_public_url($url);
        $headers = []; $body = '';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => false,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_ENCODING => '',
            CURLOPT_HTTPHEADER => ['User-Agent: ' . FETCH_UA, 'Accept: ' . $accept, 'Accept-Language: nl-NL,nl;q=0.9,en;q=0.6'],
            CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$headers) {
                $parts = explode(':', $line, 2);
                if (count($parts) === 2) $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
                return strlen($line);
            },
            CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$body, $maxBytes) {
                $body .= $chunk;
                return strlen($body) > $maxBytes ? 0 : strlen($chunk);   // te groot: afbreken
            },
        ]);
        $ok = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($ok === false && strlen($body) <= $maxBytes) fail(502, 'De website reageert niet (' . $err . ').');
        if ($status >= 300 && $status < 400 && !empty($headers['location'])) {
            $url = resolve_url($url, $headers['location']);
            continue;
        }
        return ['status' => $status, 'body' => substr($body, 0, $maxBytes), 'type' => $headers['content-type'] ?? '', 'url' => $url];
    }
    fail(502, 'Te veel doorverwijzingen.');
}

function resolve_url(string $base, string $rel): string {
    if (preg_match('#^https?://#i', $rel)) return $rel;
    $b = parse_url($base);
    $origin = $b['scheme'] . '://' . $b['host'] . (isset($b['port']) ? ':' . $b['port'] : '');
    if (str_starts_with($rel, '//')) return $b['scheme'] . ':' . $rel;
    if (str_starts_with($rel, '/')) return $origin . $rel;
    $dir = preg_replace('#/[^/]*$#', '/', $b['path'] ?? '/');
    return $origin . $dir . $rel;
}

// Haalt de receptgegevens uit een pagina: alle JSON-LD-blokken en de Open Graph-gegevens.
function extract_page(string $html): array {
    preg_match_all('#<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>#is', $html, $m);
    $og = [];
    if (preg_match_all('#<meta[^>]+(?:property|name)=["\'](og:title|og:image|og:description|description)["\'][^>]*>#i', $html, $mm)) {
        foreach ($mm[0] as $i => $tag) {
            if (preg_match('#content=["\']([^"\']*)["\']#i', $tag, $c)) $og[$mm[1][$i]] = html_entity_decode($c[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
    }
    preg_match('#<title[^>]*>(.*?)</title>#is', $html, $t);
    $title = trim(html_entity_decode($t[1] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    $blocked = (bool) preg_match('#(Access Denied|Human Verification|captcha|Just a moment|Attention Required)#i', $title . ' ' . substr($html, 0, 3000));
    return ['jsonld' => array_values(array_map('trim', $m[1])), 'og' => $og, 'title' => $title, 'blocked' => $blocked];
}

/* ---------- Acties ---------- */

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'ping':
        db();
        out(['ok' => true]);

    case 'login': {
        $password = (string) (body()['password'] ?? '');
        if (APP_PASSWORD === '' || APP_PASSWORD === 'kies-hier-een-wachtwoord') fail(500, 'Stel eerst een wachtwoord in in config.php.');
        if (!hash_equals(APP_PASSWORD, $password)) {
            sleep(2); // vertraagt het raden van wachtwoorden
            fail(403, 'Wachtwoord klopt niet.');
        }
        $token = bin2hex(random_bytes(32));
        db()->prepare('INSERT INTO recepten_tokens (token_hash, created_at, last_used) VALUES (?, ?, ?)')
            ->execute([hash('sha256', $token), now_ms(), now_ms()]);
        out(['token' => $token]);
    }

    case 'logout': {
        $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
        db()->prepare('DELETE FROM recepten_tokens WHERE token_hash = ?')->execute([hash('sha256', $token)]);
        out(['ok' => true]);
    }

    case 'list':
        require_token();
        $rows = db()->query('SELECT id, deleted, updated_at FROM recepten')->fetchAll();
        out(array_map(fn($r) => ['id' => $r['id'], 'deleted' => (bool) $r['deleted'], 'updated_at' => (int) $r['updated_at']], $rows));

    case 'get': {
        require_token();
        $ids = array_values(array_filter((array) (body()['ids'] ?? []), 'is_string'));
        if (!$ids) out([]);
        $in = implode(',', array_fill(0, count($ids), '?'));
        $st = db()->prepare("SELECT id, data, updated_at FROM recepten WHERE deleted = 0 AND id IN ($in)");
        $st->execute($ids);
        out(array_map(fn($r) => ['id' => $r['id'], 'data' => json_decode((string) $r['data'], true), 'updated_at' => (int) $r['updated_at']], $st->fetchAll()));
    }

    case 'put': {
        require_token();
        $rows = (array) (body()['rows'] ?? []);
        // Alleen overschrijven als de nieuwe versie minstens zo recent is.
        $st = db()->prepare('INSERT INTO recepten (id, data, deleted, updated_at) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              data       = IF(VALUES(updated_at) >= updated_at, VALUES(data), data),
              deleted    = IF(VALUES(updated_at) >= updated_at, VALUES(deleted), deleted),
              updated_at = GREATEST(updated_at, VALUES(updated_at))');
        foreach ($rows as $r) {
            if (!is_array($r) || !isset($r['id']) || !is_string($r['id']) || strlen($r['id']) > 64) continue;
            $deleted = !empty($r['deleted']);
            $st->execute([
                $r['id'],
                $deleted ? null : json_encode($r['data'] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                $deleted ? 1 : 0,
                (int) ($r['updated_at'] ?? now_ms()),
            ]);
        }
        out(['ok' => true]);
    }

    case 'fetch': {
        require_token();
        $url = trim((string) (body()['url'] ?? ''));
        if ($url === '' || strlen($url) > 2000) fail(400, 'Geef een adres op.');
        if (!str_contains($url, '://')) $url = 'https://' . $url;   // 'www.jumbo.com/...' mag ook
        $r = http_get($url, 4 * 1024 * 1024, 'text/html,application/xhtml+xml');
        $page = extract_page($r['body']);
        out(['status' => $r['status'], 'url' => $r['url']] + $page);
    }

    case 'image': {
        require_token();
        $url = trim((string) (body()['url'] ?? ''));
        $r = http_get($url, 8 * 1024 * 1024, 'image/avif,image/webp,image/jpeg,image/png,image/*');
        $type = strtolower(explode(';', $r['type'])[0]);
        if ($r['status'] !== 200 || !str_starts_with($type, 'image/')) fail(502, 'De foto kon niet worden opgehaald.');
        out(['data' => 'data:' . $type . ';base64,' . base64_encode($r['body'])]);
    }

    // Vanuit de opdracht in Safari: zonder inlogtoken, maar met het app-wachtwoord
    case 'inbox_add': {
        $b = body();
        if (!hash_equals(APP_PASSWORD, (string) ($b['key'] ?? ''))) { sleep(2); fail(403, 'Wachtwoord klopt niet.'); }
        $data = $b['data'] ?? null;
        if (is_string($data)) $data = json_decode($data, true);
        if (!is_array($data) || empty($data['url'])) fail(400, 'Geen receptgegevens ontvangen.');
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (strlen($json) > 3 * 1024 * 1024) fail(413, 'Pagina is te groot.');
        $count = (int) db()->query('SELECT COUNT(*) FROM recepten_inbox')->fetchColumn();
        if ($count >= 50) fail(429, 'Het postvak is vol. Open eerst Ricetta.');
        db()->prepare('INSERT INTO recepten_inbox (created_at, data) VALUES (?, ?)')->execute([now_ms(), $json]);
        out(['ok' => true, 'message' => 'Recept naar Ricetta gestuurd']);
    }

    case 'inbox_list':
        require_token();
        $rows = db()->query('SELECT id, created_at, data FROM recepten_inbox ORDER BY id')->fetchAll();
        out(array_map(fn($r) => ['id' => (int) $r['id'], 'created_at' => (int) $r['created_at'], 'data' => json_decode($r['data'], true)], $rows));

    case 'inbox_delete': {
        require_token();
        db()->prepare('DELETE FROM recepten_inbox WHERE id = ?')->execute([(int) (body()['id'] ?? 0)]);
        out(['ok' => true]);
    }

    default:
        fail(404, 'Onbekende actie.');
}
