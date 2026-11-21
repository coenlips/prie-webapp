<?php
// Online back-up voor de receptenapp.
// Zet dit bestand samen met config.php in een map op je website,
// bijvoorbeeld https://coenlips.nl/recepten-api/api.php
// De tabellen worden bij de eerste aanroep vanzelf aangemaakt.

declare(strict_types=1);

$config = __DIR__ . '/config.php';
if (!is_file($config)) fail(500, 'config.php ontbreekt op de server.');
require $config;

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

    default:
        fail(404, 'Onbekende actie.');
}
