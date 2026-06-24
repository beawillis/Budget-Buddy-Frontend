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

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

function sanitizeEmail(email) {
  return email.toLowerCase().trim();
}

function validateNumericInput(value, min = 0, max = 999999999) {
  if (!value || isNaN(value)) return false;
  const num = parseFloat(value);
  return num >= min && num <= max;
}

function validateTransactionAmount(amount) {
  if (!amount || isNaN(amount)) return false;
  const num = parseFloat(amount);
  if (num <= 0 || num > 999999999) return false;
  if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) return false;
  return true;
}

async function handleApiError(error, context = '') {
  let errorMessage = 'An error occurred';
  let statusCode = 0;

  if (error.response) {
    statusCode = error.response.status;
    errorMessage = error.response.data?.message || error.response.statusText || 'Request failed';
    console.warn('API Error [' + statusCode + '] in ' + context + ':', errorMessage);
  } else if (error.request) {
    errorMessage = 'Network error. Please check your internet connection.';
    console.warn('Network error in ' + context);
  } else {
    console.warn('Error in ' + context + ':', error.message);
  }

  return { status: statusCode, message: errorMessage };
}

const submitThrottler = {
  lastSubmitTime: 0,
  COOLDOWN: 1000,
  isReady() {
    const now = Date.now();
    if (now - this.lastSubmitTime < this.COOLDOWN) return false;
    this.lastSubmitTime = now;
    return true;
  },
  reset() {
    this.lastSubmitTime = 0;
  }
};

const sessionManager = {
  TIMEOUT: 30 * 60 * 1000,
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
  }
};

// ===== HELPER: check if user has a backend token =====
function hasBackendToken() {
  return !!api.getToken();
}

// ===== FIREBASE FUNCTIONS =====

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

    refreshAllUI();
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
    try { await firebaseAuth.signOut(); } catch { /* ignore */ }
  }
}

// ===== AUTH / SESSION =====

async function logout() {
  await firebaseLogout();
  api.clearToken();
  localStorage.setItem(STORAGE_KEYS.loggedIn, 'false');
  window.location.href = 'login.html';
}

function getStoredUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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

// ===== THEME =====

function applyTheme() {
  const theme = localStorage.getItem(STORAGE_KEYS.theme);
  document.body.classList.toggle('dark-mode', theme === 'dark');
}

function toggleDarkMode() {
  const theme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  applyTheme();
  showNotification('Switched to ' + theme + ' mode.');
  if (hasBackendToken()) {
    api.updateProfile({ theme }).catch(() => {});
  }
}

// ===== NOTIFICATIONS UI =====

function showNotification(message) {
  const note = document.getElementById('notification');
  if (!note) return;
  note.textContent = message;
  note.style.display = 'block';
  note.style.opacity = '1';

  clearTimeout(note.hideTimeout);
  note.hideTimeout = setTimeout(() => {
    note.style.opacity = '0';
    note.hideTimeout = setTimeout(() => { note.style.display = 'none'; }, 250);
  }, 2200);
}

// ===== LOCAL STORAGE HELPERS =====

function saveTransactionsLocal() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  syncFirestoreAppState().catch(() => {});
}

function saveGoalsLocal() {
  localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
  syncFirestoreAppState().catch(() => {});
}

function saveCategoriesLocal(items) {
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

function saveUserProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile));
  if (window.FIREBASE_ENABLED && firebaseDb && currentUserId) {
    syncFirestoreUserProfile(profile).catch(() => {});
  }
}

// ===== BACKEND DATA LOADING =====

