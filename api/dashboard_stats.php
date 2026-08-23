<?php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

requireAuth(true);

$today = date('Y-m-d');

// 1. Total Sales Count & Revenue Today
$todaySalesStmt = $pdo->prepare("SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM sales WHERE DATE(sale_date) = :today");
$todaySalesStmt->execute(['today' => $today]);
$todayStats = $todaySalesStmt->fetch();

// 2. Yesterday's Sales & Revenue for comparison
$yesterday = date('Y-m-d', strtotime('-1 day'));
$yesterdaySalesStmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE DATE(sale_date) = :yesterday");
$yesterdaySalesStmt->execute(['yesterday' => $yesterday]);
$yesterdayRevenue = (float)$yesterdaySalesStmt->fetch()['total'];

// Revenue percentage change calculation
$revenueChangePercent = 0;
if ($yesterdayRevenue > 0) {
    $revenueChangePercent = round((($todayStats['total'] - $yesterdayRevenue) / $yesterdayRevenue) * 100, 1);
}

// 3. All time Sales and Revenue
$overallStatsStmt = $pdo->query("SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM sales");
$overallStats = $overallStatsStmt->fetch();

// 4. Low stock medicines (stock <= 10)
$lowStockStmt = $pdo->query("SELECT id, name, stock_quantity, price FROM medicines WHERE stock_quantity <= 10 ORDER BY stock_quantity ASC LIMIT 10");
$lowStockList = $lowStockStmt->fetchAll();

// 5. Expiring soon medicines (expiry_date within next 30 days)
$expiringStmt = $pdo->query("
    SELECT id, name, expiry_date, stock_quantity 
    FROM medicines 
    WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
    ORDER BY expiry_date ASC 
    LIMIT 10
");
$expiringList = $expiringStmt->fetchAll();

// 6. Total Products Count & Stock Health Metrics
$productsCountStmt = $pdo->query("
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN stock_quantity > 10 THEN 1 ELSE 0 END) as healthy_stock,
        SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= 10 THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock
    FROM medicines
");
$stockHealth = $productsCountStmt->fetch();

// 7. Recent 5 Sales Transactions
$recentSalesStmt = $pdo->query("
    SELECT id, customer_name, customer_phone, total_amount, sale_date 
    FROM sales 
    ORDER BY sale_date DESC 
    LIMIT 5
");
$recentSales = $recentSalesStmt->fetchAll();

// 8. Sales & Revenue Trend Data for Chart (Last 7 Days)
$chartStmt = $pdo->query("
    SELECT 
        DATE_FORMAT(sale_date, '%Y-%m-%d') as sale_day,
        DATE_FORMAT(sale_date, '%b %d') as formatted_day,
        COUNT(*) as sales_count,
        COALESCE(SUM(total_amount), 0) as total_revenue
    FROM sales
    WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE_FORMAT(sale_date, '%Y-%m-%d'), DATE_FORMAT(sale_date, '%b %d')
    ORDER BY sale_day ASC
");
$chartRawData = $chartStmt->fetchAll();

// Fill missing days in last 7 days to ensure continuous graph line
$chartData = [];
for ($i = 6; $i >= 0; $i--) {
    $dateKey = date('Y-m-d', strtotime("-$i days"));
    $label = date('M d', strtotime("-$i days"));
    
    $found = false;
    foreach ($chartRawData as $row) {
        if ($row['sale_day'] === $dateKey) {
            $chartData[] = [
                'day' => $row['formatted_day'],
                'sales_count' => (int)$row['sales_count'],
                'revenue' => (float)$row['total_revenue']
            ];
            $found = true;
            break;
        }
    }

    if (!$found) {
        $chartData[] = [
            'day' => $label,
            'sales_count' => 0,
            'revenue' => 0.0
        ];
    }
}

sendJsonResponse(true, 'Dashboard stats retrieved', [
    'sales_today_count' => (int)$todayStats['count'],
    'revenue_today' => (float)$todayStats['total'],
    'revenue_change_percent' => $revenueChangePercent,
    'overall_sales_count' => (int)$overallStats['count'],
    'overall_revenue' => (float)$overallStats['total'],
    'total_products' => (int)$stockHealth['total'],
    'healthy_stock_count' => (int)$stockHealth['healthy_stock'],
    'low_stock_count' => (int)$stockHealth['low_stock'],
    'out_of_stock_count' => (int)$stockHealth['out_of_stock'],
    'expiring_count' => count($expiringList),
    'low_stock_items' => $lowStockList,
    'expiring_items' => $expiringList,
    'recent_sales' => $recentSales,
    'chart_report' => $chartData
]);
