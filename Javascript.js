const STORAGE_KEYS = {
  user: 'budgetBuddyUser',
  loggedIn: 'budgetBuddyLoggedIn',
  theme: 'budgetBuddyTheme',
  transactions: 'budgetBuddyTransactions',
  goals: 'budgetBuddyGoals',
  categories: 'budgetBuddyCategories',
  reminders: 'budgetBuddyReminders',
  challenge: 'budgetBuddyChallenge',
};

// API base URL for backend (frontend uses axios relative paths)
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000';

// Configure axios default baseURL when axios is available
if (typeof axios !== 'undefined') {
  axios.defaults.baseURL = API_BASE_URL;
}

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.transactions) || '[]');
let goals = JSON.parse(localStorage.getItem(STORAGE_KEYS.goals) || '[]');
let categories = JSON.parse(localStorage.getItem(STORAGE_KEYS.categories) || '[]');
let reminders = JSON.parse(localStorage.getItem(STORAGE_KEYS.reminders) || '[]');
let savingsChallenge = JSON.parse(localStorage.getItem(STORAGE_KEYS.challenge) || 'null');
let activeChart = null;
let activeTrendChart = null;
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let currentUserId = null;

const openPages = ['index.html', 'login.html', 'register.html', ''];

// ===== SECURITY & VALIDATION FUNCTIONS =====

/**
 * Sanitize user input to prevent XSS attacks
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Sanitize email address
 */
function sanitizeEmail(email) {
  return email.toLowerCase().trim();
}

/**
 * Validate numeric input (for amounts, ages, etc.)
 */
function validateNumericInput(value, min = 0, max = 999999999) {
  if (!value || isNaN(value)) return false;
  const num = parseFloat(value);
  return num >= min && num <= max;
}

/**
 * Validate transaction amount (currency format)
 */
function validateTransactionAmount(amount) {
  if (!amount || isNaN(amount)) return false;
  const num = parseFloat(amount);
  if (num <= 0 || num > 999999999) return false;
  // Check for max 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) return false;
  return true;
}

/**
 * Standardized API error handling
 */
async function handleApiError(error, context = '') {
  let errorMessage = 'An error occurred';
  let statusCode = 0;

  if (error.response) {
    // Backend responded with error
    statusCode = error.response.status;
    errorMessage = error.response.data?.message || error.response.statusText || 'Request failed';
    
    // Log for debugging (without sensitive data)
    console.warn(`API Error [${statusCode}] in ${context}:`, errorMessage);
  } else if (error.request) {
    // No response from backend
    errorMessage = 'Network error. Please check your internet connection.';
    console.warn(`Network error in ${context}`);
  } else {
    // Other error
    console.warn(`Error in ${context}:`, error.message);
  }

  return { status: statusCode, message: errorMessage };
}

/**
 * Prevent rapid form submissions (rate limiting)
 */
const submitThrottler = {
  lastSubmitTime: 0,
  COOLDOWN: 1000, // 1 second between submissions
  
  isReady() {
    const now = Date.now();
    if (now - this.lastSubmitTime < this.COOLDOWN) {
      return false;
    }
    this.lastSubmitTime = now;
    return true;
  },
  
  reset() {
    this.lastSubmitTime = 0;
  }
};

/**
 * Session timeout handler (30 minutes of inactivity)
 */
const sessionManager = {
  TIMEOUT: 30 * 60 * 1000, // 30 minutes
  timer: null,
  
  start() {
    this.resetTimer();
    document.addEventListener('mousedown', () => this.resetTimer());
    document.addEventListener('keypress', () => this.resetTimer());
  },
  
  resetTimer() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (isLoggedIn()) {
        logout();
        alert('Your session has expired. Please log in again.');
      }
    }, this.TIMEOUT);
  },
  
  stop() {
    clearTimeout(this.timer);
    document.removeEventListener('mousedown', () => this.resetTimer());
    document.removeEventListener('keypress', () => this.resetTimer());
  }
};

