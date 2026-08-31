/**
 * Simple Unified JavaScript for PharmaCare
 * Handles: Dashboard, Medicine Management, Billing, Sales History
 */

let cart = [];
let posMedicinesCatalog = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initForms();

    // Load stored cart
    try {
        const savedCart = sessionStorage.getItem('pharmacy_cart');
        if (savedCart) cart = JSON.parse(savedCart);
    } catch(e) {}

    // Load page-specific data
    if (document.getElementById('statSalesToday')) loadDashboardStats();
    if (document.getElementById('adminMedicineTableBody')) loadMedicinesList();
    if (document.getElementById('posCatalogGrid')) {
        loadPosCatalog();
        renderCart();
    }
    if (document.getElementById('salesHistoryTableBody')) loadSalesHistory();
});


// ==========================================
// 1. AUTHENTICATION & SESSION
// ==========================================

async function checkAuth() {
    try {
        const res = await fetch('api.php?action=check');
        const result = await res.json();
        if (!result.success) window.location.href = 'login.html';
    } catch (err) {
        window.location.href = 'login.html';
    }
}

async function handleLogout(e) {
    if (e) e.preventDefault();
    try {
        await fetch('api.php?action=logout');
    } catch (err) {}
    sessionStorage.removeItem('pharmacy_cart');
    window.location.href = 'login.html';
}


// ==========================================
// 2. DASHBOARD (dashboard.html)
// ==========================================

async function loadDashboardStats() {
    const recentBody = document.getElementById('recentSalesTableBody');
    const lowStockBody = document.getElementById('lowStockTableBody');

    try {
        const res = await fetch('api.php?action=stats');
        const result = await res.json();

        if (!result.success) {
            if (result.message && result.message.toLowerCase().includes('auth')) {
                window.location.href = 'login.html';
            }
            return;
        }

        const data = result.data;

        // Metric numbers
        const salesElem = document.getElementById('statSalesToday') || document.getElementById('statTotalSales');
        const revenueElem = document.getElementById('statRevenueToday') || document.getElementById('statTotalRevenue');
        const totalProductsElem = document.getElementById('statTotalProducts');
        const lowStockCountElem = document.getElementById('statLowStockCount');

        if (salesElem) salesElem.textContent = data.total_sales ?? 0;
        if (revenueElem) revenueElem.textContent = `₹${parseFloat(data.total_revenue ?? 0).toFixed(2)}`;
        if (totalProductsElem) totalProductsElem.textContent = data.total_products;
        if (lowStockCountElem) lowStockCountElem.textContent = data.low_stock_count;

        // Recent sales table
        if (recentBody) {
            if (data.recent_sales && data.recent_sales.length > 0) {
                recentBody.innerHTML = '';
                data.recent_sales.forEach(sale => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>#INV-${sale.id}</strong></td>
                        <td>${escapeHtml(sale.customer_name)}</td>
                        <td><strong class="price-tag">₹${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                        <td><button class="btn btn-sm btn-secondary" onclick="viewSaleDetails(${sale.id})">Details</button></td>
                    `;
                    recentBody.appendChild(tr);
                });
            } else {
                recentBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--text-muted);">No sales recorded yet.</td></tr>';
            }
        }

        // Low stock alerts table
        if (lowStockBody) {
            const lowItems = data.low_stock_items || [];
            if (lowItems.length === 0) {
                lowStockBody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--success);">All stock levels are optimal!</td></tr>';
            } else {
                lowStockBody.innerHTML = '';
                lowItems.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(item.name)}</strong></td>
                        <td><span class="stock-badge ${item.stock_quantity <= 0 ? 'badge-danger' : 'badge-warning'}">${item.stock_quantity} left</span></td>
                        <td>₹${parseFloat(item.price).toFixed(2)}</td>
                    `;
                    lowStockBody.appendChild(tr);
                });
            }
        }

    } catch (err) {
        if (recentBody) recentBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--danger);">Error loading recent sales.</td></tr>';
        if (lowStockBody) lowStockBody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--danger);">Error loading stock alerts.</td></tr>';
    }
}


