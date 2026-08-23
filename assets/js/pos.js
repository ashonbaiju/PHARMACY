let cart = [];
let posMedicinesCatalog = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPosCatalog();
    initPosCatalogSearch();
    initCheckoutForm();
});

/**
 * Fetch catalog products from medicines API
 */
async function loadPosCatalog() {
    const grid = document.getElementById('posCatalogGrid');
    if (!grid) return;

    try {
        const res = await fetch('api/medicines.php?action=list');
        const result = await res.json();

        if (result.success && result.data.length > 0) {
            posMedicinesCatalog = result.data;
            renderPosCatalog(posMedicinesCatalog);
        } else {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 4rem 0;">No active products found in inventory.</div>';
        }
    } catch (err) {
        console.error(err);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--danger); padding: 4rem 0;">Failed to load catalog products.</div>';
    }
}

/**
 * Render catalog cards grid
 */
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
        card.style.transition = 'var(--transition)';

        // Hover effect helper via JS
        card.onmouseover = () => { card.style.borderColor = 'var(--primary)'; card.style.transform = 'translateY(-2px)'; };
        card.onmouseout = () => { card.style.borderColor = 'var(--border)'; card.style.transform = 'translateY(0)'; };

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
            <img src="${med.image_path}" alt="${med.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; margin-bottom: 0.5rem; background: #f1f5f9;" onerror="this.src='assets/images/default-medicine.svg'">
            <strong style="font-size: 0.8rem; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 32px; margin-bottom: 0.25rem; color: var(--text-main);">${med.name}</strong>
            <div>
                <div class="price-tag" style="font-size: 0.88rem; font-weight: 700; color: var(--primary); margin-bottom: 0.15rem;">₹${parseFloat(med.price).toFixed(2)}</div>
                <div style="font-size: 0.68rem; font-weight: 600; color: ${stockColor};">${stockText}</div>
            </div>
        `;

        card.addEventListener('click', () => {
            addToCart({
                id: med.id,
                name: med.name,
                price: med.price,
                stock_quantity: med.stock_quantity
            });
        });

        grid.appendChild(card);
    });
}

/**
 * Initialize catalog quick search
 */
function initPosCatalogSearch() {
    const searchInput = document.getElementById('posCatalogSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        const filtered = posMedicinesCatalog.filter(med => 
            med.name.toLowerCase().includes(query) || 
            (med.description && med.description.toLowerCase().includes(query))
        );
        renderPosCatalog(filtered);
    });
}

/**
 * Add product to POS Cart
 */
function addToCart(medicine) {
    if (medicine.stock_quantity <= 0) {
        showToast(`'${medicine.name}' is out of stock!`, 'error');
        return;
    }

    const existingIndex = cart.findIndex(item => item.id == medicine.id);

    if (existingIndex > -1) {
        if (cart[existingIndex].quantity + 1 > medicine.stock_quantity) {
            showToast(`Cannot add more than ${medicine.stock_quantity} available units of '${medicine.name}'.`, 'warning');
            return;
        }
        cart[existingIndex].quantity++;
    } else {
        cart.push({
            id: medicine.id,
            name: medicine.name,
            price: parseFloat(medicine.price),
            stock: parseInt(medicine.stock_quantity),
            quantity: 1
        });
    }

    renderCartTable();
}

/**
 * Direct Add Helper from Medicine Tab
 */
function addPosItemDirect(id, name, price, stock) {
    addToCart({
        id: id,
        name: name,
        price: price,
        stock_quantity: stock
    });
    switchTab('pos-tab');
    showToast(`Added '${name}' to current POS bill!`, 'success');
}

/**
 * Cart Quantity Controls & Removal
 */
function updateCartQty(medId, delta) {
    const item = cart.find(i => i.id == medId);
    if (!item) return;

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
        removeFromCart(medId);
        return;
    }

    if (newQty > item.stock) {
        showToast(`Only ${item.stock} units available in stock.`, 'warning');
        return;
    }

    item.quantity = newQty;
    renderCartTable();
}

function removeFromCart(medId) {
    cart = cart.filter(item => item.id != medId);
    renderCartTable();
}

function clearCart() {
    cart = [];
    renderCartTable();
}

/**
 * Render Current Bill Cart Table
 */
function renderCartTable() {
    const tableBody = document.getElementById('posCartTableBody');
    const totalAmountElem = document.getElementById('posTotalAmount');
    const subtotalElem = document.getElementById('posSubtotal');

    if (!tableBody) return;

    if (cart.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:var(--text-muted); padding:2rem;">Cart is empty. Search above or select medicines to begin.</td></tr>';
        if (totalAmountElem) totalAmountElem.textContent = '₹0.00';
        if (subtotalElem) subtotalElem.textContent = '₹0.00';
        return;
    }

    let subtotal = 0;
    tableBody.innerHTML = '';

    cart.forEach(item => {
        const lineTotal = item.price * item.quantity;
        subtotal += lineTotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>
                <div class="qty-control">
                    <button type="button" class="qty-btn" onclick="updateCartQty(${item.id}, -1)">-</button>
                    <input type="text" class="qty-input" value="${item.quantity}" readonly>
                    <button type="button" class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
                </div>
            </td>
            <td><strong>₹${lineTotal.toFixed(2)}</strong></td>
            <td>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeFromCart(${item.id})">&times;</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    if (totalAmountElem) totalAmountElem.textContent = `₹${subtotal.toFixed(2)}`;
    if (subtotalElem) subtotalElem.textContent = `₹${subtotal.toFixed(2)}`;
}

/**
 * Checkout & Invoice PDF Handling
 */
function initCheckoutForm() {
    const saveBtn = document.getElementById('checkoutBtn');
    const printBtn = document.getElementById('checkoutPrintBtn');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            submitCheckout(false);
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            submitCheckout(true);
        });
    }
}

async function submitCheckout(shouldDirectPrint) {
    const saveBtn = document.getElementById('checkoutBtn');
    const printBtn = document.getElementById('checkoutPrintBtn');
    const activeBtn = shouldDirectPrint ? printBtn : saveBtn;

    const customerName = document.getElementById('customerName')?.value.trim();
    const customerPhone = document.getElementById('customerPhone')?.value.trim();

    if (!customerName || !customerPhone) {
        showToast('Please enter Customer Name and Phone Number.', 'error');
        return;
    }

    if (cart.length === 0) {
        showToast('Cannot checkout with an empty cart.', 'error');
        return;
    }

    const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cart.map(i => ({ medicine_id: i.id, quantity: i.quantity, price_at_time: i.price }))
    };

    try {
        if (saveBtn) saveBtn.disabled = true;
        if (printBtn) printBtn.disabled = true;
        activeBtn.textContent = 'Processing...';

        const res = await fetch('api/checkout.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.success) {
            showToast(result.message, 'success');
            
            // Generate Invoice PDF
            generatePDFInvoice(result.data, shouldDirectPrint);

            // Reset state
            clearCart();
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';

            // Refresh stats, medicines, and POS catalog list
            if (typeof loadDashboardStats === 'function') loadDashboardStats();
            if (typeof loadMedicinesList === 'function') loadMedicinesList();
            loadPosCatalog();
        } else {
            showToast(result.message || 'Checkout failed.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Network error processing checkout.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Complete Sale & Save PDF';
        }
        if (printBtn) {
            printBtn.disabled = false;
            printBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Complete Sale &amp; Direct Print
            `;
        }
    }
}

