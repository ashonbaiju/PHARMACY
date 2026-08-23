/**
 * Medicine Management AJAX Handlers (Manual Add Form)
 */

document.addEventListener('DOMContentLoaded', () => {
    initAddMedicineForm();
    initMedicineSearch();
});

/**
 * Initialize search event listener for medicines inventory
 */
function initMedicineSearch() {
    const searchInput = document.getElementById('adminMedicineSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        applyMedicineFilter();
    });
}

/**
 * Filter table rows based on search text input
 */
function applyMedicineFilter() {
    const searchInput = document.getElementById('adminMedicineSearch');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#adminMedicineTableBody tr');

    rows.forEach(row => {
        const nameCell = row.cells[0];
        if (!nameCell) return;

        const nameText = nameCell.textContent.toLowerCase();
        const descCell = row.cells[1];
        const descText = descCell ? descCell.textContent.toLowerCase() : '';

        if (nameText.includes(query) || descText.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

/**
 * Section A: Manual Add Medicine Form Handler
 */
function initAddMedicineForm() {
    const form = document.getElementById('addMedicineForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        formData.append('action', 'add');

        try {
            const res = await fetch('api/medicines.php', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();
            if (result.success) {
                showToast(result.message, 'success');
                form.reset();
                if (typeof closeModal === 'function') closeModal('addMedicineModal');
                if (typeof loadMedicinesList === 'function') loadMedicinesList();
                if (typeof loadDashboardStats === 'function') loadDashboardStats();
                if (typeof loadPosCatalog === 'function') loadPosCatalog();
            } else {
                showToast(result.message || 'Failed to add medicine.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error occurred while saving medicine.', 'error');
        }
    });
}

/**
 * Load list of medicines in Admin Table
 */
async function loadMedicinesList() {
    const tableBody = document.getElementById('adminMedicineTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading inventory data...</td></tr>';

    try {
        const res = await fetch('api/medicines.php?action=list');
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

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap:0.75rem;">
                            <img src="${med.image_path}" alt="${med.name}" style="width:36px; height:36px; object-fit:cover; border-radius:6px; background:#f1f5f9;" onerror="this.src='assets/images/default-medicine.svg'">
                            <strong>${med.name}</strong>
                        </div>
                    </td>
                    <td>${med.description ? med.description.substring(0, 45) + '...' : '-'}</td>
                    <td><strong>₹${parseFloat(med.price).toFixed(2)}</strong></td>
                    <td><span class="stock-badge ${badgeClass}">${stockStatus}</span></td>
                    <td>${med.expiry_date}</td>
                    <td><button class="btn btn-sm btn-secondary" onclick="addPosItemDirect(${med.id}, '${escapeHtml(med.name)}', ${med.price}, ${med.stock_quantity})">+ Add to POS</button></td>
                `;
                tableBody.appendChild(tr);
            });
            applyMedicineFilter();
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--text-muted);">No medicines found in inventory. Add your first medicine above!</td></tr>';
        }
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--danger);">Error loading inventory records.</td></tr>';
    }
}

function escapeHtml(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
