# BudgetBuddy - All Pages Overview

## 🏠 Landing Page
- **URL:** `http://localhost:8000/` or `index.html`
- **Purpose:** App introduction, feature showcase, call-to-action
- **Features:**
  - Hero section with value proposition
  - 4 feature cards (Analytics, Goals, AI Coach, Security)
  - 4 overview cards (Categories, CSV Export, Loan Calculator, Emergency Fund)
  - Professional footer with team credits (Lethokuhle Lunga, Samson Peter Zock)
- **Actions:** Login button, Register button

---

## 🔐 Authentication Pages

### Login Page
- **URL:** `http://localhost:8000/login.html`
- **Purpose:** User sign-in
- **Features:**
  - Email validation
  - Password input
  - Error messages with user feedback
  - Rate limiting (1 second between attempts)
  - Auto-fill remembered email
  - Session timeout management
  - XSS protection via input sanitization

### Register Page
- **URL:** `http://localhost:8000/register.html`
- **Purpose:** New user account creation
- **Features:**
  - Full name input
  - Email validation
  - Strong password validation (8+ chars, uppercase, lowercase, number, special char)
  - Real-time validation feedback
  - Rate limiting
  - Input sanitization
  - No password storage in localStorage

---

## 📊 Main Dashboard Pages

### 1. Dashboard
- **URL:** `http://localhost:8000/dashboard.html`
- **Purpose:** Financial overview & analytics
- **Features:**
  - Total balance display
  - Income vs expense cards
  - Monthly trends chart (Chart.js)
  - Category breakdown pie chart
  - Recent transactions list
  - Savings goals progress
  - Dark/light theme toggle
  - Responsive design

### 2. Transactions
- **URL:** `http://localhost:8000/transactions.html`
- **Purpose:** View, manage, and track all transactions
- **Features:**
  - Transaction table with date, category, amount, type
  - Add new transaction form
  - Edit transaction functionality
  - Delete transaction with confirmation
  - Filter by type (Income/Expense)
  - Filter by category
  - Search functionality
  - CSV export option
  - Mobile-responsive table

### 3. Wallet
- **URL:** `http://localhost:8000/wallet.html`
- **Purpose:** Account balance and summary
- **Features:**
  - Current balance display
  - Account overview
  - Recent transactions preview
  - Spending trends visualization
  - Quick action buttons

### 4. Goals
- **URL:** `http://localhost:8000/goals.html`
- **Purpose:** Savings goals tracking
- **Features:**
  - Create new goal form
  - Goal name, target amount, deadline
  - Progress bars for each goal
  - Add funds to goals
  - Goal status (Active/Completed/Paused)
  - Goal details display
  - Progress percentage calculation

### 5. Reports
- **URL:** `http://localhost:8000/reports.html`
- **Purpose:** Financial analytics and reporting
- **Features:**
  - Monthly financial report
  - Category breakdown analysis
  - Income vs expense trends
  - Customizable date range selection
  - Chart visualizations
  - PDF export capability
  - Spending analytics

### 6. Settings
- **URL:** `http://localhost:8000/settings.html`
- **Purpose:** User preferences and configuration
- **Features:**
  - Theme selection (Light/Dark mode)
  - Currency selection
  - Category management (add/edit/delete)
  - Budget limits configuration
  - Notification preferences
  - Export user data

### 7. Profile
- **URL:** `http://localhost:8000/profile.html`
- **Purpose:** User account management
- **Features:**
  - Display user information
  - Edit full name and email
  - Change password
  - Account security settings
  - Delete account option
  - User profile photo (optional)

### 8. AI Assistant
- **URL:** `http://localhost:8000/ai-assistant.html`
- **Purpose:** AI-powered financial coaching
- **Features:**
  - Chat interface
  - Financial advice chatbot
  - Budget recommendations
  - Spending analysis insights
  - Message history
  - Smart financial tips
  - Goal-based suggestions

---

## 🔧 Technical Details

### Security Features Implemented
✅ Input sanitization to prevent XSS attacks  
✅ Email validation with regex  
✅ Strong password requirements  
✅ Rate limiting on form submissions (1 second cooldown)  
✅ Session timeout (30 minutes inactivity)  
✅ JWT token-based authentication  
✅ No password storage in localStorage  
✅ Standardized error handling  
✅ User-friendly error messages  

### Data Persistence
- **Client-side:** LocalStorage for user data, transactions, goals
- **Backend:** Ready for integration with backend API (28 endpoints specified)

### Responsive Design
- Mobile: 320px - 640px (tested)
- Tablet: 641px - 1024px
- Desktop: 1025px+ (optimized)

### Browser Support
- Chrome/Chromium
- Firefox
- Safari
- Edge
- Mobile browsers

---

## 📱 How to Access Pages

### Local Development
```
http://localhost:8000/
http://localhost:8000/login.html
http://localhost:8000/register.html
http://localhost:8000/dashboard.html
http://localhost:8000/transactions.html
http://localhost:8000/wallet.html
http://localhost:8000/goals.html
http://localhost:8000/reports.html
http://localhost:8000/settings.html
http://localhost:8000/profile.html
http://localhost:8000/ai-assistant.html
```

### To Run Locally
```bash
# Terminal 1: Start Python server
cd c:\Users\User\Desktop\BudgetBuddy_Live
python -m http.server 8000

# Then open browser to http://localhost:8000
```

---

## 🎨 Design System

### Colors
- **Primary:** #E3201D (Red)
- **Background Light:** #F7F5F3
- **Background Dark:** #0F172A
- **Text Primary:** #102A43
- **Text Secondary:** #475569

### Fonts
- **Family:** Inter, Arial, sans-serif
- **Size:** 16px base

### Components
- Buttons with hover states
- Cards with subtle shadows
- Input fields with validation feedback
- Modal dialogs for confirmations
- Toast notifications
- Tables with sorting/filtering
- Charts (Chart.js integration)

---

## ✅ Testing Checklist

- [x] All pages load without errors
- [x] Forms validate correctly
- [x] Error messages display properly
- [x] Dark mode works on all pages
- [x] Mobile responsive design
- [x] Footer displays on all pages with team credits
- [x] Security features implemented
- [x] Axios integration ready for backend

---

## 📦 File Structure

```
BudgetBuddy_Live/
├── index.html (Landing page)
├── login.html
├── register.html
├── dashboard.html
├── transactions.html
├── wallet.html
├── goals.html
├── reports.html
├── settings.html
├── profile.html
├── ai-assistant.html
├── style.css (Global styles)
├── Javascript.js (Shared utilities + security functions)
├── login.js (Login logic)
├── register.js (Registration logic)
├── ai-assistant.js (AI assistant logic)
├── firebase-config.js (Firebase configuration)
├── manifest.json (PWA manifest)
├── service-worker.js (Offline support)
├── Backend/ (Documentation for backend team)
├── icons/ (PWA icons)
├── DESIGN_ASSETS/ (UI designs)
└── Demo_Videos_Presentations_Results/
    ├── Demo_Videos/
    ├── Presentations/
    └── App_Results/
```

---

## 🚀 Next Steps

1. **For Backend Team:** See Backend/README.md for 28 API endpoints to implement
2. **For Deployment:** Choose hosting (Netlify, Vercel, GitHub Pages, Firebase)
3. **For Demo:** Record screen captures of each page and save to Demo_Videos/
4. **For Presentation:** Add presentation slides to Presentations/ folder
5. **For Results:** Document app results and metrics in App_Results/ folder

---

**Last Updated:** June 21, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
