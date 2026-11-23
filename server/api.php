<?php
// Online opslag voor de receptenapp Ricetta, met eigen accounts per persoon.
// Zet dit bestand samen met config.php in een map op je website,
// bijvoorbeeld https://coenlips.nl/recepten-api/api.php
// De tabellen worden bij de eerste aanroep vanzelf aangemaakt of bijgewerkt.
//
// Overstappen vanaf de versie zonder accounts: log in de app in met je naam en het
// oude app-wachtwoord (APP_PASSWORD). Dan wordt jouw account aangemaakt als beheerder
// en worden alle bestaande recepten van jou.

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

function has_column(PDO $pdo, string $table, string $column): bool {
    $st = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
    $st->execute([$column]);
    return (bool) $st->fetch();
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
    // Recepten (en de boodschappenlijst) per gebruiker
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten (
        user_id INT NOT NULL DEFAULT 0,
        id VARCHAR(64) NOT NULL,
        data LONGTEXT NULL,
        deleted TINYINT(1) NOT NULL DEFAULT 0,
        updated_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten_tokens (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        last_used BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // Postvak: recepten die vanaf de iPhone (via een opdracht) zijn gedeeld
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten_inbox (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        data LONGTEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // Gebruikers. Wachtwoorden alleen als onomkeerbare hash (password_hash).
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(40) NOT NULL,
        name_key VARCHAR(40) NOT NULL UNIQUE,
        pw_hash VARCHAR(255) NOT NULL,
        is_admin TINYINT(1) NOT NULL DEFAULT 0,
        must_change TINYINT(1) NOT NULL DEFAULT 0,
        share_key CHAR(32) NOT NULL UNIQUE,
        created_at BIGINT NOT NULL,
        last_seen BIGINT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    // Mislukte inlogpogingen (om het raden van wachtwoorden te remmen)
    $pdo->exec("CREATE TABLE IF NOT EXISTS recepten_fails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_key VARCHAR(40) NOT NULL,
        ip VARCHAR(45) NOT NULL,
        at BIGINT NOT NULL,
        INDEX (at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Bijwerken vanaf de versie zonder accounts
    if (!has_column($pdo, 'recepten', 'user_id')) {
        $pdo->exec("ALTER TABLE recepten ADD COLUMN user_id INT NOT NULL DEFAULT 0 FIRST, DROP PRIMARY KEY, ADD PRIMARY KEY (user_id, id)");
    }
    if (!has_column($pdo, 'recepten_tokens', 'user_id')) {
        $pdo->exec("ALTER TABLE recepten_tokens ADD COLUMN user_id INT NOT NULL DEFAULT 0 AFTER token_hash");
    }
    if (!has_column($pdo, 'recepten_inbox', 'user_id')) {
        $pdo->exec("ALTER TABLE recepten_inbox ADD COLUMN user_id INT NOT NULL DEFAULT 0 AFTER id");
    }
    return $pdo;
}

function body(): array {
    static $data = null;
    if ($data !== null) return $data;
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = [];
    return $data;
}

function now_ms(): int { return (int) round(microtime(true) * 1000); }

function client_ip(): string { return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45); }

/* ---------- Gebruikers ---------- */

function clean_name(string $name): string {
    $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
    if ($name === '' || mb_strlen($name) > 40 || preg_match('/[\x00-\x1F\x7F<>]/u', $name)) {
        fail(400, 'Kies een naam van 1 tot 40 tekens.');
    }
    return $name;
}
function name_key(string $name): string { return mb_strtolower($name); }

function check_new_password(string $pw): void {
    if (mb_strlen($pw) < 8) fail(400, 'Kies een wachtwoord van minstens 8 tekens.');
    if (mb_strlen($pw) > 200) fail(400, 'Dat wachtwoord is te lang.');
}

// Makkelijk door te geven tijdelijk wachtwoord, zoals 'tomaat-basilicum-47'
function temp_password(): string {
    $w = ['tomaat', 'basilicum', 'pasta', 'risotto', 'olijf', 'citroen', 'salie', 'rozemarijn', 'oregano', 'knoflook',
          'pecorino', 'ricotta', 'burrata', 'polenta', 'gnocchi', 'ravioli', 'pesto', 'espresso', 'focaccia', 'venkel',
          'aubergine', 'courgette', 'artisjok', 'kappertje', 'peterselie', 'tijm', 'lasagne', 'parmezaan', 'cannoli', 'amaretto'];
    $a = $w[random_int(0, count($w) - 1)];
    do { $b = $w[random_int(0, count($w) - 1)]; } while ($b === $a);
    return $a . '-' . $b . '-' . random_int(10, 99);
}

function user_out(array $u): array {
    return ['id' => (int) $u['id'], 'name' => $u['name'], 'admin' => (bool) $u['is_admin'], 'mustChange' => (bool) $u['must_change']];
}

function new_token(int $userId): string {
    $token = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO recepten_tokens (token_hash, user_id, created_at, last_used) VALUES (?, ?, ?, ?)')
        ->execute([hash('sha256', $token), $userId, now_ms(), now_ms()]);
    return $token;
}

// Ingelogde gebruiker bij het meegestuurde token, of 401
function require_user(): array {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) fail(401, 'Niet ingelogd.');
    $st = db()->prepare('SELECT u.* FROM recepten_tokens t JOIN recepten_users u ON u.id = t.user_id WHERE t.token_hash = ?');
    $st->execute([hash('sha256', $token)]);
    $u = $st->fetch();
    if (!$u) fail(401, 'Niet ingelogd.');
    $now = now_ms();
    if ($now - (int) $u['last_seen'] > 60000) {   // hooguit eens per minuut bijwerken
        db()->prepare('UPDATE recepten_tokens SET last_used = ? WHERE token_hash = ?')->execute([$now, hash('sha256', $token)]);
        db()->prepare('UPDATE recepten_users SET last_seen = ? WHERE id = ?')->execute([$now, $u['id']]);
    }
    return $u;
}

function require_admin(): array {
    $u = require_user();
    if (!$u['is_admin']) fail(403, 'Alleen voor de beheerder.');
    return $u;
}

function find_user(int $id): array {
    $st = db()->prepare('SELECT * FROM recepten_users WHERE id = ?');
    $st->execute([$id]);
    $u = $st->fetch();
    if (!$u) fail(404, 'Deze gebruiker bestaat niet (meer).');
    return $u;
}

// Remt het raden van wachtwoorden: per naam en per internetadres een maximum per kwartier
function throttle(string $key): void {
    $since = now_ms() - 15 * 60 * 1000;
    db()->prepare('DELETE FROM recepten_fails WHERE at < ?')->execute([now_ms() - 24 * 3600 * 1000]);
    $st = db()->prepare('SELECT
        SUM(name_key = ?) AS by_name, SUM(ip = ?) AS by_ip FROM recepten_fails WHERE at > ?');
    $st->execute([$key, client_ip(), $since]);
    $c = $st->fetch();
    if ((int) $c['by_name'] >= 5 || (int) $c['by_ip'] >= 20) {
        fail(429, 'Te vaak een verkeerd wachtwoord. Probeer het over een kwartier opnieuw.');
    }
}
function login_failed(string $key): void {
    db()->prepare('INSERT INTO recepten_fails (name_key, ip, at) VALUES (?, ?, ?)')->execute([$key, client_ip(), now_ms()]);
    sleep(1);
    fail(403, 'Naam of wachtwoord klopt niet.');
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

// Leesbare tekst van een pagina, met regeleinden, voor pagina's zonder receptgegevens
function page_text(string $html): string {
    $h = preg_replace('#<(script|style|noscript|svg|head)[^>]*>.*?</\1>#is', ' ', $html);
    $h = preg_replace('#<(br|/p|/li|/h[1-6]|/div|/tr|/section|/article|/ul|/ol)[^>]*>#i', "\n", $h);
    $t = html_entity_decode(strip_tags($h), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $t = preg_replace("/[ \t\x{00A0}]+/u", ' ', $t);
    $t = preg_replace("/\s*\n\s*/", "\n", $t);
    return mb_substr(trim($t), 0, 30000);
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
        out(['ok' => true, 'accounts' => true]);

    /* ---------- Inloggen en account ---------- */

    case 'login': {
        $b = body();
        if (!isset($b['name'])) fail(400, 'Werk de app bij: sluit hem helemaal af en open hem opnieuw.');
        $name = clean_name((string) $b['name']);
        $key = name_key($name);
        $password = (string) ($b['password'] ?? '');
        throttle($key);
        $pdo = db();

        // Eerste keer na het bijwerken (nog geen gebruikers): wie inlogt met het oude
        // app-wachtwoord wordt beheerder en krijgt alle bestaande recepten.
        if (!(int) $pdo->query('SELECT COUNT(*) FROM recepten_users')->fetchColumn()) {
            if (APP_PASSWORD === '' || APP_PASSWORD === 'kies-hier-een-wachtwoord') fail(500, 'Stel eerst een wachtwoord in in config.php.');
            if (!hash_equals(APP_PASSWORD, $password)) login_failed($key);
            $pdo->prepare('INSERT INTO recepten_users (name, name_key, pw_hash, is_admin, must_change, share_key, created_at, last_seen)
                VALUES (?, ?, ?, 1, 0, ?, ?, ?)')
                ->execute([$name, $key, password_hash($password, PASSWORD_DEFAULT), bin2hex(random_bytes(16)), now_ms(), now_ms()]);
            $id = (int) $pdo->lastInsertId();
            $pdo->prepare('UPDATE recepten SET user_id = ? WHERE user_id = 0')->execute([$id]);
            $pdo->prepare('UPDATE recepten_inbox SET user_id = ? WHERE user_id = 0')->execute([$id]);
            $pdo->exec('DELETE FROM recepten_tokens WHERE user_id = 0');
            $u = find_user($id);
            out(['token' => new_token($id), 'user' => user_out($u), 'firstAdmin' => true]);
        }

        $st = $pdo->prepare('SELECT * FROM recepten_users WHERE name_key = ?');
        $st->execute([$key]);
        $u = $st->fetch();
        if (!$u || !password_verify($password, $u['pw_hash'])) login_failed($key);
        $pdo->prepare('DELETE FROM recepten_fails WHERE name_key = ?')->execute([$key]);
        if (password_needs_rehash($u['pw_hash'], PASSWORD_DEFAULT)) {
            $pdo->prepare('UPDATE recepten_users SET pw_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $u['id']]);
        }
        $pdo->prepare('UPDATE recepten_users SET last_seen = ? WHERE id = ?')->execute([now_ms(), $u['id']]);
        out(['token' => new_token((int) $u['id']), 'user' => user_out($u)]);
    }

    case 'logout': {
        $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
        db()->prepare('DELETE FROM recepten_tokens WHERE token_hash = ?')->execute([hash('sha256', $token)]);
        out(['ok' => true]);
    }

    case 'me': {
        $u = require_user();
        $st = db()->prepare("SELECT COUNT(*) FROM recepten WHERE user_id = ? AND deleted = 0 AND id NOT LIKE '\\_\\_%'");
        $st->execute([$u['id']]);
        out(user_out($u) + ['recipes' => (int) $st->fetchColumn(), 'shareKey' => $u['share_key']]);
    }

    case 'change_password': {
        $u = require_user();
        $b = body();
        $new = (string) ($b['new'] ?? '');
        if (!$u['must_change']) {
            throttle(name_key($u['name']));
            if (!password_verify((string) ($b['current'] ?? ''), $u['pw_hash'])) {
                db()->prepare('INSERT INTO recepten_fails (name_key, ip, at) VALUES (?, ?, ?)')->execute([name_key($u['name']), client_ip(), now_ms()]);
                sleep(1);
                fail(403, 'Je huidige wachtwoord klopt niet.');
            }
        }
        check_new_password($new);
        db()->prepare('UPDATE recepten_users SET pw_hash = ?, must_change = 0 WHERE id = ?')->execute([password_hash($new, PASSWORD_DEFAULT), $u['id']]);
        // Overal anders uitloggen, behalve hier
        db()->prepare('DELETE FROM recepten_tokens WHERE user_id = ? AND token_hash <> ?')
            ->execute([$u['id'], hash('sha256', $_SERVER['HTTP_X_TOKEN'] ?? '')]);
        out(['ok' => true]);
    }

    /* ---------- Gebruikers beheren (alleen beheerder) ---------- */

    case 'users': {
        require_admin();
        $rows = db()->query("SELECT u.id, u.name, u.is_admin, u.must_change, u.created_at, u.last_seen,
            (SELECT COUNT(*) FROM recepten r WHERE r.user_id = u.id AND r.deleted = 0 AND r.id NOT LIKE '\\_\\_%') AS recipes
            FROM recepten_users u ORDER BY u.is_admin DESC, u.name")->fetchAll();
        out(array_map(fn($r) => user_out($r) + ['recipes' => (int) $r['recipes'], 'created' => (int) $r['created_at'], 'lastSeen' => (int) $r['last_seen']], $rows));
    }

    case 'user_create': {
        require_admin();
        $name = clean_name((string) (body()['name'] ?? ''));
        $st = db()->prepare('SELECT 1 FROM recepten_users WHERE name_key = ?');
        $st->execute([name_key($name)]);
        if ($st->fetchColumn()) fail(409, "Er is al iemand met de naam $name.");
        $pw = temp_password();
        db()->prepare('INSERT INTO recepten_users (name, name_key, pw_hash, is_admin, must_change, share_key, created_at, last_seen)
            VALUES (?, ?, ?, 0, 1, ?, ?, 0)')
            ->execute([$name, name_key($name), password_hash($pw, PASSWORD_DEFAULT), bin2hex(random_bytes(16)), now_ms()]);
        out(['id' => (int) db()->lastInsertId(), 'name' => $name, 'password' => $pw]);
    }

    case 'user_reset': {
        $me = require_admin();
        $u = find_user((int) (body()['id'] ?? 0));
        if ((int) $u['id'] === (int) $me['id']) fail(400, 'Je eigen wachtwoord wijzig je bij Account.');
        $pw = temp_password();
        db()->prepare('UPDATE recepten_users SET pw_hash = ?, must_change = 1 WHERE id = ?')->execute([password_hash($pw, PASSWORD_DEFAULT), $u['id']]);
        db()->prepare('DELETE FROM recepten_tokens WHERE user_id = ?')->execute([$u['id']]);
        db()->prepare('DELETE FROM recepten_fails WHERE name_key = ?')->execute([$u['name_key']]);
        out(['name' => $u['name'], 'password' => $pw]);
    }

    case 'user_delete': {
        $me = require_admin();
        $u = find_user((int) (body()['id'] ?? 0));
        if ((int) $u['id'] === (int) $me['id']) fail(400, 'Je kunt jezelf niet verwijderen.');
        foreach (['recepten', 'recepten_tokens', 'recepten_inbox'] as $t) {
            db()->prepare("DELETE FROM $t WHERE user_id = ?")->execute([$u['id']]);
        }
        db()->prepare('DELETE FROM recepten_users WHERE id = ?')->execute([$u['id']]);
        out(['ok' => true]);
    }

    /* ---------- Recepten (elk ziet alleen de eigen recepten) ---------- */

    case 'list': {
        $u = require_user();
        $st = db()->prepare('SELECT id, deleted, updated_at FROM recepten WHERE user_id = ?');
        $st->execute([$u['id']]);
        out(array_map(fn($r) => ['id' => $r['id'], 'deleted' => (bool) $r['deleted'], 'updated_at' => (int) $r['updated_at']], $st->fetchAll()));
    }

    case 'get': {
        $u = require_user();
        $ids = array_values(array_filter((array) (body()['ids'] ?? []), 'is_string'));
        if (!$ids) out([]);
        $in = implode(',', array_fill(0, count($ids), '?'));
        $st = db()->prepare("SELECT id, data, updated_at FROM recepten WHERE user_id = ? AND deleted = 0 AND id IN ($in)");
        $st->execute([$u['id'], ...$ids]);
        out(array_map(fn($r) => ['id' => $r['id'], 'data' => json_decode((string) $r['data'], true), 'updated_at' => (int) $r['updated_at']], $st->fetchAll()));
    }

    case 'put': {
        $u = require_user();
        $rows = (array) (body()['rows'] ?? []);
        // Alleen overschrijven als de nieuwe versie minstens zo recent is.
        $st = db()->prepare('INSERT INTO recepten (user_id, id, data, deleted, updated_at) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              data       = IF(VALUES(updated_at) >= updated_at, VALUES(data), data),
              deleted    = IF(VALUES(updated_at) >= updated_at, VALUES(deleted), deleted),
              updated_at = GREATEST(updated_at, VALUES(updated_at))');
        foreach ($rows as $r) {
            if (!is_array($r) || !isset($r['id']) || !is_string($r['id']) || strlen($r['id']) > 64) continue;
            $deleted = !empty($r['deleted']);
            $st->execute([
                $u['id'],
                $r['id'],
                $deleted ? null : json_encode($r['data'] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                $deleted ? 1 : 0,
                (int) ($r['updated_at'] ?? now_ms()),
            ]);
        }
        out(['ok' => true]);
    }

    case 'fetch': {
        require_user();
        $url = trim((string) (body()['url'] ?? ''));
        if ($url === '' || strlen($url) > 2000) fail(400, 'Geef een adres op.');
        if (!str_contains($url, '://')) $url = 'https://' . $url;   // 'www.jumbo.com/...' mag ook
        $r = http_get($url, 4 * 1024 * 1024, 'text/html,application/xhtml+xml');
        $page = extract_page($r['body']);
        out(['status' => $r['status'], 'url' => $r['url']] + $page);
    }

    case 'image': {
        require_user();
        $url = trim((string) (body()['url'] ?? ''));
        $r = http_get($url, 8 * 1024 * 1024, 'image/avif,image/webp,image/jpeg,image/png,image/*');
        $type = strtolower(explode(';', $r['type'])[0]);
        if ($r['status'] !== 200 || !str_starts_with($type, 'image/')) fail(502, 'De foto kon niet worden opgehaald.');
        out(['data' => 'data:' . $type . ';base64,' . base64_encode($r['body'])]);
    }

    /* ---------- Postvak: recepten gedeeld vanaf de iPhone ---------- */

    // Vanuit een opdracht op de iPhone: zonder inlogtoken, maar met je persoonlijke deelsleutel
    // (staat in de app bij Instellingen → Delen). Het oude app-wachtwoord werkt ook nog en
    // hoort bij de beheerder, zodat een bestaande opdracht blijft werken.
    // Twee vormen: JSON {key, data} (Safari-opdracht, recept al uit de pagina gelezen), of een
    // formulier {key, url, html} waarin html de door de iPhone opgehaalde pagina is (Chrome-opdracht).
    case 'inbox_add': {
        $b = $_POST ?: body();
        $key = (string) ($b['key'] ?? '');
        $pdo = db();
        $userId = null;
        if ($key !== '' && hash_equals(APP_PASSWORD, $key)) {
            $userId = (int) ($pdo->query('SELECT id FROM recepten_users WHERE is_admin = 1 ORDER BY id LIMIT 1')->fetchColumn() ?: 0);
        } elseif (preg_match('/^[a-f0-9]{32}$/', $key)) {
            $st = $pdo->prepare('SELECT id FROM recepten_users WHERE share_key = ?');
            $st->execute([$key]);
            $id = $st->fetchColumn();
            if ($id) $userId = (int) $id;
        }
        if ($userId === null) { sleep(2); fail(403, 'Deelsleutel klopt niet. Kopieer hem opnieuw in Ricetta bij Instellingen → Delen.'); }
        $data = $b['data'] ?? null;
        if (is_string($data)) $data = json_decode($data, true);
        if (!is_array($data)) {
            $url = trim((string) ($b['url'] ?? ''));
            if (!preg_match('#^https?://#i', $url)) fail(400, 'Geen receptadres ontvangen.');
            $html = '';
            if (!empty($_FILES['html']['tmp_name']) && is_uploaded_file($_FILES['html']['tmp_name'])) {
                $html = (string) file_get_contents($_FILES['html']['tmp_name'], false, null, 0, 6 * 1024 * 1024);
            } elseif (isset($b['html'])) {
                $html = (string) $b['html'];
            }
            $data = ['url' => $url];
            if ($html !== '') {
                $page = extract_page($html);
                $data += ['title' => $page['title'], 'jsonld' => $page['jsonld'], 'og' => $page['og'],
                          'text' => page_text($html), 'blocked' => $page['blocked']];
            }
        }
        if (empty($data['url'])) fail(400, 'Geen receptgegevens ontvangen.');
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
        if (strlen($json) > 3 * 1024 * 1024) fail(413, 'Pagina is te groot.');
        $st = $pdo->prepare('SELECT COUNT(*) FROM recepten_inbox WHERE user_id = ?');
        $st->execute([$userId]);
        if ((int) $st->fetchColumn() >= 50) fail(429, 'Het postvak is vol. Open eerst Ricetta.');
        $pdo->prepare('INSERT INTO recepten_inbox (user_id, created_at, data) VALUES (?, ?, ?)')->execute([$userId, now_ms(), $json]);
        $msg = !empty($data['blocked']) ? 'Doorgestuurd, maar de website blokkeerde het ophalen. Open Ricetta om de tekst te plakken.' : 'Recept naar Ricetta gestuurd';
        out(['ok' => true, 'message' => $msg]);
    }

    case 'inbox_list': {
        $u = require_user();
        $st = db()->prepare('SELECT id, created_at, data FROM recepten_inbox WHERE user_id = ? ORDER BY id');
        $st->execute([$u['id']]);
        out(array_map(fn($r) => ['id' => (int) $r['id'], 'created_at' => (int) $r['created_at'], 'data' => json_decode($r['data'], true)], $st->fetchAll()));
    }

    case 'inbox_delete': {
        $u = require_user();
        db()->prepare('DELETE FROM recepten_inbox WHERE id = ? AND user_id = ?')->execute([(int) (body()['id'] ?? 0), $u['id']]);
        out(['ok' => true]);
    }

    default:
        fail(404, 'Onbekende actie.');
}
