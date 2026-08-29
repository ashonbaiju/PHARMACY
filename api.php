<?php
// Unified Pharmacy API (All backend functions in one clean file)
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {

    // ==========================================
    // 1. AUTHENTICATION (Login, Check, Logout)
    // ==========================================

    case 'check':
    case 'check_auth':
        if (isLoggedIn()) {
            sendJsonResponse(true, 'User is logged in', [
                'username' => $_SESSION['username'] ?? 'admin'
            ]);
        } else {
            sendJsonResponse(false, 'Not logged in');
        }
        break;

    case 'login':
        $input = json_decode(file_get_contents('php://input'), true);
        $username = trim($input['username'] ?? $_POST['username'] ?? '');
        $password = trim($input['password'] ?? $_POST['password'] ?? '');

        if (empty($username) || empty($password)) {
            sendJsonResponse(false, 'Please enter username and password.');
        }

        // Query user from database
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = :username");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        // Verify password against database record
        if ($user && (password_verify($password, $user['password_hash']) || $password === $user['password_hash'])) {
            $_SESSION['is_admin'] = true;
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            sendJsonResponse(true, 'Login successful!');
        } else {
            sendJsonResponse(false, 'Invalid username or password.');
        }
        break;

    case 'logout':
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        sendJsonResponse(true, 'Logged out successfully');
        break;


    // ==========================================
    // 2. MEDICINE INVENTORY (List, Add, Edit, Delete)
    // ==========================================

    case 'list':
    case 'medicines':
    case 'search':
        $query = trim($_GET['q'] ?? $_GET['search'] ?? '');
        if ($query !== '') {
            $stmt = $pdo->prepare("
                SELECT id, name, description, price, stock_quantity, expiry_date, image_path 
                FROM medicines 
                WHERE name LIKE :search1 OR description LIKE :search2 
                ORDER BY name ASC
            ");
            $stmt->execute([
                'search1' => "%$query%",
                'search2' => "%$query%"
            ]);
        } else {
            $stmt = $pdo->prepare("
                SELECT id, name, description, price, stock_quantity, expiry_date, image_path 
                FROM medicines 
                ORDER BY name ASC
            ");
            $stmt->execute();
        }
        $medicines = $stmt->fetchAll();
        sendJsonResponse(true, 'Medicines retrieved', $medicines);
        break;

    case 'add':
    case 'add_medicine':
        requireAuth();

        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $price = floatval($_POST['price'] ?? 0);
        $stock = intval($_POST['stock_quantity'] ?? 0);
        $expiry = trim($_POST['expiry_date'] ?? '');

        if (empty($name) || $price <= 0 || $stock < 0) {
            sendJsonResponse(false, 'Please enter valid medicine name, price, and stock quantity.');
        }

        $imagePath = 'default-medicine.svg';

        // Optional image upload
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'svg'])) {
                $newFilename = 'med_' . time() . '_' . rand(100, 999) . '.' . $ext;
                if (move_uploaded_file($_FILES['image']['tmp_name'], __DIR__ . '/' . $newFilename)) {
                    $imagePath = $newFilename;
                }
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO medicines (name, description, price, stock_quantity, expiry_date, image_path)
            VALUES (:name, :desc, :price, :stock, :expiry, :image)
        ");
        $stmt->execute([
            'name' => $name,
            'desc' => $description,
            'price' => $price,
            'stock' => $stock,
            'expiry' => !empty($expiry) ? $expiry : date('Y-m-d', strtotime('+1 year')),
            'image' => $imagePath
        ]);

        sendJsonResponse(true, 'Medicine added successfully!');
        break;

    case 'edit':
    case 'edit_medicine':
    case 'update':
        requireAuth();

        $id = intval($_POST['id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $price = floatval($_POST['price'] ?? 0);
        $stock = intval($_POST['stock_quantity'] ?? 0);
        $expiry = trim($_POST['expiry_date'] ?? '');

        if ($id <= 0 || empty($name) || $price <= 0 || $stock < 0) {
            sendJsonResponse(false, 'Please provide valid medicine ID, name, price, and stock.');
        }

        // Optional new image
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
            if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'svg'])) {
                $newFilename = 'med_' . time() . '_' . rand(100, 999) . '.' . $ext;
                if (move_uploaded_file($_FILES['image']['tmp_name'], __DIR__ . '/' . $newFilename)) {
                    $imagePath = $newFilename;
                    $stmt = $pdo->prepare("
                        UPDATE medicines 
                        SET name = :name, description = :desc, price = :price, stock_quantity = :stock, expiry_date = :expiry, image_path = :image 
                        WHERE id = :id
                    ");
                    $stmt->execute([
                        'name' => $name,
                        'desc' => $description,
                        'price' => $price,
                        'stock' => $stock,
                        'expiry' => !empty($expiry) ? $expiry : date('Y-m-d', strtotime('+1 year')),
                        'image' => $imagePath,
                        'id' => $id
                    ]);
                    sendJsonResponse(true, 'Medicine updated successfully!');
                }
            }
        }

        // Update without changing image
        $stmt = $pdo->prepare("
            UPDATE medicines 
            SET name = :name, description = :desc, price = :price, stock_quantity = :stock, expiry_date = :expiry 
            WHERE id = :id
        ");
        $stmt->execute([
            'name' => $name,
            'desc' => $description,
            'price' => $price,
            'stock' => $stock,
            'expiry' => !empty($expiry) ? $expiry : date('Y-m-d', strtotime('+1 year')),
            'id' => $id
        ]);

        sendJsonResponse(true, 'Medicine updated successfully!');
        break;

    case 'delete':
    case 'delete_medicine':
        requireAuth();
        $id = intval($_POST['id'] ?? $_GET['id'] ?? 0);

        if ($id > 0) {
            $stmt = $pdo->prepare("DELETE FROM medicines WHERE id = :id");
            $stmt->execute(['id' => $id]);
            sendJsonResponse(true, 'Medicine deleted successfully.');
        } else {
            sendJsonResponse(false, 'Invalid medicine ID.');
        }
        break;


    // ==========================================
    // 3. DASHBOARD STATISTICS
    // ==========================================

    case 'dashboard_stats':
    case 'stats':
        requireAuth();

        $today = date('Y-m-d');

        // Total medicines & stock counts
        $medStmt = $pdo->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN stock_quantity > 10 THEN 1 ELSE 0 END) as healthy,
                SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= 10 THEN 1 ELSE 0 END) as low,
                SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock
            FROM medicines
        ");
        $medStats = $medStmt->fetch();

        // Low stock items list (stock <= 10)
        $lowItemsStmt = $pdo->query("
            SELECT id, name, stock_quantity, price 
            FROM medicines 
            WHERE stock_quantity <= 10 
            ORDER BY stock_quantity ASC 
            LIMIT 10
        ");
        $lowStockItems = $lowItemsStmt->fetchAll();

        // Sales today
        $today = date('Y-m-d');
        $todayStmt = $pdo->prepare("
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total 
            FROM sales 
            WHERE DATE(sale_date) = CURDATE() OR DATE(sale_date) = :today
        ");
        $todayStmt->execute(['today' => $today]);
        $todayStats = $todayStmt->fetch();

        // All-time sales
        $allStmt = $pdo->query("SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM sales");
        $overallStats = $allStmt->fetch();

        // Recent 5 sales
        $recentStmt = $pdo->query("SELECT id, customer_name, customer_phone, total_amount, sale_date FROM sales ORDER BY sale_date DESC LIMIT 5");
        $recentSales = $recentStmt->fetchAll();

        sendJsonResponse(true, 'Stats retrieved', [
            'total_products' => (int)($medStats['total'] ?? 0),
            'healthy_stock_count' => (int)($medStats['healthy'] ?? 0),
            'low_stock_count' => (int)($medStats['low'] ?? 0),
            'out_of_stock_count' => (int)($medStats['out_of_stock'] ?? 0),
            'low_stock_items' => $lowStockItems,
            'sales_today_count' => (int)($todayStats['count'] ?? 0),
            'revenue_today' => (float)($todayStats['total'] ?? 0),
            'overall_sales_count' => (int)($overallStats['count'] ?? 0),
            'overall_revenue' => (float)($overallStats['total'] ?? 0),
            'recent_sales' => $recentSales
        ]);
        break;


    // ==========================================
    // 4. SALES & BILLING (History & Details)
    // ==========================================

    case 'sales':
        requireAuth();
        $saleId = intval($_GET['id'] ?? 0);

        if ($saleId > 0) {
            $saleStmt = $pdo->prepare("SELECT * FROM sales WHERE id = :id");
            $saleStmt->execute(['id' => $saleId]);
            $sale = $saleStmt->fetch();

            if (!$sale) {
                sendJsonResponse(false, 'Sale record not found.');
            }

            $itemsStmt = $pdo->prepare("
                SELECT si.*, m.name as medicine_name 
                FROM sale_items si 
                LEFT JOIN medicines m ON si.medicine_id = m.id 
                WHERE si.sale_id = :sale_id
            ");
            $itemsStmt->execute(['sale_id' => $saleId]);
            $sale['items'] = $itemsStmt->fetchAll();

            sendJsonResponse(true, 'Sale details retrieved', $sale);
        } else {
            $stmt = $pdo->query("SELECT id, customer_name, customer_phone, total_amount, sale_date FROM sales ORDER BY sale_date DESC");
            $sales = $stmt->fetchAll();
            sendJsonResponse(true, 'Sales history retrieved', $sales);
        }
        break;


    // ==========================================
    // 5. POS CHECKOUT (Record Sale & Deduct Stock)
    // ==========================================

    case 'checkout':
        requireAuth();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $customerName = trim($input['customer_name'] ?? '');
        $customerPhone = trim($input['customer_phone'] ?? '');
        $items = $input['items'] ?? [];

        if (empty($customerName) || empty($customerPhone)) {
            sendJsonResponse(false, 'Customer name and phone number are required.');
        }

        if (!is_array($items) || count($items) === 0) {
            sendJsonResponse(false, 'Cart is empty.');
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
                    sendJsonResponse(false, 'Invalid item quantity.');
                }

                $stockCheckStmt->execute(['id' => $medId]);
                $med = $stockCheckStmt->fetch();

                if (!$med || $med['stock_quantity'] < $qty) {
                    $pdo->rollBack();
                    sendJsonResponse(false, "Insufficient stock for '{$med['name']}'. Available: {$med['stock_quantity']}");
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

            // Insert sale record
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

            // Insert items & deduct stock
            $itemInsertStmt = $pdo->prepare("INSERT INTO sale_items (sale_id, medicine_id, quantity, price_at_time) VALUES (:sid, :mid, :qty, :price)");
            $stockDeductStmt = $pdo->prepare("UPDATE medicines SET stock_quantity = stock_quantity - :qty WHERE id = :id");

            foreach ($verifiedItems as $vItem) {
                $itemInsertStmt->execute([
                    'sid' => $saleId,
                    'mid' => $vItem['medicine_id'],
                    'qty' => $vItem['quantity'],
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
            sendJsonResponse(false, 'Checkout failed: ' . $e->getMessage());
        }
        break;

    default:
        sendJsonResponse(false, 'Invalid API action.');
}
