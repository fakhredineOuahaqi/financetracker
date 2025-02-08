// Import Firebase modules at the very top.
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js';

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js';

// -----------------------
// Global Variables & Firestore/Authentication Setup
// -----------------------
const db = getFirestore();
const transactionsCollection = collection(db, 'transactions');
const auth = getAuth();

let transactions = []; // Global transactions array
let currentEditId = null; // To track the editing transaction

// -----------------------
// DOM References
// -----------------------
const authButton = document.getElementById('authButton');
const signInModal = document.getElementById('signInModal');
const signInForm = document.getElementById('signInForm');
const cancelSignIn = document.getElementById('cancelSignIn');

const typeRadios = document.querySelectorAll('input[name="type"]');
const categorySelect = document.getElementById('category');
const monthFilter = document.getElementById('monthFilter');
const addTransactionForm = document.getElementById('addTransactionForm');

const incomeTotalElement = document.getElementById('incomeTotal');
const expenseTotalElement = document.getElementById('expenseTotal');
const creditGivenTotalElement = document.getElementById('creditGivenTotal');
const cryptoInvestmentTotalElement = document.getElementById(
  'cryptoInvestmentTotal'
);
const netEarningsElement = document.getElementById('netEarnings');
const transactionTableBody = document.getElementById('transactionTableBody');

const incomeByAccountEl = document.getElementById('incomeByAccount');
const expenseByAccountEl = document.getElementById('expenseByAccount');
const creditGivenByAccountEl = document.getElementById('creditGivenByAccount');
const cryptoInvestmentByAccountEl = document.getElementById(
  'cryptoInvestmentByAccount'
);
// New container for net earnings by account
// (Ensure your HTML contains an element with ID 'netEarningByAccount')

// New Filter Controls (ensure these exist in your HTML)
const filterType = document.getElementById('filterType');
const filterAccount = document.getElementById('filterAccount');
const filterCategory = document.getElementById('filterCategory');

const personNameField = document.getElementById('personNameField');
const personNameInput = document.getElementById('personName');
const otherCategoryField = document.getElementById('otherCategoryField');
const otherCategoryInput = document.getElementById('otherCategory');

// -----------------------
// Firebase Auth Handling
// -----------------------
function showSignInModal() {
  signInModal.classList.remove('hidden');
}
function hideSignInModal() {
  signInModal.classList.add('hidden');
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    authButton.textContent = 'Sign Out';
    hideSignInModal();
    refreshTransactions();
  } else {
    authButton.textContent = 'Sign In';
    showSignInModal();
  }
});

authButton.addEventListener('click', () => {
  if (auth.currentUser) {
    signOut(auth)
      .then(() => console.log('User signed out'))
      .catch((error) => console.error('Error signing out:', error));
  } else {
    showSignInModal();
  }
});

signInForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in');
    signInForm.reset();
    hideSignInModal();
  } catch (error) {
    console.error('Error signing in:', error);
    alert('Sign in failed. Please check your credentials.');
  }
});
cancelSignIn.addEventListener('click', hideSignInModal);

// -----------------------
// Category Arrays
// -----------------------
const incomeCategories = [
  'Social Media',
  'Airbnb',
  'Agyweb',
  'Udemy',
  'iLearnCode',
  'Other',
];
const expenseCategories = [
  // Regular expense categories (Credit Given and Crypto Investment will be inserted separately)
  'Work Expense',
  'Leisure',
  'Other',
];

// -----------------------
// Helper Functions
// -----------------------

// Populate the category dropdown based on the selected type
function populateCategoryDropdown() {
  categorySelect.innerHTML = '';
  const selectedType = document.querySelector(
    'input[name="type"]:checked'
  ).value;
  let options;
  if (selectedType === 'income') {
    options = incomeCategories;
  } else {
    // For expenses, prepend both "Credit Given" and "Crypto Investment"
    options = ['Credit Given', 'Crypto Investment', ...expenseCategories];
  }
  options.forEach((opt) => {
    const optionEl = document.createElement('option');
    optionEl.value = opt;
    optionEl.textContent = opt;
    categorySelect.appendChild(optionEl);
  });
  categorySelect.dispatchEvent(new Event('change'));
}

