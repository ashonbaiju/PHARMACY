<?php
// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$db_host = '127.0.0.1';
$db_name = 'pharma_db';
$db_user = 'root';
$db_pass = '';

try {
    // First try connecting directly to the database
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    // If DB doesn't exist, attempt to auto-create and run schema script
    try {
        $pdo_init = new PDO("mysql:host=$db_host;charset=utf8mb4", $db_user, $db_pass);
        $pdo_init->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        
        $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        // Auto execute schema setup if schema file exists
        $schemaFile = __DIR__ . '/../schema.sql';
        if (file_exists($schemaFile)) {
            $sql = file_get_contents($schemaFile);
            $pdo->exec($sql);
        }
    } catch (PDOException $ex) {
        die("Database connection failed: " . $ex->getMessage());
    }
}

// Ensure default admin user always exists with valid hash for 'admin123'
try {
    $adminHash = '$2y$10$UYTfOj33LjglZ82eDIO2ouFvqvaAeQXmwoknSwU1VCxJryNZY7vSC';
    $chkStmt = $pdo->prepare("SELECT id FROM users WHERE username = 'admin'");
    $chkStmt->execute();
    if (!$chkStmt->fetch()) {
        $insStmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES ('admin', ?)");
        $insStmt->execute([$adminHash]);
    }
} catch (Exception $e) {
    // Table may not exist yet if schema was not run
}

// Standard JSON response helper for API scripts
if (!function_exists('sendJsonResponse')) {
    function sendJsonResponse($success, $message = '', $data = [], $statusCode = 200) {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data' => $data
        ]);
        exit;
    }
}
