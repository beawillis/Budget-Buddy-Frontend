# BudgetBuddy - Smart Finance Dashboard

A modern, lightweight web application for personal finance management. Track spending, set goals, and make better financial decisions.

## ✨ Features

- 👤 **User Authentication** - Secure login and registration
- 📊 **Dashboard** - Overview of income, expenses, and balance
- 💰 **Transactions** - Track all income and expense transactions
- 🎯 **Goals** - Set and monitor savings goals
- 💼 **Wallet** - View account balance and summary
- 📈 **Reports** - Detailed financial analytics and trends
- 🤖 **AI Assistant** - Financial coaching and advice
- ⚙️ **Settings** - Customize preferences and categories
- 👥 **Profile** - Manage account information
- 🌙 **Dark Mode** - Light and dark theme support
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Option 1: Open Directly in Browser
```
1. Navigate to the BudgetBuddy_Live folder
2. Double-click index.html
3. Click "Register" to create an account
4. Start using the app!
```

### Option 2: Run with Local Server
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx http-server
```
Then visit: `http://localhost:8000`

## 📁 Project Structure

```
BudgetBuddy_Live/
├── index.html, login.html, register.html   # Auth pages
├── dashboard.html, transactions.html        # Main features
├── wallet.html, goals.html                  # Financial management
├── reports.html, settings.html              # Analytics & config
├── profile.html, ai-assistant.html          # User & AI features
│
├── style.css                                # Styling
├── Javascript.js, login.js, register.js     # Core logic
├── ai-assistant.js                          # AI logic
│
├── firebase-config.js                       # Firebase (optional)
├── manifest.json, service-worker.js         # PWA support
├── icons/, DESIGN_ASSETS/                   # Assets
├── Backend/                                 # API documentation
└── README.md                                # This file
```

## 💻 Pages

| Page | Purpose |
|------|---------|
| **Landing** | Home & entry point |
| **Login/Register** | User authentication |
| **Dashboard** | Financial overview & charts |
| **Transactions** | Track income/expenses |
| **Wallet** | Account balance & summary |
| **Goals** | Savings goals tracker |
| **Reports** | Financial analytics |
| **Settings** | Preferences & categories |
| **Profile** | Account management |
| **AI Assistant** | Financial coaching |

## 🛠️ Technology

- **Frontend:** HTML5, CSS3, JavaScript
- **Charts:** Chart.js
- **HTTP:** Axios
- **PWA:** Service Workers
- **Optional Backend:** API-ready

## 📊 Data Storage

- **Local Storage:** Browser-based persistence
- **Optional Firebase:** Cloud sync & backup
- **Secure:** Encrypted sensitive data

## 🔐 Security Features

- Secure password validation (8+ chars, mixed case, numbers, special chars)
- Email format validation
- LocalStorage encryption
- Optional Firebase Authentication
- HTTPS ready

## 🚀 Deployment

Deploy to any static hosting:

- **GitHub Pages** - Free, easy
- **Netlify** - Drag and drop
- **Vercel** - One-click deploy
- **Firebase Hosting** - Google's platform
- **AWS S3** - Enterprise option

## ⚙️ Configuration

### Enable Firebase (Optional)
Edit `firebase-config.js`:
```javascript
const FIREBASE_ENABLED = true;
// Add your Firebase credentials
```

### Change API Endpoint
Edit `Javascript.js`:
```javascript
const API_BASE_URL = "https://your-api.com";
```

## 📦 Backend Integration

For backend developers, all documentation is in the **`Backend/`** folder:
- Complete API specifications
- 28 required endpoints
- Data models
- Integration guides

## 📝 File Reference

| File | Purpose |
|------|---------|
| `index.html` | Landing page |
| `login.html, register.html` | Authentication |
| `dashboard.html` | Main dashboard |
| `transactions.html` | Transaction management |
| `wallet.html` | Account overview |
| `goals.html` | Goals tracker |
| `reports.html` | Financial reports |
| `settings.html` | Preferences |
| `profile.html` | User profile |
| `ai-assistant.html` | AI coach |
| `style.css` | All styling |
| `Javascript.js` | Main logic |
| `login.js, register.js` | Auth logic |
| `ai-assistant.js` | AI logic |

## 🎨 Customize

### Change Theme Colors
Edit `style.css`:
```css
:root {
  --primary-color: #3B82F6;
  --secondary-color: #F59E0B;
}
```

### Add Categories
Go to Settings → Categories

### Adjust Settings
Edit `Javascript.js` constants

## 🐛 Troubleshooting

**Data not saving?**
- Enable localStorage in browser
- Clear cache and reload
- Try different browser

**Charts not showing?**
- Check browser console for errors
- Verify Chart.js loaded
- Check data format

**Can't login?**
- Check password requirements
- Clear cookies
- Disable extensions

## 📄 Version

- **Current:** 1.0
- **Last Updated:** June 2024

## 🤝 Support

- Check Backend documentation
- Review code comments
- Check browser console

---

**Ready to manage your finances? Start BudgetBuddy today!** 🚀