// ===== END SECURITY FUNCTIONS =====

function getUserDocRef(uid) {
  if (!firebaseDb || !uid) return null;
  return firebaseDb.collection('users').doc(uid);
}

function getAppStateDocRef(uid) {
  if (!firebaseDb || !uid) return null;
  return firebaseDb.collection('users').doc(uid).collection('appState').doc('state');
}

async function syncFirestoreAppState() {
  if (!window.FIREBASE_ENABLED || !firebaseDb || !currentUserId) return;
  const state = {
    transactions,
    goals,
    categories,
    reminders,
    challenge: savingsChallenge,
    theme: localStorage.getItem(STORAGE_KEYS.theme) || 'light',
    updatedAt: new Date().toISOString(),
  };

  const stateRef = getAppStateDocRef(currentUserId);
  if (!stateRef) return;
  try {
    await stateRef.set(state, { merge: true });
  } catch (error) {
    console.warn('Firestore state sync failed:', error);
  }
}

async function syncFirestoreUserProfile(profile) {
  if (!window.FIREBASE_ENABLED || !firebaseDb || !currentUserId) return;
  const userRef = getUserDocRef(currentUserId);
  if (!userRef) return;
  try {
    await userRef.set(
      {
        name: profile.name || profile.fullName || 'BudgetBuddy User',
        email: profile.email,
        photo: profile.photo || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Firestore profile sync failed:', error);
  }
}

async function loadFirestoreState(uid) {
  if (!window.FIREBASE_ENABLED || !firebaseDb || !uid) return;
  currentUserId = uid;
  try {
    const userRef = getUserDocRef(uid);
    const stateRef = getAppStateDocRef(uid);

    if (userRef) {
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        if (userData) {
          const profile = getStoredUser() || {};
          profile.name = userData.name || profile.name;
          profile.email = userData.email || profile.email;
          profile.photo = userData.photo || profile.photo;
          profile.uid = uid;
          localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile));
        }
      }
    }

    if (stateRef) {
      const stateSnap = await stateRef.get();
      if (stateSnap.exists) {
        const data = stateSnap.data();
        if (data) {
            transactions = Array.isArray(data.transactions) ? data.transactions : transactions;
          goals = Array.isArray(data.goals) ? data.goals : goals;
          categories = Array.isArray(data.categories) ? data.categories : categories;
          reminders = Array.isArray(data.reminders) ? data.reminders : reminders;
          savingsChallenge = data.challenge || savingsChallenge;
          if (data.theme) localStorage.setItem(STORAGE_KEYS.theme, data.theme);

          localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
          localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
          localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(categories));
          localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
          if (savingsChallenge) localStorage.setItem(STORAGE_KEYS.challenge, JSON.stringify(savingsChallenge));
        }
      }
    }

    // Refresh local UI and app widgets if the app has already rendered.
    loadUserProfile();
    renderTransactions();
    renderGoals();
    renderChart();
    renderTrendChart();
    renderGoalProgress();
    renderReminders();
    renderCategories();
    updateEmergencyProgress();
    updateHealthScore();
    renderSavingsChallenge();
    updateWalletSummary();

    const profileEvent = new CustomEvent('profileLoaded', { detail: getStoredUser() });
    window.dispatchEvent(profileEvent);
  } catch (error) {
    console.warn('Failed to load Firestore state:', error);
  }
}

function initFirebase() {
  if (!window.firebase || typeof FIREBASE_ENABLED === 'undefined' || !FIREBASE_ENABLED) return;
  if (!window.firebaseConfig) return;
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();

    firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        currentUserId = user.uid;
        await loadFirestoreState(user.uid);
      } else {
        currentUserId = null;
      }
    });
  } catch (error) {
    console.warn('Firebase init failed:', error);
  }
}

async function firebaseRegisterUser(email, password, name) {
  if (!firebaseAuth || !firebaseDb) throw new Error('Firebase is not initialized.');
  const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
  const user = userCredential.user;
  await firebaseDb.collection('users').doc(user.uid).set({ name, email, createdAt: new Date().toISOString() });
  return user;
}

