# VSCode Setup & Testing Guide for Budget Buddy

## Quick Start (2 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/beawillis/Budget-Buddy-Frontend.git
cd Budget-Buddy-Frontend
git checkout frontend-error-analysis

# 2. Start a local server (choose one)
python -m http.server 8000
# OR
npx http-server

# 3. Open in browser
# http://localhost:8000
```

---

## Step-by-Step Setup

### Step 1: Clone Repository
1. Open VSCode
2. Press `Ctrl + `` (backtick) to open terminal
3. Clone the repo:
   ```bash
   git clone https://github.com/beawillis/Budget-Buddy-Frontend.git
   cd Budget-Buddy-Frontend
   git checkout frontend-error-analysis
   ```

### Step 2: Open in VSCode
1. File → Open Folder
2. Select the `Budget-Buddy-Frontend` folder
3. Trust the workspace when asked

### Step 3: Start Dev Server

**Option A: Python (Easiest - no dependencies)**
```bash
python -m http.server 8000
```
Then open: http://localhost:8000

**Option B: Node.js HTTP Server**
```bash
npx http-server
```
Then open: http://localhost:8080

**Option C: VSCode Live Server Extension (Best)**
1. Ctrl + Shift + X → Extensions
2. Search: "Live Server"
3. Install (by Ritwick Dey)
4. Right-click `login.html` → "Open with Live Server"

---

## Project Structure

```
Budget-Buddy-Frontend/
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # Main dashboard
├── transactions.html       # Transactions page
├── wallet.html            # Wallet page
├── goals.html             # Goals page
├── api.js                 # API configuration ⭐ (already updated)
├── Javascript.js          # Main logic (all functions implemented)
├── styles.css             # Styling
├── firebase-config.js     # Firebase configuration
└── *.md                   # Documentation files
```

---

## Testing & Debugging

### Open Browser Developer Tools
- Press: `F12` or `Ctrl + Shift + I`

### Console Tab
- View `console.log()` messages
- See JavaScript errors (red)
- See warnings (yellow)

### Network Tab
- View all API calls
- Check HTTP status codes:
  - 200 = Success
  - 404 = Not found
  - 500 = Server error
  - Network error = CORS (expected on localhost)

### Sources Tab
- Set breakpoints by clicking line numbers
- Step through code
- Inspect variables

### Application Tab
- View localStorage (where auth tokens are stored)
- View cookies and session storage

---

## Testing Workflow

### Test 1: Initial Load
1. Server running: `http://localhost:8000`
2. Login page should load
3. Open DevTools (F12) → Console
4. Should see no errors (some warnings are OK)

### Test 2: Registration
1. Click "Create one" link
2. Fill in:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `Test1234!`
3. Click "Create Account"
4. Monitor Network tab (F12) to see API call
5. Should redirect to dashboard (or show error if CORS issue)

### Test 3: Dashboard Features
1. Try adding a transaction
2. Try creating a goal
3. Check loan calculator
4. Test dark mode toggle
5. Try profile picture upload

### Test 4: API Connectivity
Check Network tab (F12) to verify:
- API calls go to: `https://budget-buddy-backend-pq10.onrender.com`
- Status codes are 200 (success)
- Response data contains expected fields

---

## Common Issues & Solutions

### Issue: "Network Error" on registration
**Cause:** CORS blocking localhost  
**Solution:** This is expected in local development. Deploy to production to test.  
**Verify backend works:**
```bash
curl -X POST https://budget-buddy-backend-pq10.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"Test1234!"}'
```

### Issue: Server won't start
**Cause:** Port already in use  
**Solution:** Use different port:
```bash
python -m http.server 8001  # Use port 8001 instead
```

### Issue: Blank page / nothing loads
**Cause:** HTML files not found  
**Solution:** Verify server is running and check:
1. Terminal shows "Serving HTTP on port 8000"
2. Browser URL is exactly: `http://localhost:8000`
3. Check browser console for errors (F12)

### Issue: CSS/Images not loading
**Cause:** File path issues  
**Solution:**
1. Open DevTools (F12) → Console
2. Look for 404 errors (red)
3. Check the file paths in HTML
4. Verify files exist in project folder

### Issue: JavaScript errors
**Cause:** Missing functions or syntax errors  
**Solution:**
1. Open DevTools (F12) → Console
2. Click error to see file and line number
3. Go to that line in VSCode
4. Check syntax and function definitions

---

## Editing & Hot Reload

### If using Live Server Extension (Easiest)
1. Edit file in VSCode
2. Save (Ctrl + S)
3. Browser automatically reloads
4. See changes immediately

### If using Python/Node server
1. Edit file in VSCode
2. Save (Ctrl + S)
3. Refresh browser (F5 or Ctrl + R)
4. See changes

---

## Useful VSCode Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + `` | Open terminal |
| `Ctrl + S` | Save file |
| `Ctrl + F` | Find in file |
| `Ctrl + H` | Find & replace |
| `Ctrl + /` | Comment/uncomment |
| `Alt + Up/Down` | Move line up/down |
| `Shift + Alt + F` | Format code |

---

## Useful Browser DevTools Shortcuts

| Shortcut | Action |
|----------|--------|
| `F12` | Open DevTools |
| `Ctrl + Shift + I` | Open DevTools (alternative) |
| `Ctrl + Shift + C` | Element picker |
| `Ctrl + Shift + J` | Open Console |
| `Ctrl + Shift + E` | Open Console |
| `F5` | Refresh page |
| `Ctrl + R` | Refresh (no cache) |

---

## Recommended VSCode Extensions

1. **Live Server** (Essential)
   - Auto-reload on file save
   - Local dev server included

2. **JavaScript (ES6) code snippets**
   - Code completions
   - Quick syntax helpers

3. **Prettier**
   - Auto-format code
   - Shift + Alt + F to format

4. **REST Client**
   - Test API endpoints directly in VSCode
   - Create `.http` files to test API calls

---

## Testing with REST Client Extension

Create a file: `test-api.http`

```http
### Test Registration
POST https://budget-buddy-backend-pq10.onrender.com/api/v1/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test1234!"
}

### Test Login
POST https://budget-buddy-backend-pq10.onrender.com/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test1234!"
}
```

Right-click and select "Send Request" to test API calls!

---

## Full Testing Checklist

Local Development:
- [ ] Server running on localhost:8000
- [ ] No errors in browser console
- [ ] Login page loads correctly
- [ ] All styles are applied
- [ ] Fonts are correct

API Integration:
- [ ] API URL is production backend
- [ ] Network calls visible in DevTools
- [ ] No CORS errors (expected on localhost)
- [ ] JWT token stored in localStorage

Features:
- [ ] Registration form validates input
- [ ] Dashboard page structure visible
- [ ] Transaction buttons clickable
- [ ] Calculator pages load
- [ ] Profile section accessible

---

## Next Steps

1. Run locally with `python -m http.server 8000`
2. Test all pages by clicking through
3. Open DevTools (F12) and check Console tab
4. When satisfied, deploy to production
5. Test on production URL with real backend

---

## Need Help?

1. Check browser console (F12) for errors
2. Check Network tab (F12) for API calls
3. Look at `INTEGRATION_REPORT.md` for details
4. Check `START_HERE.md` for quick reference

You're all set! Start your local dev server and test away! 🚀