// ==========================================
// 3. MEDICINE MANAGEMENT (medicines.html)
// ==========================================

function initForms() {
    // Add Medicine
    const addForm = document.getElementById('addMedicineForm');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addForm);
            formData.append('action', 'add_medicine');

            const res = await fetch('api.php', { method: 'POST', body: formData });
            const result = await res.json();
            alert(result.message || (result.success ? 'Medicine added!' : 'Failed to add'));
            if (result.success) {
                addForm.reset();
                closeModal('addMedicineModal');
                loadMedicinesList();
            }
        });
    }

    // Edit Medicine
    const editForm = document.getElementById('editMedicineForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(editForm);
            formData.append('action', 'edit_medicine');

            const res = await fetch('api.php', { method: 'POST', body: formData });
            const result = await res.json();
            alert(result.message || (result.success ? 'Medicine updated!' : 'Failed to update'));
            if (result.success) {
                closeModal('editMedicineModal');
                loadMedicinesList();
            }
        });
    }

    // Search Filter in Admin Table
    const searchInput = document.getElementById('adminMedicineSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            document.querySelectorAll('#adminMedicineTableBody tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
            });
        });
    }

    // Search in POS catalog
    const posSearch = document.getElementById('posCatalogSearch');
    if (posSearch) {
        posSearch.addEventListener('input', () => {
            const query = posSearch.value.toLowerCase().trim();
            const filtered = posMedicinesCatalog.filter(m => m.name.toLowerCase().includes(query));
            renderPosCatalog(filtered);
        });
    }

    // POS Checkout Form
    const checkoutForm = document.getElementById('posCheckoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }
}

async function loadMedicinesList() {
    const tableBody = document.getElementById('adminMedicineTableBody');
    if (!tableBody) return;

    try {
        const res = await fetch('api.php?action=medicines');
        const result = await res.json();

        if (result.success && result.data.length > 0) {
            tableBody.innerHTML = '';
            result.data.forEach(med => {
                let badgeClass = 'badge-success';
                let stockStatus = `${med.stock_quantity} in stock`;

                if (med.stock_quantity <= 0) {
                    badgeClass = 'badge-danger';
                    stockStatus = 'Out of Stock';
                } else if (med.stock_quantity <= 10) {
                    badgeClass = 'badge-warning';
                    stockStatus = `Low (${med.stock_quantity})`;
                }

                const safeName = escapeHtml(med.name);
                const safeDesc = escapeHtml(med.description || '');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <img src="${med.image_path}" alt="${safeName}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; background:#f1f5f9;" onerror="this.src='image.png'">
                            <strong>${safeName}</strong>
                        </div>
                    </td>
                    <td>${med.description ? escapeHtml(med.description.substring(0, 45)) + '...' : '-'}</td>
                    <td><strong>₹${parseFloat(med.price).toFixed(2)}</strong></td>
                    <td><span class="stock-badge ${badgeClass}">${stockStatus}</span></td>
                    <td>${med.expiry_date}</td>
                    <td>
                        <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
                            <button class="btn btn-sm btn-secondary" onclick="openEditMedicineModal(${med.id}, '${safeName}', '${safeDesc}', ${med.price}, ${med.stock_quantity}, '${med.expiry_date}')">Edit</button>
                            <button class="btn btn-sm btn-secondary" onclick="addPosItemDirect(${med.id}, '${safeName}', ${med.price}, ${med.stock_quantity})">+ Bill</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteMedicine(${med.id}, '${safeName}')">Delete</button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-muted);">No medicines found. Click "+ Add Medicine" to add one.</td></tr>';
        }
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--danger);">Error loading inventory.</td></tr>';
    }
}

function openEditMedicineModal(id, name, desc, price, stock, expiry) {
    document.getElementById('editMedId').value = id;
    document.getElementById('editMedName').value = name;
    document.getElementById('editMedDesc').value = desc;
    document.getElementById('editMedPrice').value = price;
    document.getElementById('editMedStock').value = stock;
    document.getElementById('editMedExpiry').value = expiry;
    document.getElementById('editMedImage').value = '';
    openModal('editMedicineModal');
}

async function deleteMedicine(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const formData = new FormData();
        formData.append('action', 'delete_medicine');
        formData.append('id', id);

        const res = await fetch('api.php', { method: 'POST', body: formData });
        const result = await res.json();
        alert(result.message || (result.success ? 'Medicine deleted' : 'Failed to delete'));
        if (result.success) loadMedicinesList();
    } catch (err) {
        alert('Error deleting medicine');
    }
}


