# 🚀 HRConnect Deployment Guide (100% Free)

## Overview
This guide will deploy your HRConnect application using completely free services:
- **Backend API**: Render.com (Free tier - 750 hours/month)
- **Frontend UI**: Vercel (Free unlimited)
- **Database**: SQLite (current) or PostgreSQL on Render (Free)

---

## 📋 Prerequisites

1. ✅ GitHub account (free)
2. ✅ Render.com account (free)
3. ✅ Vercel account (free)
4. ✅ Git installed on your computer

---

## Part 1: Push Code to GitHub

### Step 1: Initialize Git Repository

Open PowerShell in `C:\HRConnect`:

```powershell
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - HRConnect application"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create repository:
   - Name: `hrconnect`
   - Description: "HR Management System"
   - Visibility: **Private** (recommended) or Public
   - Don't initialize with README/gitignore
3. Click "Create repository"

### Step 3: Push to GitHub

```powershell
# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/hrconnect.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy Backend API to Render

### Step 1: Sign Up for Render

1. Go to https://render.com
2. Sign up with GitHub (easiest)
3. Verify your email

### Step 2: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `hrconnect`
3. Configure:
   - **Name**: `hrconnect-api`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `HRConnect.API`
   - **Runtime**: `Docker`
   - **Instance Type**: **Free**

4. **Environment Variables** (Add these):
   ```
   ASPNETCORE_ENVIRONMENT=Production
   ASPNETCORE_URLS=http://0.0.0.0:8080
   ```

5. Click **"Create Web Service"**

### Step 3: Wait for Deployment

- Initial deployment takes 5-10 minutes
- Watch the logs for completion
- You'll get a URL like: `https://hrconnect-api.onrender.com`

### Step 4: Test API

Open: `https://hrconnect-api.onrender.com/swagger`

You should see Swagger UI! 🎉

**Default Admin Login:**
- Email: admin@example.com
- Password: Admin@123

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Update Frontend API URL

Update `hrconnect-ui/.env.production`:

Create this file:

```env
VITE_API_URL=https://hrconnect-api.onrender.com
```

### Step 2: Commit Changes

```powershell
cd C:\HRConnect
git add .
git commit -m "Add production API URL"
git push
```

### Step 3: Sign Up for Vercel

1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

### Step 4: Deploy to Vercel

1. Click **"Add New Project"**
2. Import your GitHub repository: `hrconnect`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `hrconnect-ui`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://hrconnect-api.onrender.com
   ```

5. Click **"Deploy"**

### Step 5: Wait for Deployment

- Takes 2-3 minutes
- You'll get a URL like: `https://hrconnect.vercel.app`

---

## Part 4: Update CORS Settings

### Step 1: Update API CORS

Update `HRConnect.API/Program.cs`:

Change the CORS policy from:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});
```

To (replace YOUR_VERCEL_URL):

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.WithOrigins(
            "https://hrconnect.vercel.app",  // Your Vercel URL
            "http://localhost:5173"           // For local dev
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
});
```

### Step 2: Commit and Push

```powershell
git add .
git commit -m "Update CORS for production"
git push
```

Render will automatically redeploy! ✨

---

## Part 5: Testing Production Deployment

### Test Checklist:

1. ✅ **API Health**: Visit `https://hrconnect-api.onrender.com/swagger`
2. ✅ **Frontend**: Visit `https://hrconnect.vercel.app`
3. ✅ **Login**: Use admin@example.com / Admin@123
4. ✅ **Create Employee**: Add a test employee
5. ✅ **Leave Request**: Submit a leave request
6. ✅ **Approve Leave**: Test admin approval flow

---

## 🎯 Your Live URLs

After deployment:
- **Frontend**: `https://hrconnect.vercel.app`
- **Backend API**: `https://hrconnect-api.onrender.com`
- **Swagger Docs**: `https://hrconnect-api.onrender.com/swagger`

---

## ⚡ Important Notes

### **Render Free Tier Limitations:**
- ⏰ **Spins down after 15 minutes of inactivity**
- 🐌 **First request after sleep takes 30-60 seconds** (cold start)
- ⏱️ **750 hours/month** (sufficient for testing/small usage)
- 💾 **Database resets on redeploy** (with SQLite)

### **Vercel Free Tier:**
- ✅ **Always instant** (no cold starts)
- ✅ **Unlimited bandwidth** for personal projects
- ✅ **100 GB bandwidth/month**
- ✅ **Custom domains** supported

---

## 🔧 Maintenance & Updates

### To Deploy Updates:

```powershell
# 1. Make your changes
# 2. Commit
git add .
git commit -m "Your update message"

# 3. Push to GitHub
git push

# Both Render and Vercel auto-deploy! 🎉
```

---

## 🆙 Upgrade to Paid (Optional)

**If you need better performance later:**

### Render ($7/month):
- No cold starts
- 24/7 uptime
- Persistent database
- More resources

### Vercel (Free is usually enough):
- Free tier covers most needs
- Pro: $20/month for teams

---

## 🐛 Troubleshooting

### Issue: API Returns 500 Error

**Solution:**
1. Check Render logs: Dashboard → Logs
2. Look for errors in deployment
3. Check environment variables

### Issue: Frontend Can't Connect to API

**Solution:**
1. Verify CORS settings updated
2. Check `VITE_API_URL` in Vercel
3. Test API directly via Swagger

### Issue: Database Empty After Redeploy

**Solution:**
- SQLite resets on Render free tier
- Either accept data loss (testing only)
- Or migrate to PostgreSQL (see Option 2 below)

### Issue: Cold Start Too Slow

**Solution:**
- Accept it (free tier limitation)
- OR upgrade to Render paid plan ($7/month)
- OR use a "keep-alive" service (ping every 10 minutes)

---

## 📊 Monitoring

### Check Deployment Status:

**Render:**
- Dashboard: https://dashboard.render.com
- View logs, metrics, deployments

**Vercel:**
- Dashboard: https://vercel.com/dashboard
- View analytics, deployments, logs

---

## 🔐 Security Recommendations

Before going live:

1. ✅ **Change JWT Secret**:
   - In Render: Add environment variable `Jwt__SecretKey`
   - Use strong random string (64+ characters)

2. ✅ **Change Default Admin Password**:
   - Login and update in profile
   - Or update seed data in Program.cs

3. ✅ **Enable HTTPS Only**:
   - Both Render and Vercel provide free SSL
   - Already configured! ✅

4. ✅ **Rate Limiting**:
   - Already configured (100 req/min)
   - Adjust in appsettings.json if needed

---

## ✅ Deployment Complete!

Your HRConnect app is now live! 🎉

Share your app:
- Frontend: `https://hrconnect.vercel.app`
- API Docs: `https://hrconnect-api.onrender.com/swagger`

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Issues**: Create in your repository

Good luck! 🚀
