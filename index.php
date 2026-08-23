<?php
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/auth.php';

$search = trim($_GET['search'] ?? '');

if ($search !== '') {
    // Search the database for matching names or descriptions
    $stmt = $pdo->prepare("SELECT id, name, description, price, stock_quantity, expiry_date, image_path FROM medicines WHERE name LIKE :search1 OR description LIKE :search2 ORDER BY name ASC");
    $stmt->execute([
        'search1' => '%' . $search . '%',
        'search2' => '%' . $search . '%',
    ]);
} else {
    // Fetch all medicines for public catalog
    $stmt = $pdo->prepare("SELECT id, name, description, price, stock_quantity, expiry_date, image_path FROM medicines ORDER BY name ASC");
    $stmt->execute();
}

$medicines = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PharmaCare - Modern Pharmacy Management</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>

    <!-- Header Navigation -->
    <header class="app-header">
        <div class="container navbar">
            <div class="brand">
                <div class="brand-icon">P</div>
                <div class="brand-text">
                    <h1>PharmaCare</h1>
                    <p>Pharmacy Storefront</p>
                </div>
            </div>
            <div class="nav-actions">
                <?php if (isLoggedIn()): ?>
                    <a href="dashboard.php" class="btn btn-secondary btn-sm" style="border-radius:20px; font-weight:600;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        Dashboard
                    </a>
                <?php else: ?>
                    <a href="login.php" class="btn btn-secondary btn-sm" style="border-radius:20px; font-weight:600;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Login
                    </a>
                <?php endif; ?>
            </div>
        </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
        <div class="container">
            <span style="display:inline-block; padding:0.3rem 0.85rem; font-size:0.75rem; font-weight:700; color:var(--primary); background:var(--primary-light); border:1px solid var(--primary-border); border-radius:30px; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.04em;">
                Live Storefront Inventory
            </span>
            <h2>Authentic Healthcare &amp; Medicines</h2>
            <p>Explore our real-time pharmaceutical catalog and check product availability.</p>
            <form action="index.php" method="GET" style="display: flex; max-width: 560px; margin: 0 auto; box-shadow: var(--shadow-md); border-radius: 30px; overflow: hidden; border: 1.5px solid var(--border); background: var(--surface);">
                <input type="text" name="search" id="publicSearchInput" value="<?= htmlspecialchars($search) ?>" placeholder="Search medicines by name or keyword..." style="flex-grow: 1; border: none; padding: 0.85rem 1.4rem; font-size: 0.95rem; outline: none; background: transparent; font-family: inherit;">
                <button type="submit" class="btn btn-primary" style="border-radius: 0; padding: 0 1.8rem; font-size: 0.92rem; height: auto; border: none; margin: 0;">Search</button>
            </form>
        </div>
    </section>

    <!-- Main Content Catalog -->
    <main class="container" style="flex-grow: 1;">
        <div class="medicine-grid" id="publicMedicineGrid">
            <?php if (empty($medicines)): ?>
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                    <h3 style="margin-bottom:0.5rem; color: var(--text-main);">No medicines found</h3>
                    <?php if ($search !== ''): ?>
                        <p style="margin-bottom: 1.5rem;">We couldn't find any medicines matching "<strong><?= htmlspecialchars($search) ?></strong>".</p>
                        <a href="index.php" class="btn btn-secondary btn-sm">Clear Search &amp; View All</a>
                    <?php else: ?>
                        <p>Authorized staff can log in to populate products or import supplier CSV files.</p>
                    <?php endif; ?>
                </div>
            <?php else: ?>
                <?php foreach ($medicines as $med): ?>
                    <?php 
                        $stockClass = 'badge-success';
                        $stockText = 'In Stock';
                        if ($med['stock_quantity'] <= 0) {
                            $stockClass = 'badge-danger';
                            $stockText = 'Out of Stock';
                        } elseif ($med['stock_quantity'] <= 10) {
                            $stockClass = 'badge-warning';
                            $stockText = 'Low (' . $med['stock_quantity'] . ')';
                        }
                    ?>
                    <div class="medicine-card">
                        <div class="card-img-wrapper">
                            <img src="<?= htmlspecialchars($med['image_path']) ?>" alt="<?= htmlspecialchars($med['name']) ?>" onerror="this.src='assets/images/default-medicine.svg'">
                        </div>
                        <div class="card-body">
                            <h3 class="card-title"><?= htmlspecialchars($med['name']) ?></h3>
                            <p class="card-desc"><?= htmlspecialchars($med['description'] ?: 'No detailed description available.') ?></p>
                            <div class="card-footer">
                                <span class="price-tag">₹<?= number_format($med['price'], 2) ?></span>
                                <span class="stock-badge <?= $stockClass ?>"><?= $stockText ?></span>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>

    <!-- Footer -->
    <footer class="app-footer">
        <div class="container">
            <p>&copy; <?= date('Y') ?> PharmaCare System. Native PHP PDO Architecture.</p>
        </div>
    </footer>

    <script src="assets/js/main.js"></script>
</body>
</html>