typeRadios.forEach((radio) => {
  radio.addEventListener('change', function () {
    populateCategoryDropdown();
    personNameField.style.display = 'none';
    personNameInput.value = '';
    personNameInput.removeAttribute('required');
    otherCategoryField.style.display = 'none';
    otherCategoryInput.value = '';
    otherCategoryInput.removeAttribute('required');
  });
});

categorySelect.addEventListener('change', function () {
  if (this.value === 'Credit Given') {
    personNameField.style.display = 'block';
    personNameInput.setAttribute('required', 'required');
    otherCategoryField.style.display = 'none';
    otherCategoryInput.value = '';
    otherCategoryInput.removeAttribute('required');
  } else if (this.value === 'Other') {
    otherCategoryField.style.display = 'block';
    otherCategoryInput.setAttribute('required', 'required');
    personNameField.style.display = 'none';
    personNameInput.value = '';
    personNameInput.removeAttribute('required');
  } else {
    // For Crypto Investment or any regular category, hide extra fields
    personNameField.style.display = 'none';
    personNameInput.value = '';
    personNameInput.removeAttribute('required');
    otherCategoryField.style.display = 'none';
    otherCategoryInput.value = '';
    otherCategoryInput.removeAttribute('required');
  }
});

// Format a Date object to "YYYY-MM"
function formatDateToMonth(date) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return year + '-' + (month < 10 ? '0' + month : month);
}

// Populate month filter (past 12 months)
function populateMonthFilter() {
  const currentDate = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - i,
      1
    );
    const monthYear = date.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
    const option = document.createElement('option');
    option.value = formatDateToMonth(date);
    option.textContent = monthYear;
    monthFilter.appendChild(option);
  }
}
populateMonthFilter();

// Call populateCategoryDropdown() on page load to ensure dropdown is populated.
populateCategoryDropdown();

// -----------------------
// Additional Filter Event Listeners
// -----------------------
if (filterType) {
  filterType.addEventListener('change', updateUI);
}
if (filterAccount) {
  filterAccount.addEventListener('change', updateUI);
}
if (filterCategory) {
  filterCategory.addEventListener('change', updateUI);
}

// -----------------------
// Firestore CRUD Functions
// -----------------------
async function firestoreAddTransaction(transaction) {
  try {
    await addDoc(transactionsCollection, transaction);
    console.log('Transaction added to Firestore:', transaction);
  } catch (error) {
    console.error('Error adding transaction:', error);
  }
}

