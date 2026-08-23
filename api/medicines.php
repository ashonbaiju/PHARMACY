<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

switch ($action) {
    case 'list':
    case 'search':
        $query = trim($_GET['q'] ?? '');
        if ($query !== '') {
            $stmt = $pdo->prepare("
                SELECT id, name, description, price, stock_quantity, expiry_date, image_path 
                FROM medicines 
                WHERE name LIKE :search OR description LIKE :search 
                ORDER BY name ASC
            ");
            $stmt->execute(['search' => "%$query%"]);
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
        requireAuth(true);

        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $price = floatval($_POST['price'] ?? 0);
        $stock = intval($_POST['stock_quantity'] ?? 0);
        $expiry = trim($_POST['expiry_date'] ?? '');

        if (empty($name) || $price <= 0 || $stock < 0 || empty($expiry)) {
            sendJsonResponse(false, 'Please provide valid medicine details (Name, positive price, stock, expiry date).', [], 400);
        }

        $imagePath = 'assets/images/default-medicine.png';

        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $fileTmpPath = $_FILES['image']['tmp_name'];
            $fileName = $_FILES['image']['name'];
            $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

            $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            if (in_array($fileExtension, $allowedExtensions)) {
                $uploadDir = __DIR__ . '/../uploads/medicines/';
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                $newFileName = time() . '_' . md5(uniqid()) . '.' . $fileExtension;
                $destPath = $uploadDir . $newFileName;

                if (move_uploaded_file($fileTmpPath, $destPath)) {
                    $imagePath = 'uploads/medicines/' . $newFileName;
                }
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO medicines (name, description, price, stock_quantity, expiry_date, image_path)
            VALUES (:name, :description, :price, :stock, :expiry, :image)
        ");
        $stmt->execute([
            'name' => $name,
            'description' => $description,
            'price' => $price,
            'stock' => $stock,
            'expiry' => $expiry,
            'image' => $imagePath
        ]);

        $newId = $pdo->lastInsertId();
        sendJsonResponse(true, 'Medicine added successfully!', ['id' => $newId]);
        break;

    case 'bulk_upload':
        requireAuth(true);

        if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
            sendJsonResponse(false, 'Please upload a valid CSV file.', [], 400);
        }

        $fileTmpPath = $_FILES['csv_file']['tmp_name'];
        $handle = fopen($fileTmpPath, 'r');
        if (!$handle) {
            sendJsonResponse(false, 'Unable to open CSV file.', [], 500);
        }

        $processedCount = 0;
        $updatedCount = 0;
        $insertedCount = 0;
        $isFirstRow = true;

        // Prepared statements for upsert
        $checkStmt = $pdo->prepare("SELECT id, stock_quantity FROM medicines WHERE LOWER(name) = LOWER(:name) LIMIT 1");
        $insertStmt = $pdo->prepare("
            INSERT INTO medicines (name, description, price, stock_quantity, expiry_date, image_path)
            VALUES (:name, :description, :price, :stock, :expiry, 'assets/images/default-medicine.png')
        ");
        $updateStmt = $pdo->prepare("
            UPDATE medicines 
            SET description = :description, price = :price, stock_quantity = stock_quantity + :stock, expiry_date = :expiry 
            WHERE id = :id
        ");

        while (($data = fgetcsv($handle, 1000, ',')) !== false) {
            // Skip empty rows
            if (empty($data) || count($data) < 4) {
                continue;
            }

            // Detect header row
            if ($isFirstRow) {
                $isFirstRow = false;
                if (strtolower(trim($data[0])) === 'name') {
                    continue;
                }
            }

            $name = trim($data[0]);
            $description = trim($data[1] ?? '');
            $price = floatval($data[2] ?? 0);
            $stock = intval($data[3] ?? 0);
            $expiry = trim($data[4] ?? date('Y-m-d', strtotime('+1 year')));

            if (empty($name) || $price <= 0) {
                continue;
            }

            // Check if medicine exists
            $checkStmt->execute(['name' => $name]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                $updateStmt->execute([
                    'description' => $description,
                    'price' => $price,
                    'stock' => $stock,
                    'expiry' => $expiry,
                    'id' => $existing['id']
                ]);
                $updatedCount++;
            } else {
                $insertStmt->execute([
                    'name' => $name,
                    'description' => $description,
                    'price' => $price,
                    'stock' => $stock,
                    'expiry' => $expiry
                ]);
                $insertedCount++;
            }
            $processedCount++;
        }

        fclose($handle);
        sendJsonResponse(true, "CSV Import complete! Processed $processedCount records ($insertedCount added, $updatedCount updated).");
        break;

    default:
        sendJsonResponse(false, 'Invalid action.', [], 400);
}
