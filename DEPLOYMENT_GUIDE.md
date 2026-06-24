# BudgetBuddy Frontend - Deployment Guide

## Quick Start (3 Steps)

### Step 1: Verify Backend Configuration
Your frontend is already configured to use: `https://budget-buddy-backend-pq10.onrender.com`

✅ No additional configuration needed!

### Step 2: Choose Your Hosting Platform

#### Option A: Vercel (Recommended - Fastest)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project directory
vercel

# Answer prompts:
# - Link to existing project? → No (if first time)
# - Set project name → budget-buddy-frontend
# - Default settings → Yes
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=.
```

#### Option C: GitHub Pages
```bash
# Push to GitHub main branch
git push origin frontend-error-analysis
git checkout main
git merge frontend-error-analysis
git push origin main

# Go to GitHub repo → Settings → Pages
# Select: Source = main branch
# Wait for build to complete
```

### Step 3: Test Your Live App
1. Visit your deployed URL (e.g., https://budget-buddy-frontend.vercel.app)
2. Click "Create one" to register
3. Complete the registration form
4. You should be redirected to dashboard

## Testing After Deployment

### Test Registration
```
Email: test@example.com
Password: Test1234!
Full Name: Test User
```

### Test Features
- [ ] Login/Register works
- [ ] Dashboard loads with data
- [ ] Can add a transaction
- [ ] Can create a savings goal
- [ ] Loan calculator works
- [ ] Investment simulator works
- [ ] Avatar upload works
- [ ] Dark mode toggle works
- [ ] Logout works

## Troubleshooting

### Issue: "Network error" on registration
**Solution**: This happens on localhost due to CORS. Once deployed to production (Vercel, Netlify, etc.), it will work.

### Issue: "Cannot find backend"
**Solution**: Verify `api.js` line 5 shows:
```javascript
const API_BASE_URL = window.API_BASE_URL || 'https://budget-buddy-backend-pq10.onrender.com';
```

### Issue: Avatar upload not working
**Possible causes**:
- Backend endpoint `/api/v1/users/avatar` not responding
- File size too large
- File format not supported (use jpg, png, gif)

### Issue: Dashboard shows no data
**Steps to fix**:
1. Open DevTools (F12)
2. Go to Console tab
3. Create a transaction and check for errors
4. Go to Network tab and verify API calls are reaching backend
5. Check localStorage in Application tab

## Environment Variables (if needed)

Create a `.env.local` file (optional - already configured):
```
VITE_API_URL=https://budget-buddy-backend-pq10.onrender.com
```

## Performance Tips

1. **Enable Compression**: Most hosting platforms do this automatically
2. **Cache Strategy**: Static assets are cached by browsers
3. **CDN**: Vercel/Netlify provide global CDN by default
4. **Lazy Loading**: Images are loaded on demand

## Security Checklist

- [x] API uses HTTPS (backend is on Render)
- [x] JWT tokens stored securely (httpOnly not needed for this app)
- [x] Passwords never logged or stored in localStorage
- [x] CSRF protection via token-based auth
- [x] Session timeout after inactivity (30 minutes default)
- [ ] Consider HTTPS-only mode in production

## Monitoring

After deployment, monitor:
- **Uptime**: Check if site loads consistently
- **Performance**: Use Lighthouse in DevTools
- **Errors**: Check browser console for JavaScript errors
- **API Health**: Monitor backend response times

## Rollback Instructions

If something goes wrong:

### Vercel
```bash
vercel rollback
```

### Netlify
Go to Netlify Dashboard → Deploys → select previous deploy

### GitHub Pages
Push previous commit or use GitHub deployment history

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Netlify Documentation: https://docs.netlify.com
- GitHub Pages: https://pages.github.com
- Budget-Buddy Backend: https://budget-buddy-backend-pq10.onrender.com/api/docs

## Success! 🚀

Your app is deployed and live! Share the URL with others and start tracking finances together.

---

**Quick Deploy Link**: 
1. Vercel: `vercel` (from project directory)
2. Netlify: `netlify deploy --prod --dir=.`
3. GitHub Pages: Push to main and enable in Settings

Good luck! 🎉