async function loadBackendData() {
  if (!hasBackendToken()) return;

  try {
    const [txData, goalData, catData] = await Promise.all([
      api.getTransactions().catch(() => null),
      api.getGoals().catch(() => null),
      api.getCategories().catch(() => null),
    ]);

    if (txData) {
      transactions = Array.isArray(txData) ? txData : (txData.transactions || txData.data || []);
      saveTransactionsLocal();
    }
    if (goalData) {
      goals = Array.isArray(goalData) ? goalData : (goalData.goals || goalData.data || []);
      saveGoalsLocal();
    }
    if (catData) {
      const catArr = Array.isArray(catData) ? catData : (catData.categories || catData.data || []);
      categories = catArr.map(function(c) { return typeof c === 'string' ? c : c.name; });
      saveCategoriesLocal(categories);
    }
  } catch (err) {
    console.warn('Backend data load failed:', err);
  }

  // Load additional backend data in parallel
  try {
    const [challengeData, profileData] = await Promise.all([
      api.getChallenge().catch(() => null),
      api.getProfile().catch(() => null),
    ]);

    if (challengeData) {
      savingsChallenge = challengeData;
      saveChallenge(savingsChallenge);
    }

    if (profileData) {
      const user = getStoredUser() || {};
      user.name = profileData.name || user.name;
      user.email = profileData.email || user.email;
      user.uid = profileData._id || user.uid;
      if (profileData.avatar && profileData.avatar.url) {
        user.photo = profileData.avatar.url;
      }
      if (profileData.theme) {
        localStorage.setItem(STORAGE_KEYS.theme, profileData.theme);
      }
      saveUserProfile(user);
    }
  } catch (err) {
    console.warn('Secondary backend data load failed:', err);
  }
}

// ===== CALCULATIONS =====

