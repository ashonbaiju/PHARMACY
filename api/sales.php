<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

requireAuth(true);

$saleId = intval($_GET['id'] ?? 0);

if ($saleId > 0) {
    // Fetch detailed sale with line items
    $saleStmt = $pdo->prepare("SELECT * FROM sales WHERE id = :id");
    $saleStmt->execute(['id' => $saleId]);
    $sale = $saleStmt->fetch();

    if (!$sale) {
        sendJsonResponse(false, 'Sale record not found.', [], 404);
    }

    $itemsStmt = $pdo->prepare("
        SELECT si.*, m.name as medicine_name 
        FROM sale_items si 
        LEFT JOIN medicines m ON si.medicine_id = m.id 
        WHERE si.sale_id = :sale_id
    ");
    $itemsStmt->execute(['sale_id' => $saleId]);
    $items = $itemsStmt->fetchAll();

    $sale['items'] = $items;
    sendJsonResponse(true, 'Sale details retrieved', $sale);
} else {
    // Fetch all sales ordered by date DESC
    $stmt = $pdo->prepare("
        SELECT id, customer_name, customer_phone, total_amount, sale_date 
        FROM sales 
        ORDER BY sale_date DESC
    ");
    $stmt->execute();
    $sales = $stmt->fetchAll();

    sendJsonResponse(true, 'Sales history retrieved', $sales);
}
