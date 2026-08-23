<?php
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/auth.php';

// Guard dashboard access
requireAuth();

$username = htmlspecialchars($_SESSION['username'] ?? 'Staff');
$formattedDate = date('d M Y');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Management Panel - PharmaCare</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <!-- Chart.js CDN for Analytics Graphs -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- jsPDF CDN for POS Receipt PDF Generation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>

    <!-- Header Navbar -->
    <header class="app-header">
        <div class="container navbar">
            <a href="dashboard.php" class="brand">
                <div class="brand-icon">P</div>
                <div class="brand-text">
                    <h1>PharmaCare</h1>
                    <p>Pharmacy Management Panel</p>
                </div>
            </a>
            <div class="nav-actions">
                <a href="index.php" class="btn btn-secondary btn-sm" target="_blank">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Storefront
                </a>
                <a href="logout.php" class="btn btn-danger btn-sm">Logout</a>
            </div>
        </div>
    </header>

    <!-- Main Dashboard Container -->
    <main class="container dashboard-container">
        
        <!-- Minimalist Greeting Banner & Quick Actions -->
        <div class="greeting-banner">
            <div class="greeting-text">
                <h2>Pharmacy Overview</h2>
                <p>Welcome back, <?= $username ?>. Real-time sales analytics &amp; inventory health.</p>
            </div>
            <div class="greeting-actions">
                <span class="date-pill">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <?= $formattedDate ?>
                </span>
                <button class="btn btn-primary btn-sm" onclick="switchTab('pos-tab')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    New POS Order
                </button>
            </div>
        </div>

        <!-- SPA Tab Switcher Bar -->
        <nav class="tab-nav">
            <button class="tab-btn active" data-tab="overview-tab">Dashboard Overview</button>
            <button class="tab-btn" data-tab="medicines-tab">Medicine Management</button>
            <button class="tab-btn" data-tab="pos-tab">Billing &amp; POS</button>
            <button class="tab-btn" data-tab="sales-tab">Sales History</button>
        </nav>

        <!-- ===================================================================
             TAB 0: OVERVIEW & ALERTS
             =================================================================== -->
        <div id="overview-tab" class="tab-pane active">
            
            <!-- Unified Executive Horizontal Metric Strip (Non-Boxed Layout) -->
            <div class="metrics-strip">
                <div class="metric-strip-item">
                    <div class="strip-item-header">
                        <span class="strip-item-title">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            Revenue Today
                        </span>
                        <span id="statRevenueTrend" class="strip-badge trend-up">+14.2%</span>
                    </div>
                    <div class="strip-item-value" id="statRevenueToday">₹0.00</div>
                </div>

                <div class="metric-strip-item">
                    <div class="strip-item-header">
                        <span class="strip-item-title">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            Sales Today
                        </span>
                        <span class="strip-badge trend-neutral">Orders</span>
                    </div>
                    <div class="strip-item-value" id="statSalesToday">0</div>
                </div>

                <div class="metric-strip-item">
                    <div class="strip-item-header">
                        <span class="strip-item-title">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            Catalog Products
                        </span>
                        <span class="strip-badge trend-neutral">Medicines</span>
                    </div>
                    <div class="strip-item-value" id="statTotalProducts">0</div>
                </div>

                <div class="metric-strip-item">
                    <div class="strip-item-header">
                        <span class="strip-item-title">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Stock Alerts
                        </span>
                        <span id="statStockTrend" class="strip-badge trend-alert">Restock</span>
                    </div>
                    <div class="strip-item-value" id="statLowStockCount">0</div>
                </div>
            </div>

            <!-- MAIN ANALYTICAL SECTION: Simple Revenue Line Graph (100% Full-Width) -->
            <div class="overview-analytics-grid" style="grid-template-columns: 1fr;">
                
                <!-- Simple 7-Day Revenue Line Graph Panel -->
                <div class="panel" style="margin-bottom:0;">
                    <div class="panel-header">
                        <div>
                            <h3>Sales &amp; Revenue Analytics Report</h3>
                            <p style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.15rem;">Daily revenue performance overview (Last 7 Days)</p>
                        </div>
                        <span class="user-badge" style="background:var(--primary-light); color:var(--primary); border-color:var(--primary-border);">
                            Currency: ₹ (INR)
                        </span>
                    </div>
                    <div style="position: relative; height: 300px; width: 100%;">
                        <canvas id="salesAnalyticsChart"></canvas>
                    </div>
                </div>

            </div>

            <!-- SUB SECTION: Recent Transactions (50%) + Low Stock Alerts (50%) -->
            <div class="dashboard-grid" style="margin-top: 1.75rem;">
                
                <!-- Recent Sales Transactions Panel -->
                <div class="panel" style="margin-bottom:0;">
                    <div class="panel-header">
                        <h3>Recent Sales Transactions</h3>
                        <button class="btn btn-sm btn-secondary" onclick="switchTab('sales-tab')">View All</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="recentSalesTableBody">
                                <tr><td colspan="4" class="text-center">Loading sales...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Low Stock Alerts Panel -->
                <div class="panel" style="margin-bottom:0;">
                    <div class="panel-header">
                        <h3>Low Stock Alerts</h3>
                        <button class="btn btn-sm btn-secondary" onclick="switchTab('medicines-tab')">Restock</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Medicine</th>
                                    <th>Stock</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody id="lowStockTableBody">
                                <tr><td colspan="3" class="text-center">Loading stock status...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>

        <!-- ===================================================================
             TAB 1: MEDICINE MANAGEMENT (Current Medicine Catalog)
             =================================================================== -->
        <div id="medicines-tab" class="tab-pane">
            <div class="panel" style="margin-bottom: 0;">
                <div class="panel-header" style="flex-wrap: wrap; gap: 0.75rem;">
                    <h3>Medicine Inventory</h3>
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-left: auto;">
                        <input type="text" id="adminMedicineSearch" class="form-control" placeholder="Search medicines..." style="max-width: 200px; padding: 0.4rem 0.85rem; font-size: 0.8rem; height: 32px; border-radius: var(--radius-sm);">
                        <button class="btn btn-sm btn-primary" onclick="openModal('addMedicineModal')" style="height: 32px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Add Medicine
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="loadMedicinesList()" style="height: 32px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                            Refresh
                        </button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Description</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Expiry Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="adminMedicineTableBody">
                            <tr><td colspan="6" class="text-center">Loading inventory data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- ===================================================================
             TAB 2: BILLING & POS (POINT OF SALE)
             =================================================================== -->
        <div id="pos-tab" class="tab-pane">
            <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.75rem; align-items: start;">
                
                <!-- Left Column: Quick Select Product Catalog Grid -->
                <div class="panel" style="margin-bottom: 0;">
                    <div class="panel-header" style="flex-wrap: wrap; gap: 0.75rem;">
                        <h3>Quick Select Catalog</h3>
                        <input type="text" id="posCatalogSearch" class="form-control" placeholder="Search products..." style="max-width: 200px; padding: 0.4rem 0.85rem; font-size: 0.8rem; height: 32px; border-radius: var(--radius-sm);">
                    </div>
                    
                    <!-- Dynamic Grid -->
                    <div id="posCatalogGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.85rem; max-height: 480px; overflow-y: auto; padding-right: 4px; margin-top: 1rem;">
                        <!-- JS renders clickable product tiles here -->
                        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">Loading catalog items...</div>
                    </div>
                </div>

                <!-- Right Column: Active Cart & Checkout Invoice Sidebar -->
                <div class="panel" style="margin-bottom: 0; min-height: 520px; display: flex; flex-direction: column;">
                    <div class="panel-header">
                        <h3>Active Invoice</h3>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="clearCart()">Clear All</button>
                    </div>

                    <!-- Cart items list -->
                    <div class="table-responsive" style="flex-grow: 1; max-height: 220px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 1.25rem; background: var(--bg);">
                        <table class="table" style="font-size: 0.8rem;">
                            <thead>
                                <tr>
                                    <th>Medicine</th>
                                    <th>Qty</th>
                                    <th>Total</th>
                                    <th style="width: 30px;"></th>
                                </tr>
                            </thead>
                            <tbody id="posCartTableBody">
                                <tr><td colspan="4" class="text-center" style="color:var(--text-muted); padding:2rem 1rem;">No items selected. Click catalog products to add.</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Customer Details Entry -->
                    <div style="background: var(--surface-alt); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 1.25rem;">
                        <div class="form-group" style="margin-bottom: 0.75rem;">
                            <label class="form-label" for="customerName" style="font-size: 0.7rem; margin-bottom: 0.25rem;">Customer Name *</label>
                            <input type="text" id="customerName" class="form-control" placeholder="e.g. John Doe" style="padding: 0.45rem 0.65rem; font-size: 0.8rem; height: 32px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="customerPhone" style="font-size: 0.7rem; margin-bottom: 0.25rem;">Phone Number *</label>
                            <input type="tel" id="customerPhone" class="form-control mono" placeholder="e.g. +91 98765 43210" style="padding: 0.45rem 0.65rem; font-size: 0.8rem; height: 32px;">
                        </div>
                    </div>

                    <!-- Summary & Pay Trigger -->
                    <div class="cart-summary" style="margin-top: auto; padding-top: 0.85rem; border-top: 2px dashed var(--border);">
                        <div class="summary-row" style="font-size: 0.85rem;">
                            <span>Subtotal</span>
                            <span id="posSubtotal" class="mono">₹0.00</span>
                        </div>
                        <div class="summary-row total" style="margin-top: 0.4rem; padding-top: 0.4rem; border-top: 1px solid var(--border);">
                            <span>Total Due</span>
                            <span id="posTotalAmount" class="mono" style="font-size: 1.35rem; color: var(--primary);">₹0.00</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
                            <button type="button" id="checkoutBtn" class="btn btn-primary btn-block" style="padding: 0.7rem; font-size: 0.85rem;">
                                Complete Sale &amp; Save PDF
                            </button>
                            <button type="button" id="checkoutPrintBtn" class="btn btn-secondary btn-block" style="padding: 0.7rem; font-size: 0.85rem; background: var(--success-light); border-color: var(--success-border); color: var(--success); display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                Complete Sale &amp; Direct Print
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ===================================================================
             TAB 3: SALES HISTORY
             =================================================================== -->
        <div id="sales-tab" class="tab-pane">
            <div class="panel">
                <div class="panel-header">
                    <h3>Transaction &amp; Sales History</h3>
                    <button class="btn btn-sm btn-secondary" onclick="loadSalesHistory()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        Refresh History
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Invoice ID</th>
                                <th>Date &amp; Time</th>
                                <th>Customer Name</th>
                                <th>Phone Number</th>
                                <th>Total Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="salesHistoryTableBody">
                            <tr><td colspan="6" class="text-center">Loading sales records...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    </main>

    <!-- Modal for Invoice Line Item Breakdown -->
    <div id="saleDetailsModal" class="modal-overlay">
        <div class="modal-card">
            <div class="modal-header">
                <h3 id="modalInvoiceTitle">Invoice Details</h3>
                <button type="button" class="btn btn-sm btn-secondary" onclick="closeModal('saleDetailsModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div id="modalCustomerInfo" style="margin-bottom:1rem; padding:0.75rem; background:var(--surface-alt); border-radius:var(--radius-sm); font-size:0.84rem;"></div>
                
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="modalItemsBody"></tbody>
                    </table>
                </div>

                <div style="text-align:right; margin-top:1rem; font-size:1.1rem; font-weight:700;">
                    Total Paid: <span id="modalGrandTotal" class="price-tag mono">₹0.00</span>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button type="button" id="modalPrintBtn" class="btn btn-primary btn-sm" style="background: var(--success-light); border-color: var(--success-border); color: var(--success); display: inline-flex; align-items: center; gap: 0.35rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print Invoice
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('saleDetailsModal')">Close</button>
            </div>
        </div>
    </div>

    <!-- Modal for Adding Medicine (Manual Add Console) -->
    <div id="addMedicineModal" class="modal-overlay">
        <div class="modal-card" style="max-width: 480px;">
            <div class="modal-header">
                <h3 id="medicineConsoleTitle">Add New Medicine</h3>
                <button type="button" class="btn btn-sm btn-secondary" onclick="closeModal('addMedicineModal')">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Manual Entry Form -->
                <div id="medicineManualContainer">
                    <form id="addMedicineForm" enctype="multipart/form-data">
                        <div class="form-group">
                            <label class="form-label" for="medName">Medicine Name *</label>
                            <input type="text" id="medName" name="name" class="form-control" placeholder="e.g. Paracetamol 500mg" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="medDesc">Description</label>
                            <textarea id="medDesc" name="description" class="form-control" placeholder="Key therapeutic uses, dosage info..."></textarea>
                        </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="medPrice">Price (₹) *</label>
                                <input type="number" step="0.01" id="medPrice" name="price" class="form-control mono" placeholder="0.00" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="medStock">Initial Stock *</label>
                                <input type="number" id="medStock" name="stock_quantity" class="form-control mono" placeholder="100" required>
                            </div>
                        </div>
                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="medExpiry">Expiry Date *</label>
                                <input type="date" id="medExpiry" name="expiry_date" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="medImage">Image File</label>
                                <input type="file" id="medImage" name="image" class="form-control" accept="image/*">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 0.5rem;">Save Medicine</button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="assets/js/main.js"></script>
    <script src="assets/js/medicines.js"></script>
    <script src="assets/js/pos.js"></script>
    <script src="assets/js/dashboard.js"></script>
</body>
</html>
