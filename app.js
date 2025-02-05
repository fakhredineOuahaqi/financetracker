// Wrap all JavaScript code inside an event listener
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM fully loaded and parsed.');

  // Initialize transactions array and editing state
  let transactions = [];
  let currentEditId = null;

  // Define separate category arrays for income and expense
  const incomeCategories = [
    'Social Media',
    'Airbnb',
    'Agyweb',
    'Udemy',
    'iLearnCode',
    'Other',
  ];
  const expenseCategories = [
    'Credit Given',
    'Work Expense',
    'Leisure',
    'Crypto Investment',
    'Other',
  ];

  // Get references to form elements
  const typeRadios = document.querySelectorAll('input[name="type"]');
  const categorySelect = document.getElementById('category');
  const monthFilter = document.getElementById('monthFilter');
  const addTransactionForm = document.getElementById('addTransactionForm');
  const incomeTotalElement = document.getElementById('incomeTotal');
  const expenseTotalElement = document.getElementById('expenseTotal');
  const transactionTableBody = document.getElementById('transactionTableBody');
  const totalsByAccountElement = document.getElementById('totalsByAccount');
  const totalsByCategoryElement = document.getElementById('totalsByCategory');
  const personNameField = document.getElementById('personNameField');
  const personNameInput = document.getElementById('personName');
  const otherCategoryField = document.getElementById('otherCategoryField');
  const otherCategoryInput = document.getElementById('otherCategory');

  // Helper: Populate the category dropdown based on selected type
  function populateCategoryDropdown() {
    categorySelect.innerHTML = '';
    const selectedType = document.querySelector(
      'input[name="type"]:checked'
    ).value;
    const options =
      selectedType === 'income' ? incomeCategories : expenseCategories;
    options.forEach((opt) => {
      let optionEl = document.createElement('option');
      optionEl.value = opt;
      optionEl.textContent = opt;
      categorySelect.appendChild(optionEl);
    });
    // Trigger change to adjust dependent fields
    categorySelect.dispatchEvent(new Event('change'));
  }

  // When transaction type changes, repopulate category dropdown and hide custom fields
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

  // Listen for changes on the category dropdown to show/hide dependent fields
  categorySelect.addEventListener('change', function () {
    if (this.value === 'Credit Given') {
      // For expense "Credit Given", show Person's Name field
      personNameField.style.display = 'block';
      personNameInput.setAttribute('required', 'required');
      otherCategoryField.style.display = 'none';
      otherCategoryInput.value = '';
      otherCategoryInput.removeAttribute('required');
    } else if (this.value === 'Other') {
      // Show custom category input
      otherCategoryField.style.display = 'block';
      otherCategoryInput.setAttribute('required', 'required');
      personNameField.style.display = 'none';
      personNameInput.value = '';
      personNameInput.removeAttribute('required');
    } else {
      // Hide both custom fields
      personNameField.style.display = 'none';
      personNameInput.value = '';
      personNameInput.removeAttribute('required');
      otherCategoryField.style.display = 'none';
      otherCategoryInput.value = '';
      otherCategoryInput.removeAttribute('required');
    }
  });

  // Helper: Format a date to YYYY-MM using local time
  function formatDateToMonth(date) {
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    return year + '-' + (month < 10 ? '0' + month : month);
  }

  // Populate Month Filter
  function populateMonthFilter() {
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      let date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1
      );
      let monthYear = date.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });
      let option = document.createElement('option');
      option.value = formatDateToMonth(date);
      option.textContent = monthYear;
      monthFilter.appendChild(option);
    }
  }
  populateMonthFilter();

  // Function to add a transaction (assigns a unique id)
  function addTransaction(type, amount, category, account, personName, date) {
    let transaction = {
      id: Date.now(),
      type: type,
      amount: parseFloat(amount),
      category: category,
      account: account,
      personName:
        type === 'expense' && category === 'Credit Given' ? personName : '',
      date: date || new Date(),
    };
    transactions.push(transaction);
    console.log('Transaction added:', transaction);
    updateUI();
    saveTransactions();
  }

  // Function to calculate totals for a given type
  function calculateTotal(type, filteredTransactions) {
    return filteredTransactions
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0)
      .toFixed(2);
  }

  // Calculate totals by a field (account or category)
  function calculateTotalsBy(field, filteredTransactions) {
    return filteredTransactions.reduce((acc, t) => {
      let key = t[field];
      let amount = t.amount * (t.type === 'income' ? 1 : -1);
      acc[key] = (acc[key] || 0) + amount;
      return acc;
    }, {});
  }

  // Initialize the Doughnut Chart for Expense Breakdown
  let doughnutCtx = document.getElementById('financeChart').getContext('2d');
  let financeChart = new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
        },
      ],
    },
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
  });

  // Initialize the Doughnut Chart for Income Breakdown
  let incomeChartCtx = document.getElementById('incomeChart').getContext('2d');
  let incomeChart = new Chart(incomeChartCtx, {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
        },
      ],
    },
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
  });

  // Initialize the Bar Chart (Income vs Expense)
  let incomeExpenseCtx = document
    .getElementById('incomeExpenseChart')
    .getContext('2d');
  let incomeExpenseChart = new Chart(incomeExpenseCtx, {
    type: 'bar',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [
        {
          label: 'Amount (MAD)',
          data: [0, 0],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
          ],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
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
  });

  // Update the Bar Chart (Income vs Expense)
  function updateIncomeExpenseChart(filteredTransactions) {
    let income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    let expense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    incomeExpenseChart.data.datasets[0].data = [income, expense];
    incomeExpenseChart.update();
  }

  // Update the Income Breakdown Chart
  function updateIncomeChart(filteredTransactions) {
    let incomeData = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});
    incomeChart.data.labels = Object.keys(incomeData);
    incomeChart.data.datasets[0].data = Object.values(incomeData);
    incomeChart.data.datasets[0].backgroundColor = incomeChart.data.labels.map(
      (_, index) => {
        let hue = (index * 45 + 30) % 360;
        return `hsl(${hue}, 70%, 70%)`;
      }
    );
    incomeChart.update();
  }

  // Creative updateTotalsBy function for creative cards design
  function updateTotalsBy(field, element, filteredTransactions) {
    let totals = calculateTotalsBy(field, filteredTransactions);
    element.innerHTML = '';
    let container = document.createElement('div');
    container.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    for (let key in totals) {
      let amount = totals[key].toFixed(2);
      let sign = amount >= 0 ? '+' : '-';
      let card = document.createElement('div');
      card.className = 'rounded-xl p-4 shadow text-white';
      if (field === 'account') {
        card.classList.add(
          'bg-gradient-to-r',
          'from-blue-500',
          'to-indigo-500'
        );
      } else {
        card.classList.add(
          'bg-gradient-to-r',
          'from-purple-500',
          'to-pink-500'
        );
      }
      card.innerHTML = `
          <div class="font-bold text-lg">${key}</div>
          <div class="text-sm">${sign} MAD ${Math.abs(amount)}</div>
        `;
      container.appendChild(card);
    }
    element.appendChild(container);
  }

  // Update UI: table, totals, and charts
  function updateUI() {
    let selectedMonth = monthFilter.value;
    let filteredTransactions = transactions.filter((t) => {
      return formatDateToMonth(new Date(t.date)) === selectedMonth;
    });
    console.log('Updating UI. Selected month:', selectedMonth);
    console.log('Filtered transactions:', filteredTransactions);

    incomeTotalElement.innerText =
      'MAD' + calculateTotal('income', filteredTransactions);
    expenseTotalElement.innerText =
      'MAD' + calculateTotal('expense', filteredTransactions);

    transactionTableBody.innerHTML = '';
    filteredTransactions.forEach((t) => {
      let rowClass = t.type === 'income' ? 'bg-green-50' : 'bg-red-50';
      let row = document.createElement('tr');
      row.className = rowClass;
      let personDisplay = t.category === 'Credit Given' ? t.personName : '-';
      row.innerHTML = `
          <td class="px-4 py-2 border-b text-sm">${new Date(
            t.date
          ).toLocaleDateString()}</td>
          <td class="px-4 py-2 border-b text-sm">${
            t.type.charAt(0).toUpperCase() + t.type.slice(1)
          }</td>
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

      // Edit button event
      row.querySelector('.edit-btn').addEventListener('click', function () {
        document.querySelector(
          `input[name="type"][value="${t.type}"]`
        ).checked = true;
        populateCategoryDropdown();
        document.getElementById('amount').value = t.amount;
        document.getElementById('account').value = t.account;
        const currentType = t.type;
        let options =
          currentType === 'income' ? incomeCategories : expenseCategories;
        if (options.includes(t.category)) {
          categorySelect.value = t.category;
          otherCategoryField.style.display = 'none';
          otherCategoryInput.value = '';
          otherCategoryInput.removeAttribute('required');
        } else {
          categorySelect.value = 'Other';
          otherCategoryField.style.display = 'block';
          otherCategoryInput.value = t.category;
          otherCategoryInput.setAttribute('required', 'required');
        }
        if (t.type === 'expense' && t.category === 'Credit Given') {
          personNameField.style.display = 'block';
          personNameInput.value = t.personName;
          personNameInput.setAttribute('required', 'required');
        } else {
          personNameField.style.display = 'none';
          personNameInput.value = '';
          personNameInput.removeAttribute('required');
        }
        currentEditId = t.id;
        document.querySelector(
          "#addTransactionForm button[type='submit']"
        ).innerText = 'Update Transaction';
      });

      // Delete button event
      row.querySelector('.delete-btn').addEventListener('click', function () {
        if (confirm('Are you sure you want to delete this transaction?')) {
          transactions = transactions.filter(
            (transaction) => transaction.id !== t.id
          );
          updateUI();
          saveTransactions();
        }
      });
    });

    updateTotalsBy('account', totalsByAccountElement, filteredTransactions);
    updateTotalsBy('category', totalsByCategoryElement, filteredTransactions);

    let expenseData = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {});
    financeChart.data.labels = Object.keys(expenseData);
    financeChart.data.datasets[0].data = Object.values(expenseData);
    financeChart.data.datasets[0].backgroundColor =
      financeChart.data.labels.map((_, index) => {
        let hue = (index * 45) % 360;
        return `hsl(${hue}, 70%, 70%)`;
      });
    financeChart.update();

    updateIncomeChart(filteredTransactions);
    updateIncomeExpenseChart(filteredTransactions);
  }

  // Capitalize first letter helper
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Handle form submission
  addTransactionForm.addEventListener('submit', function (event) {
    event.preventDefault();
    console.log('Form submitted.');

    let type = document.querySelector('input[name="type"]:checked').value;
    let amount = document.getElementById('amount').value;
    let account = document.getElementById('account').value;
    let category = categorySelect.value;
    if (category === 'Other') {
      let customCat = otherCategoryInput.value.trim();
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
    console.log('Form values:', {
      type,
      amount,
      category,
      account,
      personName,
    });

    if (parseFloat(amount) > 0 && category && account) {
      if (currentEditId) {
        let index = transactions.findIndex((t) => t.id === currentEditId);
        if (index !== -1) {
          transactions[index].type = type;
          transactions[index].amount = parseFloat(amount);
          transactions[index].category = category;
          transactions[index].account = account;
          transactions[index].personName =
            type === 'expense' && category === 'Credit Given' ? personName : '';
          transactions[index].date = new Date();
        }
        currentEditId = null;
        document.querySelector(
          "#addTransactionForm button[type='submit']"
        ).innerText = 'Add Transaction';
      } else {
        addTransaction(type, amount, category, account, personName);
      }
      addTransactionForm.reset();
      personNameField.style.display = 'none';
      otherCategoryField.style.display = 'none';
      updateUI();
      saveTransactions();
    } else {
      console.log('Invalid form values. Transaction not added.');
    }
  });

  // Listen for month filter change
  monthFilter.addEventListener('change', updateUI);

  // Save transactions to localStorage
  function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }

  // Load transactions from localStorage
  function loadTransactions() {
    let savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) {
      transactions = JSON.parse(savedTransactions);
    }
  }

  // Initialize app
  loadTransactions();
  populateCategoryDropdown();
  monthFilter.value = formatDateToMonth(new Date());
  updateUI();
});