function calculateTotals() {
  const totals = transactions.reduce(
    function(acc, item) {
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

  if (balanceEl) balanceEl.textContent = 'R' + balance.toFixed(2);
  if (incomeEl) incomeEl.textContent = 'R' + totals.income.toFixed(2);
  if (expenseEl) expenseEl.textContent = 'R' + totals.expense.toFixed(2);
  if (incomeReport) incomeReport.textContent = 'R' + totals.income.toFixed(2);
  if (expenseReport) expenseReport.textContent = 'R' + totals.expense.toFixed(2);

  return totals;
}

// ===== TRANSACTIONS =====

function renderTransactions() {
  const list = document.getElementById('transactionList');
  if (!list) return;

  list.innerHTML = '';

  if (!transactions.length) {
    list.innerHTML = '<li class="empty">No transactions yet.</li>';
    return;
  }

  transactions.slice().reverse().forEach(function(transaction, reversedIndex) {
    const originalIndex = transactions.length - 1 - reversedIndex;
    const txId = transaction._id || null;
    const item = document.createElement('li');
    item.innerHTML =
      '<div class="transaction-line">' +
        '<div>' +
          '<strong>' + (transaction.type === 'income' ? 'Income' : 'Expense') + '</strong> ' +
          '<span>R' + Number(transaction.amount).toFixed(2) + '</span> ' +
          '<span class="transaction-meta">' + (transaction.category || 'General') + ' &bull; ' + new Date(transaction.date).toLocaleDateString() + '</span>' +
        '</div>' +
        '<button type="button" onclick="deleteTransaction(' + originalIndex + ', \'' + (txId || '') + '\')">Remove</button>' +
      '</div>';
    list.appendChild(item);
  });
}

async function addTransaction(type, amount) {
  var amountInput = document.getElementById('transactionAmount');
  var categorySelect = document.getElementById('transactionCategory');
  var effectiveAmount = amount || Number(amountInput?.value || 0);
  var category = categorySelect?.value || 'General';

  if (!effectiveAmount || effectiveAmount <= 0) {
    showNotification('Enter a valid amount to continue.');
    return;
  }

  var newTx = {
    type: type,
    amount: effectiveAmount,
    category: category,
    date: new Date().toISOString(),
  };

  if (hasBackendToken()) {
    try {
      var created = await api.createTransaction(newTx);
      transactions.push(created);
    } catch (err) {
      showNotification('Failed to save: ' + err.message);
      transactions.push(newTx);
    }
  } else {
    transactions.push(newTx);
  }

  saveTransactionsLocal();
  renderTransactions();
  renderChart();
  renderTrendChart();
  updateEmergencyProgress();
  updateHealthScore();
  trackSavingsChallenge(type, effectiveAmount, category);
  showNotification((type === 'income' ? 'Income' : 'Expense') + ' added.');
  if (amountInput) amountInput.value = '';
}

function addIncome(amount) {
  addTransaction('income', amount || 0);
}

function addExpense(amount) {
  addTransaction('expense', amount || 0);
}

async function deleteTransaction(index, txId) {
  if (index < 0 || index >= transactions.length) return;

  if (hasBackendToken() && txId) {
    try {
      await api.deleteTransaction(txId);
    } catch (err) {
      showNotification('Failed to delete: ' + err.message);
      return;
    }
  }

  transactions.splice(index, 1);
  saveTransactionsLocal();
  renderTransactions();
  renderChart();
  renderTrendChart();
  updateEmergencyProgress();
  updateHealthScore();
  showNotification('Transaction removed.');
}

// ===== GOALS =====

function renderGoals() {
  const list = document.getElementById('goalList');
  if (!list) return;

  list.innerHTML = '';

  if (!goals.length) {
    list.innerHTML = '<li class="empty">No savings goals yet.</li>';
    return;
  }

  goals.forEach(function(goal, index) {
    const saved = Number(goal.saved || goal.progress || 0);
    const percent = goal.target ? Math.min(100, (saved / goal.target) * 100) : 0;
    const goalId = goal._id || '';
    const item = document.createElement('li');
    item.className = 'goal-item';
    item.innerHTML =
      '<div class="goal-item-header">' +
        '<div>' +
          '<strong>' + goal.name + '</strong> ' +
          '<span>Target R' + Number(goal.target).toFixed(2) + '</span>' +
        '</div>' +
        '<button type="button" onclick="removeGoal(' + index + ', \'' + goalId + '\')">Remove</button>' +
      '</div>' +
      '<div class="progress-bar small">' +
        '<div class="progress-fill" style="width: ' + percent + '%"></div>' +
      '</div>' +
      '<div class="goal-meta">' +
        '<span>' + percent.toFixed(0) + '% funded</span>' +
      '</div>' +
      '<div class="goal-item-actions">' +
        '<input type="number" id="goalDeposit-' + index + '" placeholder="Deposit amount" min="1">' +
        '<button type="button" onclick="addGoalContribution(' + index + ', \'' + goalId + '\')">Deposit</button>' +
      '</div>';
    list.appendChild(item);
  });
}

async function addGoal() {
  const name = document.getElementById('goalName')?.value.trim();
  const target = Number(document.getElementById('goalAmount')?.value || 0);

  if (!name || !target) {
    showNotification('Provide a goal name and amount.');
    return;
  }

  if (hasBackendToken()) {
    try {
      const created = await api.createGoal({ name: name, target: target });
      goals.push(created);
    } catch (err) {
      showNotification('Failed to save goal: ' + err.message);
      goals.push({ name: name, target: target, saved: 0, progress: 0, created: new Date().toISOString() });
    }
  } else {
    goals.push({ name: name, target: target, saved: 0, progress: 0, created: new Date().toISOString() });
  }

  saveGoalsLocal();
  renderGoals();
  renderGoalProgress();
  document.getElementById('goalName').value = '';
  document.getElementById('goalAmount').value = '';
  showNotification('Goal saved successfully.');
}

async function addGoalContribution(index, goalId) {
  const input = document.getElementById('goalDeposit-' + index);
  const amount = Number(input?.value || 0);
  if (!amount || amount <= 0) {
    showNotification('Enter a valid goal deposit amount.');
    return;
  }

  const goal = goals[index];
  if (!goal) return;

  if (hasBackendToken() && goalId) {
    try {
      const updated = await api.depositGoal(goalId, amount);
      goal.saved = updated.saved || (Number(goal.saved || 0) + amount);
      goal.progress = goal.saved;
      if (updated.status === 'completed') {
        showNotification('Goal "' + goal.name + '" is complete!');
      }
    } catch (err) {
      showNotification('Deposit failed: ' + err.message);
      return;
    }
  } else {
    goal.progress = Number(goal.progress || 0) + amount;
    goal.saved = goal.progress;
    if (goal.progress >= goal.target) {
      goal.progress = goal.target;
      goal.saved = goal.target;
      showNotification('Goal "' + goal.name + '" is complete!');
    }
  }

  saveGoalsLocal();
  renderGoals();
  renderGoalProgress();
  if (input) input.value = '';
}

function removeGoal(index, goalId) {
  if (index < 0 || index >= goals.length) return;
  goals.splice(index, 1);
  saveGoalsLocal();
  renderGoals();
  renderGoalProgress();
  showNotification('Goal removed.');
}

// ===== CHARTS =====

function renderChart() {
  const canvas = document.getElementById('financeChart');
  if (!canvas || !window.Chart) return;

  if (activeChart) activeChart.destroy();

  const totals = calculateTotals();

  activeChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{
        data: [totals.income, totals.expense],
        backgroundColor: ['#16a34a', '#dc2626'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#334155' } } },
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

  const labels = months.map(function(month) { return month.toLocaleString('default', { month: 'short' }); });
  const incomeData = months.map(function() { return 0; });
  const expenseData = months.map(function() { return 0; });

  transactions.forEach(function(transaction) {
    const date = new Date(transaction.date);
    months.forEach(function(month, idx) {
      if (date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()) {
        if (transaction.type === 'income') incomeData[idx] += Number(transaction.amount);
        if (transaction.type === 'expense') expenseData[idx] += Number(transaction.amount);
      }
    });
  });

  activeTrendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Income', data: incomeData, borderColor: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.2)', tension: 0.35, fill: true },
        { label: 'Expenses', data: expenseData, borderColor: '#dc2626', backgroundColor: 'rgba(220, 38, 38, 0.18)', tension: 0.35, fill: true },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#334155' }, grid: { display: false } },
        y: { ticks: { color: '#334155' }, grid: { color: 'rgba(226,232,240,0.5)' } },
      },
      plugins: { legend: { labels: { color: '#334155' } } },
    },
  });
}