async function firebaseLoginUser(email, password) {
  if (!firebaseAuth) throw new Error('Firebase is not initialized.');
  return firebaseAuth.signInWithEmailAndPassword(email, password);
}

async function firebaseLogout() {
  if (firebaseAuth) {
    try {
      await firebaseAuth.signOut();
    } catch {
      // Ignore logout error
    }
  }
}

async function logout() {
  await firebaseLogout();
  localStorage.setItem(STORAGE_KEYS.loggedIn, 'false');
  window.location.href = 'login.html';
}

function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.loggedIn) === 'true';
}

function requireAuth() {
  const currentPage = window.location.pathname.split('/').pop();
  if (openPages.includes(currentPage)) return;
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

function applyTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme);
  document.body.classList.toggle('dark-mode', theme === 'dark');
}

function toggleDarkMode() {
  const theme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  applyTheme();
  showNotification(`Switched to ${theme} mode.`);
}

function showNotification(message) {
  const note = document.getElementById('notification');
  if (!note) return;
  note.textContent = message;
  note.style.display = 'block';
  note.style.opacity = '1';

  clearTimeout(note.hideTimeout);
  note.hideTimeout = setTimeout(() => {
    note.style.opacity = '0';
    note.hideTimeout = setTimeout(() => {
      note.style.display = 'none';
    }, 250);
  }, 2200);
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  syncFirestoreAppState().catch(() => {});
}

function saveGoals() {
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  syncFirestoreAppState().catch(() => {});
}

function saveCategories(items) {
  localStorage.setItem(STORAGE_KEYS.categories, JSON.stringify(items));
  syncFirestoreAppState().catch(() => {});
}

function saveReminders(items) {
  localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(items));
  syncFirestoreAppState().catch(() => {});
}

function saveChallenge(state) {
  savingsChallenge = state;
  localStorage.setItem(STORAGE_KEYS.challenge, JSON.stringify(state));
  syncFirestoreAppState().catch(() => {});
}

function trackSavingsChallenge(type, amount, category) {
  if (!savingsChallenge || savingsChallenge.status !== 'active') return;
  if (type !== 'income' || category !== 'Savings') return;

  savingsChallenge.saved = Number(savingsChallenge.saved || 0) + Number(amount);
  savingsChallenge.lastUpdate = new Date().toISOString();
  savingsChallenge.target = Number(savingsChallenge.target || Math.max(1000, calculateTotals().expense * 0.25));

  if (savingsChallenge.saved >= savingsChallenge.target) {
    savingsChallenge.saved = savingsChallenge.target;
    savingsChallenge.status = 'completed';
    showNotification('Savings challenge completed! Great work.');
  }

  saveChallenge(savingsChallenge);
  renderSavingsChallenge();
}

function renderSavingsChallenge() {
  const summary = document.getElementById('challengeSummary');
  if (!summary) return;

  if (!savingsChallenge || savingsChallenge.status !== 'active') {
    summary.textContent = 'Complete weekly savings boosts to improve your score.';
    return;
  }

  const saved = Number(savingsChallenge.saved || 0);
  const target = Number(savingsChallenge.target || Math.max(1000, calculateTotals().expense * 0.25));
  const percent = target ? Math.min(100, (saved / target) * 100) : 0;
  summary.textContent = `Savings challenge: R${saved.toFixed(2)} of R${target.toFixed(2)} (${percent.toFixed(0)}%).`;
}

function saveUserProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile));
  if (window.FIREBASE_ENABLED && firebaseDb && currentUserId) {
    syncFirestoreUserProfile(profile).catch(() => {});
  }
}

