/**
 * Simple Unified JavaScript for PharmaCare
 * Handles all 4 pages: dashboard.html, medicines.html, pos.html, sales.html
 */

let cart = [];
let posMedicinesCatalog = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check user session
    checkAuth();

    // 2. Set current date
    populateCurrentDate();

    // 3. Initialize forms and loaders
    initAddMedicineForm();
    initEditMedicineForm();
    initMedicineSearch();
    initPosCatalog();
    initCheckoutForm();

    // 4. Load stored cart if available
    const savedCart = sessionStorage.getItem('pharmacy_cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch(e) {}
    }

    // 5. Page-specific initial loads
    if (document.getElementById('statSalesToday')) {
        loadDashboardStats();
    }
    if (document.getElementById('adminMedicineTableBody')) {
        loadMedicinesList();
    }
    if (document.getElementById('posCatalogGrid')) {
        loadPosCatalog();
        renderCart();
    }
    if (document.getElementById('salesHistoryTableBody')) {
        loadSalesHistory();
    }
});

// ==========================================
// 1. AUTH & SESSION HELPERS
// ==========================================

async function checkAuth() {
    try {
        const res = await fetch('api.php?action=check');
        const result = await res.json();
        if (!result.success) {
            window.location.href = 'login.html';
        }
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

function populateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    const datePill = document.getElementById('currentDatePill');
    if (datePill) {
        datePill.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${dateStr}
        `;
    }
}


// ==========================================
// 2. DASHBOARD STATS (dashboard.html)
// ==========================================

async function loadDashboardStats() {
    try {
        const res = await fetch('api.php?action=stats');
        const result = await res.json();
        if (!result.success) return;

        const data = result.data;

        // Key numbers
        const salesTodayElem = document.getElementById('statSalesToday');
        const revenueTodayElem = document.getElementById('statRevenueToday');
        const totalProductsElem = document.getElementById('statTotalProducts');
        const lowStockCountElem = document.getElementById('statLowStockCount');

        if (salesTodayElem) salesTodayElem.textContent = data.sales_today_count;
        if (revenueTodayElem) revenueTodayElem.textContent = `₹${data.revenue_today.toFixed(2)}`;
        if (totalProductsElem) totalProductsElem.textContent = data.total_products;
        if (lowStockCountElem) lowStockCountElem.textContent = data.low_stock_count;

        // Recent sales table
        const recentBody = document.getElementById('recentSalesTableBody');
        if (recentBody) {
            if (data.recent_sales && data.recent_sales.length > 0) {
                recentBody.innerHTML = '';
                data.recent_sales.forEach(sale => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>#INV-${sale.id}</strong></td>
                        <td>${escapeHtml(sale.customer_name)}</td>
                        <td><strong class="price-tag" style="font-size:0.88rem;">₹${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                        <td><button class="btn btn-sm btn-secondary" onclick="viewSaleDetails(${sale.id})">Details</button></td>
                    `;
                    recentBody.appendChild(tr);
                });
            } else {
                recentBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--text-muted);">No sales recorded yet today.</td></tr>';
            }
        }

        // Low stock alerts table
        const lowStockBody = document.getElementById('lowStockTableBody');
        if (lowStockBody) {
            const lowItems = data.low_stock_items || [];
            if (lowItems.length === 0) {
                lowStockBody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:var(--success);">All stock levels are optimal!</td></tr>';
            } else {
                lowStockBody.innerHTML = '';
                lowItems.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${item.name}</strong></td>
                        <td><span class="stock-badge ${item.stock_quantity <= 0 ? 'badge-danger' : 'badge-warning'}">${item.stock_quantity} left</span></td>
                        <td>₹${parseFloat(item.price).toFixed(2)}</td>
                    `;
                    lowStockBody.appendChild(tr);
                });
            }
        }

    } catch (err) {
        console.error(err);
    }
}


// ==========================================
// 3. MEDICINE MANAGEMENT (medicines.html)
// ==========================================

function initMedicineSearch() {
    const searchInput = document.getElementById('adminMedicineSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        const rows = document.querySelectorAll('#adminMedicineTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    });
}

function initAddMedicineForm() {
    const form = document.getElementById('addMedicineForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        formData.append('action', 'add_medicine');

        try {
            const res = await fetch('api.php', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                showToast(result.message, 'success');
                form.reset();
                closeModal('addMedicineModal');
                loadMedicinesList();
            } else {
                showToast(result.message || 'Failed to add medicine', 'error');
            }
        } catch (err) {
            showToast('Error saving medicine', 'error');
        }
    });
}

function initEditMedicineForm() {
    const form = document.getElementById('editMedicineForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        formData.append('action', 'edit_medicine');

        try {
            const res = await fetch('api.php', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                showToast(result.message, 'success');
                closeModal('editMedicineModal');
                loadMedicinesList();
            } else {
                showToast(result.message || 'Failed to update medicine', 'error');
            }
        } catch (err) {
            showToast('Error updating medicine', 'error');
        }
    });
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

async function loadMedicinesList() {
    const tableBody = document.getElementById('adminMedicineTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading inventory...</td></tr>';

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
                            <img src="${med.image_path}" alt="${med.name}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; background:#f1f5f9;" onerror="this.src='default-medicine.svg'">
                            <strong>${med.name}</strong>
                        </div>
                    </td>
                    <td>${med.description ? med.description.substring(0, 45) + '...' : '-'}</td>
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

async function deleteMedicine(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
        const formData = new FormData();
        formData.append('action', 'delete_medicine');
        formData.append('id', id);

        const res = await fetch('api.php', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
            showToast('Medicine deleted successfully', 'success');
            loadMedicinesList();
        } else {
            showToast(result.message || 'Failed to delete', 'error');
        }
    } catch (err) {
        showToast('Error deleting medicine', 'error');
    }
}


// ==========================================
// 4. POS & BILLING (pos.html)
// ==========================================

function initPosCatalog() {
    const searchInput = document.getElementById('posCatalogSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = posMedicinesCatalog.filter(m => m.name.toLowerCase().includes(query));
            renderPosCatalog(filtered);
        });
    }
}

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
        card.style.background = 'var(--surface)';
        card.style.border = '1px solid var(--border)';
        card.style.borderRadius = '12px';
        card.style.padding = '0.8rem';
        card.style.cursor = 'pointer';
        card.style.textAlign = 'center';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.style.boxShadow = 'var(--shadow-sm)';

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
            <img src="${med.image_path}" alt="${med.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; margin-bottom: 0.5rem; background: #f1f5f9;" onerror="this.src='default-medicine.svg'">
            <strong style="font-size: 0.8rem; line-height: 1.25; height: 32px; overflow: hidden; margin-bottom: 0.25rem;">${med.name}</strong>
            <div>
                <div class="price-tag" style="font-size: 0.88rem; font-weight: 700; color: var(--primary);">₹${parseFloat(med.price).toFixed(2)}</div>
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
        showToast('This medicine is out of stock.', 'error');
        return;
    }

    const existing = cart.find(item => item.medicine_id === med.medicine_id);
    if (existing) {
        if (existing.quantity + 1 > med.stock_quantity) {
            showToast(`Only ${med.stock_quantity} units available in stock.`, 'error');
            return;
        }
        existing.quantity += 1;
    } else {
        cart.push({
            medicine_id: med.medicine_id,
            name: med.name,
            price: med.price,
            stock_quantity: med.stock_quantity,
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
        const itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.padding = '0.6rem 0';
        row.style.borderBottom = '1px solid var(--border)';

        row.innerHTML = `
            <div style="flex:1;">
                <strong>${item.name}</strong>
                <div style="font-size:0.8rem; color:var(--text-muted);">₹${item.price.toFixed(2)} x ${item.quantity} = ₹${itemTotal.toFixed(2)}</div>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
                <button type="button" class="btn btn-sm btn-secondary" onclick="updateCartQty(${index}, -1)" style="padding:0.2rem 0.5rem;">-</button>
                <span style="font-weight:600; min-width:20px; text-align:center;">${item.quantity}</span>
                <button type="button" class="btn btn-sm btn-secondary" onclick="updateCartQty(${index}, 1)" style="padding:0.2rem 0.5rem;">+</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeFromCart(${index})" style="padding:0.2rem 0.5rem;">&times;</button>
            </div>
        `;
        cartContainer.appendChild(row);
    });

    if (totalElem) totalElem.textContent = `₹${grandTotal.toFixed(2)}`;
}

function updateCartQty(index, change) {
    const item = cart[index];
    if (!item) return;

    const newQty = item.quantity + change;
    if (newQty <= 0) {
        removeFromCart(index);
        return;
    }
    if (newQty > item.stock_quantity) {
        showToast(`Cannot exceed available stock (${item.stock_quantity}).`, 'error');
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

function initCheckoutForm() {
    const form = document.getElementById('posCheckoutForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (cart.length === 0) {
            showToast('Please add medicines to cart before completing sale.', 'error');
            return;
        }

        const name = document.getElementById('posCustomerName').value.trim();
        const phone = document.getElementById('posCustomerPhone').value.trim();

        if (!name || !phone) {
            showToast('Please enter customer name and phone.', 'error');
            return;
        }

        const payload = {
            customer_name: name,
            customer_phone: phone,
            items: cart.map(i => ({ medicine_id: i.medicine_id, quantity: i.quantity }))
        };

        try {
            const res = await fetch('api.php?action=checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.success) {
                showToast('Sale completed successfully!', 'success');
                clearCart();
                form.reset();
                loadPosCatalog();
            } else {
                showToast(result.message || 'Checkout failed', 'error');
            }
        } catch (err) {
            showToast('Error during checkout', 'error');
        }
    });
}


// ==========================================
// 5. SALES HISTORY (sales.html)
// ==========================================

async function loadSalesHistory() {
    const tableBody = document.getElementById('salesHistoryTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading sales history...</td></tr>';

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
                    <td><strong class="price-tag" style="font-size:0.95rem;">₹${parseFloat(sale.total_amount).toFixed(2)}</strong></td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="viewSaleDetails(${sale.id})">View Items</button>
                    </td>
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
                <div><strong>Customer:</strong> ${sale.customer_name} (${sale.customer_phone})</div>
                <div><strong>Date:</strong> ${sale.sale_date}</div>
            `;

            const modalBody = document.getElementById('modalItemsBody');
            modalBody.innerHTML = '';

            sale.items.forEach(item => {
                const tr = document.createElement('tr');
                const lineTotal = item.quantity * item.price_at_time;
                tr.innerHTML = `
                    <td>${item.medicine_name || 'Medicine #' + item.medicine_id}</td>
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
        showToast('Error loading invoice details', 'error');
    }
}


// ==========================================
// 6. UTILITIES (Toast, Modals, Escaping)
// ==========================================

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

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
