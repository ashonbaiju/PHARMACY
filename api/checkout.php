<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

requireAuth(true);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, 'Method not allowed.', [], 405);
}

// Get JSON or Form POST input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

$customerName = trim($input['customer_name'] ?? '');
$customerPhone = trim($input['customer_phone'] ?? '');
$items = $input['items'] ?? [];

if (empty($customerName) || empty($customerPhone)) {
    sendJsonResponse(false, 'Customer name and phone number are required.', [], 400);
}

if (!is_array($items) || count($items) === 0) {
    sendJsonResponse(false, 'Cart is empty. Please add medicines before checkout.', [], 400);
}

try {
    $pdo->beginTransaction();

    $calculatedTotal = 0;
    $verifiedItems = [];

    $stockCheckStmt = $pdo->prepare("SELECT id, name, price, stock_quantity FROM medicines WHERE id = :id FOR UPDATE");

    foreach ($items as $item) {
        $medId = intval($item['medicine_id'] ?? 0);
        $qty = intval($item['quantity'] ?? 0);

        if ($medId <= 0 || $qty <= 0) {
            $pdo->rollBack();
            sendJsonResponse(false, 'Invalid item quantity or product ID in cart.', [], 400);
        }

        $stockCheckStmt->execute(['id' => $medId]);
        $med = $stockCheckStmt->fetch();

        if (!$med) {
            $pdo->rollBack();
            sendJsonResponse(false, "Medicine ID #$medId no longer exists.", [], 400);
        }

        if ($med['stock_quantity'] < $qty) {
            $pdo->rollBack();
            sendJsonResponse(false, "Insufficient stock for '{$med['name']}'. Available: {$med['stock_quantity']}, Requested: $qty.", [], 400);
        }

        $itemTotal = floatval($med['price']) * $qty;
        $calculatedTotal += $itemTotal;

        $verifiedItems[] = [
            'medicine_id' => $medId,
            'name' => $med['name'],
            'quantity' => $qty,
            'price_at_time' => floatval($med['price']),
            'total' => $itemTotal
        ];
    }

    // Insert main sale record
    $saleStmt = $pdo->prepare("
        INSERT INTO sales (customer_name, customer_phone, total_amount, sale_date)
        VALUES (:name, :phone, :total, NOW())
    ");
    $saleStmt->execute([
        'name' => $customerName,
        'phone' => $customerPhone,
        'total' => $calculatedTotal
    ]);

    $saleId = $pdo->lastInsertId();

    // Insert sale line items & update stock
    $itemInsertStmt = $pdo->prepare("
        INSERT INTO sale_items (sale_id, medicine_id, quantity, price_at_time)
        VALUES (:sale_id, :medicine_id, :quantity, :price)
    ");

    $stockDeductStmt = $pdo->prepare("
        UPDATE medicines 
        SET stock_quantity = stock_quantity - :qty 
        WHERE id = :id
    ");

    foreach ($verifiedItems as $vItem) {
        $itemInsertStmt->execute([
            'sale_id' => $saleId,
            'medicine_id' => $vItem['medicine_id'],
            'quantity' => $vItem['quantity'],
            'price' => $vItem['price_at_time']
        ]);

        $stockDeductStmt->execute([
            'qty' => $vItem['quantity'],
            'id' => $vItem['medicine_id']
        ]);
    }

    $pdo->commit();

    sendJsonResponse(true, 'Transaction completed successfully!', [
        'sale_id' => $saleId,
        'customer_name' => $customerName,
        'customer_phone' => $customerPhone,
        'total_amount' => $calculatedTotal,
        'sale_date' => date('Y-m-d H:i:s'),
        'items' => $verifiedItems
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse(false, 'Checkout failed: ' . $e->getMessage(), [], 500);
}
