/**
 * Main application UI logic and utility helpers
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize tab switcher if tabs exist
    initTabs();
    // Initialize public search if input exists
    initPublicSearch();
});

/**
 * Tab Navigation Switcher
 */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Trigger tab specific refreshes
    if (tabId === 'overview-tab' && typeof loadDashboardStats === 'function') {
        loadDashboardStats();
    } else if (tabId === 'medicines-tab' && typeof loadMedicinesList === 'function') {
        loadMedicinesList();
    } else if (tabId === 'sales-tab' && typeof loadSalesHistory === 'function') {
        loadSalesHistory();
    }
}

/**
 * Public Page Medicine Filter
 */
function initPublicSearch() {
    // Handled natively via GET form submission to database
}

/**
 * Toast Notification system
 */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let indicator = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:currentColor;"></span>';

    toast.innerHTML = `${indicator} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * Modal utilities
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}
