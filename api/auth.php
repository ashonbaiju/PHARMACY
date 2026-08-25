<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'check') {
    // Check if user is logged in
    if (isLoggedIn()) {
        sendJsonResponse(true, 'Authorized', [
            'username' => $_SESSION['username'] ?? 'Staff'
        ]);
    } else {
        sendJsonResponse(false, 'Unauthorized');
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    // Process login request
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? $_POST['username'] ?? '');
    $password = trim($input['password'] ?? $_POST['password'] ?? '');

    if (empty($username) || empty($password)) {
        sendJsonResponse(false, 'Please enter username and password.');
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        sendJsonResponse(true, 'Login successful.');
    } else {
        sendJsonResponse(false, 'Invalid username or password.');
    }
} elseif ($action === 'logout') {
    // Log out user
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    sendJsonResponse(true, 'Logged out successfully.');
} else {
    sendJsonResponse(false, 'Invalid API request.', [], 400);
}