async function firestoreFetchTransactions() {
  try {
    const snapshot = await getDocs(transactionsCollection);
    const fetched = [];
    snapshot.forEach((docSnap) => {
      fetched.push({ id: docSnap.id, ...docSnap.data() });
    });
    return fetched;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

async function firestoreDeleteTransaction(transactionId) {
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    console.error('Error deleting transaction:', error);
  }
}

async function firestoreUpdateTransaction(transactionId, updatedTransaction) {
  try {
    await updateDoc(doc(db, 'transactions', transactionId), updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
  }
}

// -----------------------
// UI Update Functions
// -----------------------
async function refreshTransactions() {
  if (!auth.currentUser) return; // Only load data if signed in.
  transactions = await firestoreFetchTransactions();
  updateUI();
}

function updateUI() {
  const selectedMonth = monthFilter.value;
  // Filter transactions by month (using the transaction date)
  let filteredTransactions = transactions.filter((t) => {
    return formatDateToMonth(new Date(t.date)) === selectedMonth;
  });

  // Apply additional filters from the new filter controls:
  if (filterType && filterType.value) {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.type === filterType.value
    );
  }
  if (filterAccount && filterAccount.value) {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.account === filterAccount.value
    );
  }
  if (filterCategory && filterCategory.value) {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.category === filterCategory.value
    );
  }

  // Sort transactions by date descending (most recent first)
  filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log('Updating UI for month:', selectedMonth, filteredTransactions);

  // Calculate totals:
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  // For expenses, exclude Credit Given and Crypto Investment
  const totalExpense = filteredTransactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.category !== 'Credit Given' &&
        t.category !== 'Crypto Investment'
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCreditGiven = filteredTransactions
    .filter((t) => t.type === 'expense' && t.category === 'Credit Given')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCryptoInvestment = filteredTransactions
    .filter((t) => t.type === 'expense' && t.category === 'Crypto Investment')
    .reduce((sum, t) => sum + t.amount, 0);

  incomeTotalElement.innerText = 'MAD' + totalIncome.toFixed(2);
  expenseTotalElement.innerText = 'MAD' + totalExpense.toFixed(2);
  creditGivenTotalElement.innerText = 'MAD' + totalCreditGiven.toFixed(2);
  cryptoInvestmentTotalElement.innerText =
    'MAD' + totalCryptoInvestment.toFixed(2);
  // Net Earnings: income - expense (do not add Credit Given or Crypto Investment)
  netEarningsElement.innerText =
    'MAD' + (totalIncome - totalExpense).toFixed(2);

  // Update transactions table
  transactionTableBody.innerHTML = '';
  filteredTransactions.forEach((t) => {
    // Use different row classes:
    // Income: green, Expense: red, Credit Given: yellow, Crypto Investment: light blue
    let rowClass = '';
    if (t.type === 'income') {
      rowClass = 'bg-green-50';
    } else if (t.type === 'expense') {
      if (t.category === 'Credit Given') {
        rowClass = 'bg-yellow-50';
      } else if (t.category === 'Crypto Investment') {
        rowClass = 'bg-blue-50';
      } else {
        rowClass = 'bg-red-50';
      }
    }
    const row = document.createElement('tr');
    const personDisplay = t.category === 'Credit Given' ? t.personName : '-';
    row.className = rowClass;
    row.innerHTML = `
      <td class="px-4 py-2 border-b text-sm">${new Date(
        t.date
      ).toLocaleDateString()}</td>
      <td class="px-4 py-2 border-b text-sm">${capitalizeFirstLetter(
        t.type
      )}</td>
      <td class="px-4 py-2 border-b text-sm">${t.account}</td>
      <td class="px-4 py-2 border-b text-sm">${t.category}</td>
      <td class="px-4 py-2 border-b text-sm">${personDisplay}</td>
      <td class="px-4 py-2 border-b text-sm">MAD${t.amount.toFixed(2)}</td>
      <td class="px-4 py-2 border-b text-sm">
        <button class="edit-btn px-2 py-1 bg-blue-500 text-white rounded mr-2" data-id="${
          t.id
        }">Edit</button>
        <button class="delete-btn px-2 py-1 bg-red-500 text-white rounded" data-id="${
          t.id
        }">Delete</button>
      </td>
    `;
    transactionTableBody.appendChild(row);

    // Attach Edit event
    row.querySelector('.edit-btn').addEventListener('click', function () {
      window.editTransaction(t.id);
    });
    // Attach Delete event
    row.querySelector('.delete-btn').addEventListener('click', function () {
      if (confirm('Are you sure you want to delete this transaction?')) {
        firestoreDeleteTransaction(t.id).then(() => {
          refreshTransactions();
        });
      }
    });
  });

  // Update totals by account
  updateTotalsByAccount(filteredTransactions);
  // Update net earnings by account (net = income - expense)
  updateNetEarningByAccount(filteredTransactions);

  // Update charts
  updateIncomeExpenseChart(filteredTransactions);
  updateIncomeChart(filteredTransactions);
  updateFinanceChart(filteredTransactions);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// -----------------------
