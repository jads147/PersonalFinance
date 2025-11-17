// Globale Variablen
let allTransactions = [];
let categories = [];

// DOM Elemente
const transactionForm = document.getElementById('transactionForm');
const transactionsList = document.getElementById('transactionsList');
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const balanceEl = document.getElementById('balance');
const filterTypeEl = document.getElementById('filterType');
const filterCategoryEl = document.getElementById('filterCategory');

// Datum auf heute setzen
document.getElementById('date').valueAsDate = new Date();

// Daten beim Start laden
async function init() {
    const data = await window.financeAPI.loadData();
    allTransactions = data.transactions || [];
    categories = data.categories || [];

    populateCategoryFilters();
    updateUI();
}

// Kategorie-Filter befüllen
function populateCategoryFilters() {
    const categorySelect = document.getElementById('category');
    const filterCategorySelect = document.getElementById('filterCategory');

    // Formular-Kategorien
    categorySelect.innerHTML = categories.map(cat =>
        `<option value="${cat}">${cat}</option>`
    ).join('');

    // Filter-Kategorien
    filterCategorySelect.innerHTML = '<option value="all">Alle Kategorien</option>' +
        categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

// Transaktion hinzufügen
transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const transaction = {
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value
    };

    const savedTransaction = await window.financeAPI.saveTransaction(transaction);

    if (savedTransaction) {
        allTransactions.push(savedTransaction);
        updateUI();
        transactionForm.reset();
        document.getElementById('date').valueAsDate = new Date();
    }
});

// Transaktion löschen
async function deleteTransaction(id) {
    if (confirm('Möchtest du diese Transaktion wirklich löschen?')) {
        const success = await window.financeAPI.deleteTransaction(id);
        if (success) {
            allTransactions = allTransactions.filter(t => t.id !== id);
            updateUI();
        }
    }
}

// UI aktualisieren
function updateUI() {
    updateSummary();
    renderTransactions();
}

// Zusammenfassung aktualisieren
function updateSummary() {
    const income = allTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpenseEl.textContent = formatCurrency(expense);
    balanceEl.textContent = formatCurrency(balance);
}

// Transaktionen anzeigen
function renderTransactions() {
    const filterType = filterTypeEl.value;
    const filterCategory = filterCategoryEl.value;

    let filtered = allTransactions.filter(t => {
        const typeMatch = filterType === 'all' || t.type === filterType;
        const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
        return typeMatch && categoryMatch;
    });

    // Nach Datum sortieren (neueste zuerst)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <p>Keine Transaktionen gefunden</p>
            </div>
        `;
        return;
    }

    transactionsList.innerHTML = filtered.map(t => `
        <div class="transaction-item ${t.type}">
            <div class="transaction-info">
                <div class="transaction-description">${t.description}</div>
                <div class="transaction-meta">
                    ${formatDate(t.date)} • ${t.category}
                </div>
            </div>
            <div class="transaction-amount ${t.type}">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
            </div>
            <div class="transaction-actions">
                <button class="btn-delete" onclick="deleteTransaction('${t.id}')">
                    Löschen
                </button>
            </div>
        </div>
    `).join('');
}

// Hilfsfunktionen
function formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

// Event Listener für Filter
filterTypeEl.addEventListener('change', renderTransactions);
filterCategoryEl.addEventListener('change', renderTransactions);

// App initialisieren
init();