function calculateTotals() {
  const totals = transactions.reduce(
    (acc, item) => {
      if (item.type === 'income') acc.income += Number(item.amount);
      if (item.type === 'expense') acc.expense += Number(item.amount);
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const balance = totals.income - totals.expense;

  const balanceEl = document.getElementById('balance');
  const incomeEl = document.getElementById('income');
  const expenseEl = document.getElementById('expense');
  const incomeReport = document.getElementById('incomeReport');
  const expenseReport = document.getElementById('expenseReport');

  if (balanceEl) balanceEl.textContent = `R${balance.toFixed(2)}`;
  if (incomeEl) incomeEl.textContent = `R${totals.income.toFixed(2)}`;
  if (expenseEl) expenseEl.textContent = `R${totals.expense.toFixed(2)}`;
  if (incomeReport) incomeReport.textContent = `R${totals.income.toFixed(2)}`;
  if (expenseReport) expenseReport.textContent = `R${totals.expense.toFixed(2)}`;

  return totals;
}

function renderTransactions() {
  const list = document.getElementById('transactionList');
  if (!list) return;

  list.innerHTML = '';

  if (!transactions.length) {
    list.innerHTML = '<li class="empty">No transactions yet.</li>';
    return;
  }

  transactions.slice().reverse().forEach((transaction, reversedIndex) => {
    const originalIndex = transactions.length - 1 - reversedIndex;
    const item = document.createElement('li');
    item.innerHTML = `
      <div class="transaction-line">
        <div>
          <strong>${transaction.type === 'income' ? 'Income' : 'Expense'}</strong>
          <span>R${Number(transaction.amount).toFixed(2)}</span>
          <span class="transaction-meta">${transaction.category || 'General'} • ${new Date(transaction.date).toLocaleDateString()}</span>
        </div>
        <button type="button" onclick="deleteTransaction(${originalIndex})">Remove</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderGoals() {
  const list = document.getElementById('goalList');
  if (!list) return;

  list.innerHTML = '';

  if (!goals.length) {
    list.innerHTML = '<li class="empty">No savings goals yet.</li>';
    return;
  }

  goals.forEach((goal, index) => {
    const progress = Number(goal.progress || 0);
    const percent = goal.target ? Math.min(100, (progress / goal.target) * 100) : 0;
    const item = document.createElement('li');
    item.className = 'goal-item';
    item.innerHTML = `
      <div class="goal-item-header">
        <div>
          <strong>${goal.name}</strong>
          <span>Target R${Number(goal.target).toFixed(2)}</span>
        </div>
        <button type="button" onclick="removeGoal(${index})">Remove</button>
      </div>
      <div class="progress-bar small">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="goal-meta">
        <span>${percent.toFixed(0)}% funded</span>
      </div>
      <div class="goal-item-actions">
        <input type="number" id="goalDeposit-${index}" placeholder="Deposit amount" min="1">
        <button type="button" onclick="addGoalContribution(${index})">Deposit</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderChart() {
  const canvas = document.getElementById('financeChart');
  if (!canvas || !window.Chart) return;

  if (activeChart) activeChart.destroy();

  const totals = calculateTotals();

  activeChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [
        {
          data: [totals.income, totals.expense],
          backgroundColor: ['#16a34a', '#dc2626'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#334155' },
        },
      },
    },
  });
}

function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas || !window.Chart) return;

  if (activeTrendChart) activeTrendChart.destroy();

  const months = [];
  const current = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    months.push(new Date(current.getFullYear(), current.getMonth() - i, 1));
  }

  const labels = months.map((month) => month.toLocaleString('default', { month: 'short' }));
  const incomeData = months.map(() => 0);
  const expenseData = months.map(() => 0);

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    months.forEach((month, index) => {
      if (date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()) {
        if (transaction.type === 'income') incomeData[index] += Number(transaction.amount);
        if (transaction.type === 'expense') expenseData[index] += Number(transaction.amount);
      }
    });
  });

  activeTrendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.2)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.18)',
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#334155' }, grid: { display: false } },
        y: { ticks: { color: '#334155' }, grid: { color: 'rgba(226,232,240,0.5)' } },
      },
      plugins: {
        legend: { labels: { color: '#334155' } },
      },
    },
  });
}