// Update Net Earnings by Account Function
// -----------------------
function updateNetEarningByAccount(filteredTransactions) {
  const incomeByAcc = {};
  const expenseByAcc = {};

  filteredTransactions.forEach((t) => {
    if (t.type === 'income') {
      incomeByAcc[t.account] = (incomeByAcc[t.account] || 0) + t.amount;
    } else if (t.type === 'expense') {
      // Only count expenses that are not Credit Given or Crypto Investment
      if (t.category !== 'Credit Given' && t.category !== 'Crypto Investment') {
        expenseByAcc[t.account] = (expenseByAcc[t.account] || 0) + t.amount;
      }
    }
  });

  // Get the union of all accounts
  const allAccounts = new Set([
    ...Object.keys(incomeByAcc),
    ...Object.keys(expenseByAcc),
  ]);

  const netByAcc = {};
  allAccounts.forEach((acc) => {
    const income = incomeByAcc[acc] || 0;
    const expense = expenseByAcc[acc] || 0;
    // Net Earnings by account: income - expense
    netByAcc[acc] = income - expense;
  });

  // Update the net earnings by account section (HTML element with ID 'netEarningByAccount')
  const netEarningByAccountEl = document.getElementById('netEarningByAccount');
  netEarningByAccountEl.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  for (const acc in netByAcc) {
    const card = document.createElement('div');
    card.className = 'rounded-xl p-4 shadow bg-indigo-500 text-white';
    card.innerHTML = `<div class="font-bold text-lg">${acc}</div>
                      <div class="text-sm">MAD ${netByAcc[acc].toFixed(
                        2
                      )}</div>`;
    container.appendChild(card);
  }
  netEarningByAccountEl.appendChild(container);
}

// -----------------------
// Update Totals by Account (Split: Income, Expense, Credit Given, Crypto Investment)
// -----------------------
function updateTotalsByAccount(filteredTransactions) {
  const incomeByAcc = {};
  const expenseByAcc = {};
  const creditGivenByAcc = {};
  const cryptoInvestmentByAcc = {};

  filteredTransactions.forEach((t) => {
    if (t.type === 'income') {
      incomeByAcc[t.account] = (incomeByAcc[t.account] || 0) + t.amount;
    } else if (t.type === 'expense') {
      if (t.category === 'Credit Given') {
        creditGivenByAcc[t.account] =
          (creditGivenByAcc[t.account] || 0) + t.amount;
      } else if (t.category === 'Crypto Investment') {
        cryptoInvestmentByAcc[t.account] =
          (cryptoInvestmentByAcc[t.account] || 0) + t.amount;
      } else {
        expenseByAcc[t.account] = (expenseByAcc[t.account] || 0) + t.amount;
      }
    }
  });

  // Update Income by Account Section
  incomeByAccountEl.innerHTML = '';
  const incomeContainer = document.createElement('div');
  incomeContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  for (const acc in incomeByAcc) {
    const card = document.createElement('div');
    card.className = 'rounded-xl p-4 shadow bg-green-500 text-white';
    card.innerHTML = `<div class="font-bold text-lg">${acc}</div>
                      <div class="text-sm">MAD ${incomeByAcc[acc].toFixed(
                        2
                      )}</div>`;
    incomeContainer.appendChild(card);
  }
  incomeByAccountEl.appendChild(incomeContainer);

  // Update Expense by Account Section (excluding Credit Given and Crypto Investment)
  expenseByAccountEl.innerHTML = '';
  const expenseContainer = document.createElement('div');
  expenseContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  for (const acc in expenseByAcc) {
    const card = document.createElement('div');
    card.className = 'rounded-xl p-4 shadow bg-red-500 text-white';
    card.innerHTML = `<div class="font-bold text-lg">${acc}</div>
                      <div class="text-sm">MAD ${expenseByAcc[acc].toFixed(
                        2
                      )}</div>`;
    expenseContainer.appendChild(card);
  }
  expenseByAccountEl.appendChild(expenseContainer);

  // Update Credit Given by Account Section
  creditGivenByAccountEl.innerHTML = '';
  const creditContainer = document.createElement('div');
  creditContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  for (const acc in creditGivenByAcc) {
    const card = document.createElement('div');
    card.className = 'rounded-xl p-4 shadow text-white';
    card.style.backgroundColor = '#F59E0B'; // Tailwind yellow-500 hex color
    card.innerHTML = `<div class="font-bold text-lg">${acc}</div>
                      <div class="text-sm">MAD ${creditGivenByAcc[acc].toFixed(
                        2
                      )}</div>`;
    creditContainer.appendChild(card);
  }
  creditGivenByAccountEl.appendChild(creditContainer);

  // Update Crypto Investment by Account Section
  cryptoInvestmentByAccountEl.innerHTML = '';
  const cryptoContainer = document.createElement('div');
  cryptoContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  for (const acc in cryptoInvestmentByAcc) {
    const card = document.createElement('div');
    card.className = 'rounded-xl p-4 shadow bg-blue-500 text-white';
    card.innerHTML = `<div class="font-bold text-lg">${acc}</div>
                      <div class="text-sm">MAD ${cryptoInvestmentByAcc[
                        acc
                      ].toFixed(2)}</div>`;
    cryptoContainer.appendChild(card);
  }
  cryptoInvestmentByAccountEl.appendChild(cryptoContainer);
}