// ==========================================
// 4. BILLING & CART (pos.html)
// ==========================================

async function loadPosCatalog() {
    const grid = document.getElementById('posCatalogGrid');
    if (!grid) return;

    try {
        const res = await fetch('api.php?action=medicines');
        const result = await res.json();

        if (result.success && result.data.length > 0) {
            posMedicinesCatalog = result.data;
            renderPosCatalog(posMedicinesCatalog);
        } else {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">No medicines in inventory.</div>';
        }
    } catch (err) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--danger); padding: 4rem 0;">Failed to load catalog.</div>';
    }
}

function renderPosCatalog(items) {
    const grid = document.getElementById('posCatalogGrid');
    if (!grid) return;

    grid.innerHTML = '';
    items.forEach(med => {
        const card = document.createElement('div');
        card.className = 'panel';
        card.style.padding = '0.75rem';
        card.style.cursor = 'pointer';
        card.style.textAlign = 'center';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.marginBottom = '0';

        let stockText = `${med.stock_quantity} left`;
        let stockColor = 'var(--text-muted)';
        if (med.stock_quantity <= 0) {
            stockText = 'Out of stock';
            stockColor = 'var(--danger)';
        } else if (med.stock_quantity <= 10) {
            stockText = 'Low Stock';
            stockColor = 'var(--warning)';
        }

        card.innerHTML = `
            <img src="${med.image_path}" alt="${escapeHtml(med.name)}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; margin-bottom: 0.5rem; background: #f1f5f9;" onerror="this.src='image.png'">
            <strong style="font-size: 0.8rem; line-height: 1.25; height: 32px; overflow: hidden; margin-bottom: 0.25rem;">${escapeHtml(med.name)}</strong>
            <div>
                <div class="price-tag" style="font-size: 0.88rem; font-weight: 700;">₹${parseFloat(med.price).toFixed(2)}</div>
                <div style="font-size: 0.68rem; font-weight: 600; color: ${stockColor};">${stockText}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            addToCart({
                medicine_id: med.id,
                name: med.name,
                price: parseFloat(med.price),
                stock_quantity: parseInt(med.stock_quantity)
            });
        });

        grid.appendChild(card);
    });
}

function addToCart(med) {
    if (med.stock_quantity <= 0) {
        alert('This medicine is out of stock.');
        return;
    }

    const existing = cart.find(item => item.medicine_id === med.medicine_id);
    if (existing) {
        const nextQty = existing.quantity + 1;
        const requiredPcs = existing.unit_type === 'strip' ? nextQty * 10 : nextQty;
        if (requiredPcs > med.stock_quantity) {
            alert(`Only ${med.stock_quantity} pieces available in stock.`);
            return;
        }
        existing.quantity = nextQty;
    } else {
        cart.push({
            medicine_id: med.medicine_id,
            name: med.name,
            price: med.price,
            stock_quantity: med.stock_quantity,
            unit_type: 'piece',
            quantity: 1
        });
    }

    sessionStorage.setItem('pharmacy_cart', JSON.stringify(cart));
    renderCart();
}

function addPosItemDirect(id, name, price, stock) {
    addToCart({
        medicine_id: id,
        name: name,
        price: parseFloat(price),
        stock_quantity: parseInt(stock)
    });
    window.location.href = 'pos.html';
}

function renderCart() {
    const cartContainer = document.getElementById('posCartItemsContainer');
    const badge = document.getElementById('posCartBadge');
    const totalElem = document.getElementById('posCartGrandTotal');
    if (!cartContainer) return;

    if (badge) badge.textContent = `${cart.length} item(s)`;

    if (cart.length === 0) {
        cartContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">No items in cart. Click medicines on the left to add.</div>';
        if (totalElem) totalElem.textContent = '₹0.00';
        return;
    }

    cartContainer.innerHTML = '';
    let grandTotal = 0;

    cart.forEach((item, index) => {
        item.unit_type = item.unit_type || 'piece';
        const unitMultiplier = item.unit_type === 'strip' ? 10 : 1;
        const unitPrice = item.price * unitMultiplier;
        const itemTotal = unitPrice * item.quantity;
        grandTotal += itemTotal;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.padding = '0.65rem 0';
        row.style.borderBottom = '1px solid var(--border)';

        row.innerHTML = `
            <div style="flex:1; padding-right: 0.5rem;">
                <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap; margin-bottom: 0.2rem;">
                    <strong>${escapeHtml(item.name)}</strong>
                    <select onchange="updateCartUnit(${index}, this.value)" class="form-control" style="width:auto; padding:0.1rem 0.35rem; font-size:0.75rem; height:26px; border-radius:4px; display:inline-block; font-weight:600; cursor:pointer;">
                        <option value="piece" ${item.unit_type === 'piece' ? 'selected' : ''}>Piece (1x)</option>
                        <option value="strip" ${item.unit_type === 'strip' ? 'selected' : ''}>Strip (10x)</option>
                    </select>
                </div>
                <div id="cartItemText_${index}" style="font-size:0.8rem; color:var(--text-muted);">
                    ₹${unitPrice.toFixed(2)} × ${item.quantity} ${item.unit_type === 'strip' ? 'strip(s)' : 'pc(s)'} = <strong>₹${itemTotal.toFixed(2)}</strong>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:0.3rem;">
                <button type="button" class="btn btn-sm btn-secondary" onclick="updateCartQty(${index}, -1)" style="padding:0.2rem 0.45rem; height:28px; width:28px;">-</button>
                <input type="number" min="1" value="${item.quantity}" oninput="setCartDirectQty(${index}, this.value)" onchange="renderCart()" class="form-control mono" style="width: 52px; height: 28px; padding: 0.2rem 0.25rem; text-align: center; font-size: 0.88rem; font-weight: 700; border-radius: 4px;">
                <button type="button" class="btn btn-sm btn-secondary" onclick="updateCartQty(${index}, 1)" style="padding:0.2rem 0.45rem; height:28px; width:28px;">+</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeFromCart(${index})" style="padding:0.2rem 0.45rem; height:28px; width:28px;">&times;</button>
            </div>
        `;
        cartContainer.appendChild(row);
    });

    if (totalElem) totalElem.textContent = `₹${grandTotal.toFixed(2)}`;
}

function setCartDirectQty(index, rawVal) {
    const item = cart[index];
    if (!item) return;

    let val = parseInt(rawVal);
    if (isNaN(val) || val <= 0) val = 1;

    const multiplier = item.unit_type === 'strip' ? 10 : 1;
    const requiredPcs = val * multiplier;

    if (requiredPcs > item.stock_quantity) {
        val = Math.max(1, Math.floor(item.stock_quantity / multiplier));
        alert(`Cannot exceed available stock (${item.stock_quantity} pcs). Set to ${val}.`);
    }

    item.quantity = val;
    sessionStorage.setItem('pharmacy_cart', JSON.stringify(cart));

    // Update text & grand total
    const textElem = document.getElementById(`cartItemText_${index}`);
    const unitPrice = item.price * multiplier;
    const itemTotal = unitPrice * item.quantity;
    if (textElem) {
        textElem.innerHTML = `₹${unitPrice.toFixed(2)} × ${item.quantity} ${item.unit_type === 'strip' ? 'strip(s)' : 'pc(s)'} = <strong>₹${itemTotal.toFixed(2)}</strong>`;
    }

    const totalElem = document.getElementById('posCartGrandTotal');
    let grandTotal = 0;
    cart.forEach(it => {
        const mult = it.unit_type === 'strip' ? 10 : 1;
        grandTotal += (it.price * mult) * it.quantity;
    });
    if (totalElem) totalElem.textContent = `₹${grandTotal.toFixed(2)}`;
}

function updateCartUnit(index, unitType) {
    const item = cart[index];
    if (!item) return;

    item.unit_type = unitType;
    const requiredPcs = unitType === 'strip' ? item.quantity * 10 : item.quantity;
    if (requiredPcs > item.stock_quantity && unitType === 'strip') {
        const maxStrips = Math.floor(item.stock_quantity / 10);
        if (maxStrips > 0) {
            item.quantity = maxStrips;
            alert(`Adjusted to available strips (${maxStrips} strips = ${maxStrips * 10} pcs).`);
        } else {
            item.unit_type = 'piece';
            alert(`Less than 10 pieces in stock. Switched back to Piece unit.`);
        }
    }

    sessionStorage.setItem('pharmacy_cart', JSON.stringify(cart));
    renderCart();
}

function updateCartQty(index, change) {
    const item = cart[index];
    if (!item) return;

    const newQty = item.quantity + change;
    if (newQty <= 0) {
        removeFromCart(index);
        return;
    }

    const multiplier = item.unit_type === 'strip' ? 10 : 1;
    if (newQty * multiplier > item.stock_quantity) {
        alert(`Cannot exceed available stock (${item.stock_quantity} pcs).`);
        return;
    }

    item.quantity = newQty;
    sessionStorage.setItem('pharmacy_cart', JSON.stringify(cart));
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    sessionStorage.setItem('pharmacy_cart', JSON.stringify(cart));
    renderCart();
}

function clearCart() {
    cart = [];
    sessionStorage.removeItem('pharmacy_cart');
    renderCart();
}

async function handleCheckout(e) {
    e.preventDefault();

    if (cart.length === 0) {
        alert('Please add medicines to cart before completing sale.');
        return;
    }

    const name = document.getElementById('posCustomerName').value.trim();
    const phone = document.getElementById('posCustomerPhone').value.trim();

    if (!name || !phone) {
        alert('Please enter customer name and phone number.');
        return;
    }

    const payload = {
        customer_name: name,
        customer_phone: phone,
        items: cart.map(i => ({ 
            medicine_id: i.medicine_id, 
            quantity: i.unit_type === 'strip' ? i.quantity * 10 : i.quantity
        }))
    };

    try {
        const res = await fetch('api.php?action=checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.success) {
            alert('Sale completed successfully!');
            
            const data = result.data;
            const titleElem = document.getElementById('receiptInvoiceTitle');
            const metaElem = document.getElementById('receiptInvoiceMeta');
            const custElem = document.getElementById('receiptCustomerInfo');
            const itemsBody = document.getElementById('receiptItemsBody');
            const grandTotalElem = document.getElementById('receiptGrandTotal');

            if (titleElem) titleElem.textContent = `Invoice Receipt (#INV-${data.sale_id})`;
            if (metaElem) metaElem.textContent = `Invoice: INV-${data.sale_id} | Date: ${data.sale_date}`;
            if (custElem) custElem.innerHTML = `<div><strong>Customer:</strong> ${escapeHtml(data.customer_name)}</div><div><strong>Phone:</strong> ${escapeHtml(data.customer_phone)}</div>`;

            if (itemsBody) {
                itemsBody.innerHTML = '';
                (data.items || []).forEach((item, idx) => {
                    const originalCartItem = cart[idx];
                    const unitDesc = originalCartItem && originalCartItem.unit_type === 'strip' 
                        ? `${originalCartItem.quantity} Strip(s)` 
                        : `${item.quantity} Pc(s)`;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${escapeHtml(item.name)} <small style="color:var(--text-muted);">(${unitDesc})</small></td>
                        <td>${item.quantity}</td>
                        <td>₹${parseFloat(item.price_at_time).toFixed(2)}</td>
                        <td>₹${parseFloat(item.total).toFixed(2)}</td>
                    `;
                    itemsBody.appendChild(tr);
                });
            }

            if (grandTotalElem) grandTotalElem.textContent = `₹${parseFloat(data.total_amount).toFixed(2)}`;

            openModal('invoiceReceiptModal');
            clearCart();
            document.getElementById('posCheckoutForm').reset();
            loadPosCatalog();
        } else {
            alert(result.message || 'Checkout failed');
        }
    } catch (err) {
        alert('Error during checkout');
    }
}

function printReceipt() {
    const printContent = document.getElementById('invoicePrintArea');
    if (!printContent) {
        window.print();
        return;
    }
    const win = window.open('', '', 'height=650,width=500');
    win.document.write('<html><head><title>Invoice Receipt</title>');
    win.document.write('<style>body{font-family:sans-serif;padding:20px;font-size:14px;} table{width:100%;border-collapse:collapse;margin:15px 0;} th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;} th{background:#f1f5f9;}</style>');
    win.document.write('</head><body>');
    win.document.write(printContent.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 250);
}


// ==========================================
// 5. SALES HISTORY (sales.html)
// ==========================================

async function loadSalesHistory() {
    const tableBody = document.getElementById('salesHistoryTableBody');
    if (!tableBody) return;

    try {
        const res = await fetch('api.php?action=sales');
        const result = await res.json();

        if (result.success && result.data.length > 0) {
            tableBody.innerHTML = '';
            result.data.forEach(sale => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#INV-${sale.id}</strong></td>
                    <td>${sale.sale_date}</td>
                    <td>${escapeHtml(sale.customer_name)}</td>
                    <td>${escapeHtml(sale.customer_phone)}</td>
                    <td><strong class="price-tag">₹${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                    <td><button class="btn btn-sm btn-secondary" onclick="viewSaleDetails(${sale.id})">View Items</button></td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-muted);">No sales records found yet.</td></tr>';
        }
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--danger);">Error loading sales history.</td></tr>';
    }
}

async function viewSaleDetails(saleId) {
    try {
        const res = await fetch(`api.php?action=sales&id=${saleId}`);
        const result = await res.json();

        if (result.success) {
            const sale = result.data;
            document.getElementById('modalInvoiceTitle').textContent = `Invoice Details (#INV-${sale.id})`;
            document.getElementById('modalCustomerInfo').innerHTML = `
                <div><strong>Customer:</strong> ${escapeHtml(sale.customer_name)} (${escapeHtml(sale.customer_phone)})</div>
                <div><strong>Date:</strong> ${sale.sale_date}</div>
            `;

            const modalBody = document.getElementById('modalItemsBody');
            modalBody.innerHTML = '';

            sale.items.forEach(item => {
                const tr = document.createElement('tr');
                const lineTotal = item.quantity * item.price_at_time;
                tr.innerHTML = `
                    <td>${escapeHtml(item.medicine_name || 'Medicine #' + item.medicine_id)}</td>
                    <td>${item.quantity}</td>
                    <td>₹${parseFloat(item.price_at_time).toFixed(2)}</td>
                    <td>₹${lineTotal.toFixed(2)}</td>
                `;
                modalBody.appendChild(tr);
            });

            document.getElementById('modalGrandTotal').textContent = `₹${parseFloat(sale.total_amount).toFixed(2)}`;
            openModal('saleDetailsModal');
        }
    } catch (err) {
        alert('Error loading invoice details');
    }
}


// ==========================================
// 6. MODALS & SECURITY HELPERS
// ==========================================

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