function addTransaction(type, amount = 0) {
  const amountInput = document.getElementById('transactionAmount');
  const categorySelect = document.getElementById('transactionCategory');
  const effectiveAmount = amount || Number(amountInput?.value || 0);
  const category = categorySelect?.value || 'General';

  if (!effectiveAmount || effectiveAmount <= 0) {
    showNotification('Enter a valid amount to continue.');
    return;
  }

  transactions.push({
    type,
    amount: effectiveAmount,
    category,
    date: new Date().toISOString(),
  });
  saveTransactions();
  renderTransactions();
  renderChart();
  renderTrendChart();
  updateEmergencyProgress();
  updateHealthScore();
  trackSavingsChallenge(type, effectiveAmount, category);
  showNotification(`${type === 'income' ? 'Income' : 'Expense'} added.`);
  if (amountInput) amountInput.value = '';
}

function addIncome(amount = 0) {
  addTransaction('income', amount);
}

function addExpense(amount = 0) {
  addTransaction('expense', amount);
}

function deleteTransaction(index) {
  if (index < 0 || index >= transactions.length) return;
  transactions.splice(index, 1);
  saveTransactions();
  renderTransactions();
  renderChart();
  renderTrendChart();
  updateEmergencyProgress();
  updateHealthScore();
  showNotification('Transaction removed.');
}

function addGoal() {
  const name = document.getElementById('goalName')?.value.trim();
  const target = Number(document.getElementById('goalAmount')?.value || 0);

  if (!name || !target) {
    showNotification('Provide a goal name and amount.');
    return;
  }

  goals.push({ name, target, progress: 0, created: new Date().toISOString() });
  saveGoals();
  renderGoals();
  renderGoalProgress();
  document.getElementById('goalName').value = '';
  document.getElementById('goalAmount').value = '';
  showNotification('Goal saved successfully.');
}

function addGoalContribution(index) {
  const input = document.getElementById(`goalDeposit-${index}`);
  const amount = Number(input?.value || 0);
  if (!amount || amount <= 0) {
    showNotification('Enter a valid goal deposit amount.');
    return;
  }

  const goal = goals[index];
  if (!goal) return;
  goal.progress = Number(goal.progress || 0) + amount;
  if (goal.progress >= goal.target) {
    goal.progress = goal.target;
    showNotification(`Goal "${goal.name}" is complete!`);
  }

  saveGoals();
  renderGoals();
  renderGoalProgress();
  if (input) input.value = '';
}

function removeGoal(index) {
  if (index < 0 || index >= goals.length) return;
  goals.splice(index, 1);
  saveGoals();
  renderGoals();
  renderGoalProgress();
  showNotification('Goal removed.');
}

