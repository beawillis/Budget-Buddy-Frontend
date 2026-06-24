// BudgetBuddy API Layer
// Centralizes all backend API calls with auth token management.
// Set window.API_BASE_URL before this script loads to override the default.

// Temporary CORS proxy for development - will be removed once backend CORS is configured
const API_BASE_URL = window.API_BASE_URL || 'https://cors-anywhere.herokuapp.com/https://budget-buddy-backend-pq10.onrender.com';

const api = (() => {
  const TOKEN_KEY = 'budgetBuddyAuthToken';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  async function request(method, path, body, extraHeaders) {
    const url = API_BASE_URL + path;
    const opts = {
      method,
      headers: Object.assign(authHeaders(), extraHeaders || {}),
    };
    if (body && method !== 'GET') {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (res.status === 401) {
      clearToken();
      localStorage.setItem('budgetBuddyLoggedIn', 'false');
      window.location.href = 'login.html';
      throw new Error('Session expired');
    }
    return res;
  }

  async function json(method, path, body) {
    const res = await request(method, path, body);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      const error = new Error(err.message || 'Request failed');
      error.status = res.status;
      error.data = err;
      throw error;
    }
    return res.json();
  }

  // --- Auth ---
  async function register(name, email, password) {
    const url = API_BASE_URL + '/api/v1/auth/register';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Registration failed'), { status: res.status, data });
    if (data.token) setToken(data.token);
    return data;
  }

  async function login(email, password) {
    const url = API_BASE_URL + '/api/v1/auth/login';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Login failed'), { status: res.status, data });
    if (data.token) setToken(data.token);
    return data;
  }

  // --- Users ---
  function getProfile() { return json('GET', '/api/v1/users/profile'); }
  function updateProfile(body) { return json('PUT', '/api/v1/users/profile', body); }

  async function uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = getToken();
    const res = await fetch(API_BASE_URL + '/api/v1/users/avatar', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: formData,
    });
    if (res.status === 401) {
      clearToken();
      localStorage.setItem('budgetBuddyLoggedIn', 'false');
      window.location.href = 'login.html';
      throw new Error('Session expired');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Upload failed');
    }
    return res.json();
  }

  // --- Transactions ---
  function getTransactions() { return json('GET', '/api/v1/transactions'); }
  function createTransaction(body) { return json('POST', '/api/v1/transactions', body); }
  function deleteTransaction(id) { return json('DELETE', '/api/v1/transactions/' + id); }

  // --- Wallet ---
  function getWalletSummary() { return json('GET', '/api/v1/wallet/summary'); }

  // --- Categories ---
  function getCategories() { return json('GET', '/api/v1/categories'); }
  function createCategory(name) { return json('POST', '/api/v1/categories', { name }); }
  function deleteCategory(id) { return json('DELETE', '/api/v1/categories/' + id); }

  // --- Dashboard ---
  function getDashboard() { return json('GET', '/api/v1/dashboard'); }

  // --- Goals ---
  function getGoals() { return json('GET', '/api/v1/goals'); }
  function createGoal(body) { return json('POST', '/api/v1/goals', body); }
  function depositGoal(id, amount) { return json('POST', '/api/v1/goals/' + id + '/deposit', { amount }); }

  // --- Challenge ---
  function startChallenge(expense) { return json('POST', '/api/v1/challenge/start', { expense }); }
  function getChallenge() { return json('GET', '/api/v1/challenge'); }

  // --- Emergency ---
  function getEmergency() { return json('GET', '/api/v1/emergency'); }

  // --- Savings ---
  function startSavings(target) { return json('POST', '/api/v1/savings/start', { target }); }
  function depositSavings(amount) { return json('POST', '/api/v1/savings/deposit', { amount }); }
  function getSavingsStatus() { return json('GET', '/api/v1/savings/status'); }

  // --- Loans ---
  function calculateLoan(amount, interestRate, term) {
    return json('POST', '/api/v1/loans/calculate', { amount, interestRate, term });
  }
  function saveLoan(amount, interestRate, term, monthlyPayment) {
    return json('POST', '/api/v1/loans/save', { amount, interestRate, term, monthlyPayment });
  }

  // --- Investments ---
  function simulateInvestment(amount, years, rate) {
    return json('POST', '/api/v1/investments/simulate', { amount, years, rate });
  }

  // --- Notifications ---
  function getNotifications() { return json('GET', '/api/v1/notifications'); }

  // --- Reports ---
  async function exportReport() {
    const res = await request('GET', '/api/v1/reports/export');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(err.message || 'Export failed');
    }
    return res.blob();
  }

  // --- Analytics ---
  function getAnalytics() { return json('GET', '/api/v1/analytics/summary'); }

  // --- Assistant ---
  function chatAssistant(message) { return json('POST', '/api/v1/assistant/chat', { message }); }

  return {
    getToken, setToken, clearToken,
    register, login,
    getProfile, updateProfile, uploadAvatar,
    getTransactions, createTransaction, deleteTransaction,
    getWalletSummary,
    getCategories, createCategory, deleteCategory,
    getDashboard,
    getGoals, createGoal, depositGoal,
    startChallenge, getChallenge,
    getEmergency,
    startSavings, depositSavings, getSavingsStatus,
    calculateLoan, saveLoan,
    simulateInvestment,
    getNotifications,
    exportReport,
    getAnalytics,
    chatAssistant,
  };
})();