/**
 * PDF Invoice Generator using jsPDF CDN
 */
function generatePDFInvoice(saleData, shouldDirectPrint) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('jsPDF library not loaded. Receipt cannot be rendered to PDF.', 'warning');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Pharmacy Branding Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(2, 132, 199);
    doc.text("PHARMA CARE SYSTEM", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Official Medical Receipt & Invoice", 105, 26, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 32, 196, 32);

    // Invoice Meta Information
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice ID: #INV-${saleData.sale_id}`, 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${saleData.sale_date}`, 196, 42, { align: "right" });

    doc.text(`Customer Name: ${saleData.customer_name}`, 14, 50);
    doc.text(`Phone: ${saleData.customer_phone}`, 14, 57);

    // Items Table Header
    let yPos = 70;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, yPos - 5, 182, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Medicine Item", 16, yPos);
    doc.text("Qty", 120, yPos);
    doc.text("Unit Price (INR)", 140, yPos);
    doc.text("Total (INR)", 194, yPos, { align: "right" });

    yPos += 8;
    doc.setFont("helvetica", "normal");

    saleData.items.forEach(item => {
        doc.text(item.name, 16, yPos);
        doc.text(`${item.quantity}`, 120, yPos);
        doc.text(`Rs. ${parseFloat(item.price_at_time).toFixed(2)}`, 140, yPos);
        doc.text(`Rs. ${parseFloat(item.total).toFixed(2)}`, 194, yPos, { align: "right" });
        yPos += 8;
    });

    doc.line(14, yPos, 196, yPos);
    yPos += 10;

    // Total Amount Highlight
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(2, 132, 199);
    doc.text(`Grand Total: Rs. ${parseFloat(saleData.total_amount).toFixed(2)}`, 196, yPos, { align: "right" });

    // Footer Thank You
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for choosing Pharma Care. Wishing you good health!", 105, yPos + 25, { align: "center" });

    // Save or Direct Print
    if (shouldDirectPrint) {
        doc.autoPrint();
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
            printWindow.focus();
        } else {
            showToast('Popup blocked! Please allow popups to open print layout.', 'warning');
        }
    } else {
        doc.save(`Invoice_INV_${saleData.sale_id}.pdf`);
    }
}