function exportPDF() {
  if (!window.jspdf) {
    showNotification('PDF export is unavailable.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('BudgetBuddy Transaction Report', 14, 20);

  if (!transactions.length) {
    doc.setFontSize(12);
    doc.text('No transactions available.', 14, 30);
  } else {
    let y = 30;
    transactions.forEach((transaction, index) => {
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${transaction.type.toUpperCase()} — R${Number(transaction.amount).toFixed(2)} (${transaction.category})`, 14, y);
      y += 10;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
  }

  doc.save('BudgetBuddy-report.pdf');
}

function downloadCsv() {
  if (!transactions.length) {
    showNotification('No transactions available to export.');
    return;
  }

  const csvRows = ['Type,Amount,Category,Date'];
  transactions.forEach((transaction) => {
    csvRows.push(`${transaction.type},${transaction.amount},${transaction.category || 'General'},${transaction.date}`);
  });

  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', 'budgetbuddy-transactions.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showNotification('CSV download started.');
}

function uploadProfilePicture(event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const photo = reader.result;
    if (!photo) return;
    const profile = getStoredUser() || {};
    profile.photo = photo;
    saveUserProfile(profile);
    const avatar = document.getElementById('profileAvatar');
    const avatarLarge = document.getElementById('profileAvatarLarge');
    if (avatar) avatar.src = photo;
    if (avatarLarge) avatarLarge.src = photo;
    showNotification('Profile picture updated.');
  };
  reader.readAsDataURL(file);
}

function loadUserProfile() {
  const user = getStoredUser();
  if (!user) return;

  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const avatar = document.getElementById('profileAvatar');

  if (profileName) profileName.textContent = user.name || 'BudgetBuddy User';
  if (profileEmail) profileEmail.textContent = user.email || 'user@example.com';
  if (avatar && user.photo) avatar.src = user.photo;
  const aiGreeting = document.getElementById('aiGreeting');
  if (aiGreeting) aiGreeting.textContent = `Hello, ${user.name || 'BudgetBuddy User'} — ask me anything about your budget or savings.`;

  const profileLoadedEvent = new CustomEvent('profileLoaded', { detail: user });
  window.dispatchEvent(profileLoadedEvent);
}

function addReminder() {
  const name = document.getElementById('reminderName')?.value.trim();
  const date = document.getElementById('reminderDate')?.value;
  if (!name || !date) {
    showNotification('Enter a bill name and due date.');
    return;
  }

  reminders.push({ name, date, created: new Date().toISOString() });
  saveReminders(reminders);
  renderReminders();
  document.getElementById('reminderName').value = '';
  document.getElementById('reminderDate').value = '';
  showNotification('Bill reminder added.');
}

function deleteReminder(index) {
  if (index < 0 || index >= reminders.length) return;
  reminders.splice(index, 1);
  saveReminders(reminders);
  renderReminders();
  showNotification('Reminder removed.');
}

function renderReminders() {
  const list = document.getElementById('reminderList');
  if (!list) return;

  list.innerHTML = '';
  if (!reminders.length) {
    list.innerHTML = '<li class="empty">No reminders yet.</li>';
    return;
  }

  reminders.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${item.name} — ${new Date(item.date).toLocaleDateString()}</span>
      <button type="button" onclick="deleteReminder(${index})">Remove</button>
    `;
    list.appendChild(li);
  });
}

function renderCategories() {
  const list = document.getElementById('categoryList');
  const select = document.getElementById('transactionCategory');
  if (list) {
    list.innerHTML = '';
    if (!categories.length) {
      list.innerHTML = '<li class="empty">No categories yet.</li>';
    } else {
      categories.forEach((category, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${category}</span>
          <button type="button" onclick="deleteCategory(${index})">Remove</button>
        `;
        list.appendChild(li);
      });
    }
  }

  if (select) {
    select.innerHTML = '<option value="General">General</option>' + categories.map((category) => `<option value="${category}">${category}</option>`).join('');
  }
}

function addCategory() {
  const name = document.getElementById('categoryName')?.value.trim();
  if (!name) {
    showNotification('Enter a category name.');
    return;
  }

  categories.push(name);
  saveCategories(categories);
  renderCategories();
  updateWalletSummary();
  document.getElementById('categoryName').value = '';
  showNotification('Category added.');
}

function deleteCategory(index) {
  if (index < 0 || index >= categories.length) return;
  categories.splice(index, 1);
  saveCategories(categories);
  renderCategories();
  updateWalletSummary();
  showNotification('Category removed.');
}

function startSavingsChallenge() {
  const target = Math.max(1000, calculateTotals().expense * 0.25);
  savingsChallenge = {
    started: new Date().toISOString(),
    status: 'active',
    saved: 0,
    target,
  };
  saveChallenge(savingsChallenge);
  renderSavingsChallenge();
  showNotification('Savings challenge started — add more deposits this week!');
}

function updateEmergencyProgress() {
  const totals = calculateTotals();
  const target = Math.max(3000, totals.expense * 3);
  const achieved = Math.min(totals.income, target);
  const percent = target === 0 ? 0 : Math.min(100, (achieved / target) * 100);
  const bar = document.getElementById('emergencyProgress');
  const percentText = document.getElementById('emergencyPercent');
  const summary = document.getElementById('emergencySummary');

  if (bar) bar.style.width = `${percent}%`;
  if (percentText) percentText.textContent = `${percent.toFixed(0)}%`;
  if (summary) summary.textContent = `Emergency target: R${target.toFixed(2)} — ${percent.toFixed(0)}% funded.`;
}

function updateHealthScore() {
  const totals = calculateTotals();
  const ratio = totals.income > 0 ? Math.max(0, Math.min(1, (totals.income - totals.expense) / totals.income)) : 0;
  const goalBonus = Math.min(20, goals.length * 3);
  const score = Math.min(100, Math.round((ratio * 70) + 30 + goalBonus));
  const scoreEl = document.getElementById('healthScore');
  if (scoreEl) scoreEl.textContent = `${score} / 100`;
}

function renderGoalProgress() {
  const list = document.getElementById('goalProgressList');
  if (!list) return;

  list.innerHTML = '';
  if (!goals.length) {
    list.innerHTML = '<li class="empty">No goals have been added yet.</li>';
    return;
  }

  goals.forEach((goal) => {
    const percent = goal.target ? Math.min(100, ((goal.progress || 0) / goal.target) * 100) : 0;
    const item = document.createElement('li');
    item.className = 'goal-progress-item';
    item.innerHTML = `
      <div class="goal-progress-heading">
        <strong>${goal.name}</strong>
        <span>${percent.toFixed(0)}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent}%"></div>
      </div>
      <p class="goal-note">Target R${Number(goal.target).toFixed(2)}</p>
    `;
    list.appendChild(item);
  });
}

function calculateLoan() {
  const amount = Number(document.getElementById('loanAmount')?.value || 0);
  const rate = Number(document.getElementById('loanRate')?.value || 0) / 100;
  const term = Number(document.getElementById('loanTerm')?.value || 0);

  if (!amount || rate <= 0 || !term) {
    showNotification('Enter loan amount, rate, and term.');
    return;
  }

  const monthlyRate = rate / 12;
  const months = term * 12;
  const payment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  const totalPaid = payment * months;
  const totalInterest = totalPaid - amount;
  const result = document.getElementById('loanResult');
  if (result) result.textContent = `Monthly payment: R${payment.toFixed(2)} (Total interest: R${totalInterest.toFixed(2)})`;
  showNotification('Loan calculation completed.');
}

function simulateInvestment() {
  const amount = Number(document.getElementById('investmentAmount')?.value || 0);
  const years = Number(document.getElementById('investmentYears')?.value || 0);
  const rate = Number(document.getElementById('investmentRate')?.value || 0) / 100;

  if (!amount || !years || rate <= 0) {
    showNotification('Provide amount, years, and expected return.');
    return;
  }

  const future = amount * Math.pow(1 + rate, years);
  const gain = future - amount;
  const result = document.getElementById('investmentResult');
  if (result) result.textContent = `Projected value: R${future.toFixed(2)} (Gain: R${gain.toFixed(2)})`;
  showNotification('Investment simulation completed.');
}

window.addEventListener('DOMContentLoaded', async () => {
  initFirebase();
  if (window.FIREBASE_ENABLED && firebaseAuth) {
    await new Promise((resolve) => firebaseAuth.onAuthStateChanged(resolve));
  }
  requireAuth();
  applyTheme();
  loadUserProfile();
  renderTransactions();
  renderGoals();
  renderChart();
  renderTrendChart();
  renderGoalProgress();
  renderReminders();
  renderCategories();
  updateEmergencyProgress();
  updateHealthScore();
  renderSavingsChallenge();
  updateWalletSummary();
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('sidebar-open');
  });
});

function updateWalletSummary() {
  const categoryCountEl = document.getElementById('categoryCount');
  if (categoryCountEl) categoryCountEl.textContent = `${categories.length} active`;
}