// -----------------------
// Handle Form Submission for Transactions
// -----------------------
addTransactionForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  console.log('Form submitted.');

  let type = document.querySelector('input[name="type"]:checked').value;
  let amount = document.getElementById('amount').value;
  let account = document.getElementById('account').value;
  let category = categorySelect.value;
  if (category === 'Other') {
    const customCat = otherCategoryInput.value.trim();
    if (customCat === '') {
      alert('Please specify the category.');
      return;
    }
    category = customCat;
  }
  let personName = '';
  if (type === 'expense' && category === 'Credit Given') {
    personName = personNameInput.value.trim();
    if (personName === '') {
      alert('Please enter the person’s name for a Credit Given transaction.');
      return;
    }
  }
  // Use today's date in ISO format (YYYY-MM-DD)
  const date = new Date().toISOString().split('T')[0];

  const transaction = {
    type,
    amount: parseFloat(amount),
    category,
    account,
    personName:
      type === 'expense' && category === 'Credit Given' ? personName : '',
    date,
  };

  try {
    if (currentEditId) {
      await firestoreUpdateTransaction(currentEditId, transaction);
      currentEditId = null;
      addTransactionForm.querySelector("button[type='submit']").innerText =
        'Add Transaction';
    } else {
      await firestoreAddTransaction(transaction);
    }
    addTransactionForm.reset();
    personNameField.style.display = 'none';
    otherCategoryField.style.display = 'none';
    await refreshTransactions();
  } catch (error) {
    console.error('Error saving transaction:', error);
  }
});

// -----------------------
// Global Functions for Editing and Deleting Transactions
// -----------------------
window.editTransaction = function (transactionId) {
  const transaction = transactions.find((t) => t.id === transactionId);
  if (!transaction) return;
  document.querySelector(
    `input[name="type"][value="${transaction.type}"]`
  ).checked = true;
  populateCategoryDropdown();
  document.getElementById('amount').value = transaction.amount;
  document.getElementById('account').value = transaction.account;
  const currentType = transaction.type;
  const options =
    currentType === 'income' ? incomeCategories : expenseCategories;
  if (
    options.includes(transaction.category) ||
    transaction.category === 'Credit Given' ||
    transaction.category === 'Crypto Investment'
  ) {
    categorySelect.value = transaction.category;
    otherCategoryField.style.display = 'none';
    otherCategoryInput.value = '';
    otherCategoryInput.removeAttribute('required');
  } else {
    categorySelect.value = 'Other';
    otherCategoryField.style.display = 'block';
    otherCategoryInput.value = transaction.category;
    otherCategoryInput.setAttribute('required', 'required');
  }
  if (
    transaction.type === 'expense' &&
    transaction.category === 'Credit Given'
  ) {
    personNameField.style.display = 'block';
    personNameInput.value = transaction.personName;
    personNameInput.setAttribute('required', 'required');
  } else {
    personNameField.style.display = 'none';
    personNameInput.value = '';
    personNameInput.removeAttribute('required');
  }
  currentEditId = transaction.id;
  addTransactionForm.querySelector("button[type='submit']").innerText =
    'Update Transaction';
};

