<?php
require_once __DIR__ . '/db.php';

function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function requireAuth($isApi = false) {
    if (!isLoggedIn()) {
        if ($isApi) {
            sendJsonResponse(false, 'Unauthorized access. Please login.', [], 401);
        } else {
            header('Location: login.php');
            exit;
        }
    }
}