// ===== REPORTS / EXPORT =====

async function exportPDF() {
  if (hasBackendToken()) {
    try {
      const blob = await api.exportReport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'BudgetBuddy-report.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('PDF report downloaded.');
      return;
    } catch (err) {
      console.warn('Backend PDF export failed, falling back to local:', err.message);
    }
  }

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
    transactions.forEach(function(transaction, index) {
      doc.setFontSize(12);
      doc.text((index + 1) + '. ' + transaction.type.toUpperCase() + ' — R' + Number(transaction.amount).toFixed(2) + ' (' + transaction.category + ')', 14, y);
      y += 10;
      if (y > 280) { doc.addPage(); y = 20; }
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
  transactions.forEach(function(transaction) {
    csvRows.push(transaction.type + ',' + transaction.amount + ',' + (transaction.category || 'General') + ',' + transaction.date);
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

// ===== PROFILE / AVATAR =====

async function uploadProfilePicture(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  if (hasBackendToken()) {
    try {
      const data = await api.uploadAvatar(file);
      const profile = getStoredUser() || {};
      if (data.avatar && data.avatar.url) {
        profile.photo = data.avatar.url;
      }
      profile.name = data.name || profile.name;
      saveUserProfile(profile);
      const avatar = document.getElementById('profileAvatar');
      const avatarLarge = document.getElementById('profileAvatarLarge');
      if (avatar && profile.photo) avatar.src = profile.photo;
      if (avatarLarge && profile.photo) avatarLarge.src = profile.photo;
      showNotification('Profile picture updated.');
      return;
    } catch (err) {
      console.warn('Backend avatar upload failed, using local fallback:', err.message);
    }
  }

  const reader = new FileReader();
  reader.onload = function() {
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
  if (aiGreeting) aiGreeting.textContent = 'Hello, ' + (user.name || 'BudgetBuddy User') + ' — ask me anything about your budget or savings.';

  const profileLoadedEvent = new CustomEvent('profileLoaded', { detail: user });
  window.dispatchEvent(profileLoadedEvent);
}

// ===== REMINDERS =====

function addReminder() {
  const name = document.getElementById('reminderName')?.value.trim();
  const date = document.getElementById('reminderDate')?.value;
  if (!name || !date) {
    showNotification('Enter a bill name and due date.');
    return;
  }

  reminders.push({ name: name, date: date, created: new Date().toISOString() });
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

  reminders.forEach(function(item, index) {
    const li = document.createElement('li');
    li.innerHTML =
      '<span>' + item.name + ' — ' + new Date(item.date).toLocaleDateString() + '</span>' +
      '<button type="button" onclick="deleteReminder(' + index + ')">Remove</button>';
    list.appendChild(li);
  });
}

// ===== CATEGORIES =====

function renderCategories() {
  const list = document.getElementById('categoryList');
  const select = document.getElementById('transactionCategory');
  if (list) {
    list.innerHTML = '';
    if (!categories.length) {
      list.innerHTML = '<li class="empty">No categories yet.</li>';
    } else {
      categories.forEach(function(category, index) {
        const catName = typeof category === 'string' ? category : category.name;
        const catId = (typeof category === 'object' && category._id) ? category._id : '';
        const li = document.createElement('li');
        li.innerHTML =
          '<span>' + catName + '</span>' +
          '<button type="button" onclick="deleteCategory(' + index + ', \'' + catId + '\')">Remove</button>';
        list.appendChild(li);
      });
    }
  }

  if (select) {
    select.innerHTML = '<option value="General">General</option>' +
      categories.map(function(category) {
        const catName = typeof category === 'string' ? category : category.name;
        return '<option value="' + catName + '">' + catName + '</option>';
      }).join('');
  }
}

async function addCategory() {
  const name = document.getElementById('categoryName')?.value.trim();
  if (!name) {
    showNotification('Enter a category name.');
    return;
  }

  if (hasBackendToken()) {
    try {
      var created = await api.createCategory(name);
      categories.push(created.name || name);
    } catch (err) {
      showNotification('Failed to save category: ' + err.message);
      categories.push(name);
    }
  } else {
    categories.push(name);
  }

  saveCategoriesLocal(categories);
  renderCategories();
  updateWalletSummary();
  document.getElementById('categoryName').value = '';
  showNotification('Category added.');
}

async function deleteCategory(index, catId) {
  if (index < 0 || index >= categories.length) return;

  if (hasBackendToken() && catId) {
    try {
      await api.deleteCategory(catId);
    } catch (err) {
      showNotification('Failed to delete category: ' + err.message);
      return;
    }
  }

  categories.splice(index, 1);
  saveCategoriesLocal(categories);
  renderCategories();
  updateWalletSummary();
  showNotification('Category removed.');
}

// ===== SAVINGS CHALLENGE =====

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
  summary.textContent = 'Savings challenge: R' + saved.toFixed(2) + ' of R' + target.toFixed(2) + ' (' + percent.toFixed(0) + '%).';
}

async function startSavingsChallenge() {
  const expense = calculateTotals().expense;
  const target = Math.max(1000, expense * 0.25);

  if (hasBackendToken()) {
    try {
      const data = await api.startChallenge(expense);
      savingsChallenge = data;
      saveChallenge(savingsChallenge);
      renderSavingsChallenge();
      showNotification('Savings challenge started — add more deposits this week!');
      return;
    } catch (err) {
      console.warn('Backend challenge start failed:', err.message);
    }
  }

  savingsChallenge = {
    started: new Date().toISOString(),
    status: 'active',
    saved: 0,
    target: target,
  };
  saveChallenge(savingsChallenge);
  renderSavingsChallenge();
  showNotification('Savings challenge started — add more deposits this week!');
}

// ===== EMERGENCY FUND =====

async function updateEmergencyProgress() {
  let target, achieved, percent;

  if (hasBackendToken()) {
    try {
      const data = await api.getEmergency();
      target = data.target || 0;
      achieved = data.available || 0;
      percent = data.progress || 0;
    } catch (err) {
      // fallback to local calc
      const totals = calculateTotals();
      target = Math.max(3000, totals.expense * 3);
      achieved = Math.min(totals.income, target);
      percent = target === 0 ? 0 : Math.min(100, (achieved / target) * 100);
    }
  } else {
    const totals = calculateTotals();
    target = Math.max(3000, totals.expense * 3);
    achieved = Math.min(totals.income, target);
    percent = target === 0 ? 0 : Math.min(100, (achieved / target) * 100);
  }

  const bar = document.getElementById('emergencyProgress');
  const percentText = document.getElementById('emergencyPercent');
  const summary = document.getElementById('emergencySummary');

  if (bar) bar.style.width = percent + '%';
  if (percentText) percentText.textContent = Math.round(percent) + '%';
  if (summary) summary.textContent = 'Emergency target: R' + Number(target).toFixed(2) + ' — ' + Math.round(percent) + '% funded.';
}

// ===== HEALTH SCORE =====

function updateHealthScore() {
  const totals = calculateTotals();
  const ratio = totals.income > 0 ? Math.max(0, Math.min(1, (totals.income - totals.expense) / totals.income)) : 0;
  const goalBonus = Math.min(20, goals.length * 3);
  const score = Math.min(100, Math.round((ratio * 70) + 30 + goalBonus));
  const scoreEl = document.getElementById('healthScore');
  if (scoreEl) scoreEl.textContent = score + ' / 100';
}

// ===== GOAL PROGRESS =====

function renderGoalProgress() {
  const list = document.getElementById('goalProgressList');
  if (!list) return;

  list.innerHTML = '';
  if (!goals.length) {
    list.innerHTML = '<li class="empty">No goals have been added yet.</li>';
    return;
  }

  goals.forEach(function(goal) {
    const saved = Number(goal.saved || goal.progress || 0);
    const percent = goal.target ? Math.min(100, (saved / goal.target) * 100) : 0;
    const item = document.createElement('li');
    item.className = 'goal-progress-item';
    item.innerHTML =
      '<div class="goal-progress-heading">' +
        '<strong>' + goal.name + '</strong>' +
        '<span>' + percent.toFixed(0) + '%</span>' +
      '</div>' +
      '<div class="progress-bar">' +
        '<div class="progress-fill" style="width: ' + percent + '%"></div>' +
      '</div>' +
      '<p class="goal-note">Target R' + Number(goal.target).toFixed(2) + '</p>';
    list.appendChild(item);
  });
}

// ===== LOAN CALCULATOR =====

async function calculateLoan() {
  const amount = Number(document.getElementById('loanAmount')?.value || 0);
  const ratePercent = Number(document.getElementById('loanRate')?.value || 0);
  const term = Number(document.getElementById('loanTerm')?.value || 0);

  if (!amount || ratePercent <= 0 || !term) {
    showNotification('Enter loan amount, rate, and term.');
    return;
  }

  const result = document.getElementById('loanResult');

  if (hasBackendToken()) {
    try {
      const data = await api.calculateLoan(amount, ratePercent, term);
      if (result) result.textContent = 'Monthly payment: R' + Number(data.monthly).toFixed(2) + ' (Total interest: R' + Number(data.interest).toFixed(2) + ')';
      showNotification('Loan calculation completed.');
      return;
    } catch (err) {
      console.warn('Backend loan calc failed, using local:', err.message);
    }
  }

  const rate = ratePercent / 100;
  const monthlyRate = rate / 12;
  const months = term * 12;
  const payment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  const totalPaid = payment * months;
  const totalInterest = totalPaid - amount;
  if (result) result.textContent = 'Monthly payment: R' + payment.toFixed(2) + ' (Total interest: R' + totalInterest.toFixed(2) + ')';
  showNotification('Loan calculation completed.');
}

// ===== INVESTMENT SIMULATOR =====

async function simulateInvestment() {
  const amount = Number(document.getElementById('investmentAmount')?.value || 0);
  const years = Number(document.getElementById('investmentYears')?.value || 0);
  const ratePercent = Number(document.getElementById('investmentRate')?.value || 0);

  if (!amount || !years || ratePercent <= 0) {
    showNotification('Provide amount, years, and expected return.');
    return;
  }

  const result = document.getElementById('investmentResult');

  if (hasBackendToken()) {
    try {
      const data = await api.simulateInvestment(amount, years, ratePercent);
      const future = Number(data.future || data.futureValue || 0);
      const gain = future - amount;
      if (result) result.textContent = 'Projected value: R' + future.toFixed(2) + ' (Gain: R' + gain.toFixed(2) + ')';
      showNotification('Investment simulation completed.');
      return;
    } catch (err) {
      console.warn('Backend investment sim failed, using local:', err.message);
    }
  }

  const rate = ratePercent / 100;
  const future = amount * Math.pow(1 + rate, years);
  const gain = future - amount;
  if (result) result.textContent = 'Projected value: R' + future.toFixed(2) + ' (Gain: R' + gain.toFixed(2) + ')';
  showNotification('Investment simulation completed.');
}

// ===== WALLET SUMMARY =====

async function updateWalletSummary() {
  const categoryCountEl = document.getElementById('categoryCount');
  if (categoryCountEl) categoryCountEl.textContent = categories.length + ' active';

  if (hasBackendToken()) {
    try {
      const data = await api.getWalletSummary();
      const balanceEl = document.getElementById('balance');
      const incomeEl = document.getElementById('income');
      const expenseEl = document.getElementById('expense');
      if (balanceEl) balanceEl.textContent = 'R' + Number(data.balance || 0).toFixed(2);
      if (incomeEl) incomeEl.textContent = 'R' + Number(data.income || 0).toFixed(2);
      if (expenseEl) expenseEl.textContent = 'R' + Number(data.expense || 0).toFixed(2);
    } catch (err) {
      // fallback: calculateTotals already ran
    }
  }
}

// ===== NOTIFICATIONS (backend) =====

async function loadNotifications() {
  if (!hasBackendToken()) return;
  try {
    const data = await api.getNotifications();
    const notes = Array.isArray(data) ? data : [];
    const unread = notes.filter(function(n) { return !n.read; });
    if (unread.length > 0) {
      showNotification('You have ' + unread.length + ' new notification(s).');
    }
  } catch (err) {
    // notifications are non-critical
  }
}

// ===== ANALYTICS =====

async function loadAnalytics() {
  if (!hasBackendToken()) return;
  try {
    const data = await api.getAnalytics();
    const healthEl = document.getElementById('healthScore');
    if (healthEl && data.health) {
      healthEl.textContent = data.health;
    }
  } catch (err) {
    // analytics are non-critical
  }
}

// ===== REFRESH ALL UI =====

function refreshAllUI() {
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
}

// ===== PAGE INIT =====

window.addEventListener('DOMContentLoaded', async function() {
  initFirebase();
  if (window.FIREBASE_ENABLED && firebaseAuth) {
    await new Promise(function(resolve) { firebaseAuth.onAuthStateChanged(resolve); });
  }
  requireAuth();
  applyTheme();

  // Load from backend first if token exists, then refresh UI
  if (hasBackendToken() && isLoggedIn()) {
    await loadBackendData();
  }

  refreshAllUI();
  loadNotifications();
  loadAnalytics();
  sessionManager.start();

  document.getElementById('menuToggle')?.addEventListener('click', function() {
    document.getElementById('sidebar')?.classList.toggle('sidebar-open');
  });
});