window.removeTransaction = async function (transactionId) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    await firestoreDeleteTransaction(transactionId);
    await refreshTransactions();
  }
};

// Listen for month filter changes
monthFilter.addEventListener('change', updateUI);

// Also listen for the additional filter controls
if (filterType) filterType.addEventListener('change', updateUI);
if (filterAccount) filterAccount.addEventListener('change', updateUI);
if (filterCategory) filterCategory.addEventListener('change', updateUI);

// Initialize the app by refreshing transactions (only if signed in)
refreshTransactions();

// -----------------------
// Chart Initialization and Update Functions (Chart.js)
// -----------------------
let incomeExpenseChart = new Chart(
  document.getElementById('incomeExpenseChart').getContext('2d'),
  {
    type: 'bar',
    data: {
      labels: ['Income', 'Expense', 'Credit Given', 'Crypto Investment'],
      datasets: [
        {
          label: 'Amount (MAD)',
          data: [0, 0, 0, 0],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)', // Income
            'rgba(255, 99, 132, 0.6)', // Expense
            'rgba(255, 205, 86, 0.6)', // Credit Given
            'rgba(54, 162, 235, 0.6)', // Crypto Investment
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(54, 162, 235, 1)',
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } },
      },
      plugins: { legend: { display: false } },
    },
  }
);

let incomeChart = new Chart(
  document.getElementById('incomeChart').getContext('2d'),
  {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
  }
);

let financeChart = new Chart(
  document.getElementById('financeChart').getContext('2d'),
  {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 10 } },
        },
      },
    },
  }
);

// -----------------------
// Chart Update Functions
// -----------------------
function updateIncomeExpenseChart(filteredTransactions) {
  const income = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = filteredTransactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.category !== 'Credit Given' &&
        t.category !== 'Crypto Investment'
    )
    .reduce((sum, t) => sum + t.amount, 0);
  const creditGiven = filteredTransactions
    .filter((t) => t.type === 'expense' && t.category === 'Credit Given')
    .reduce((sum, t) => sum + t.amount, 0);
  const cryptoInvestment = filteredTransactions
    .filter((t) => t.type === 'expense' && t.category === 'Crypto Investment')
    .reduce((sum, t) => sum + t.amount, 0);
  incomeExpenseChart.data.datasets[0].data = [
    income,
    expense,
    creditGiven,
    cryptoInvestment,
  ];
  incomeExpenseChart.update();
}

function updateIncomeChart(filteredTransactions) {
  const incomeData = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  incomeChart.data.labels = Object.keys(incomeData);
  incomeChart.data.datasets[0].data = Object.values(incomeData);
  incomeChart.data.datasets[0].backgroundColor = incomeChart.data.labels.map(
    (_, index) => {
      const hue = (index * 45 + 30) % 360;
      return `hsl(${hue}, 70%, 70%)`;
    }
  );
  incomeChart.update();
}

function updateFinanceChart(filteredTransactions) {
  const expenseData = filteredTransactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        t.category !== 'Credit Given' &&
        t.category !== 'Crypto Investment'
    )
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  financeChart.data.labels = Object.keys(expenseData);
  financeChart.data.datasets[0].data = Object.values(expenseData);
  financeChart.data.datasets[0].backgroundColor = financeChart.data.labels.map(
    (_, index) => {
      const hue = (index * 45) % 360;
      return `hsl(${hue}, 70%, 70%)`;
    }
  );
  financeChart.update();
}
