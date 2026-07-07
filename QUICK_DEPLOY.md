# 🚀 Quick Deploy Guide (5 Minutes)

## Prerequisites
- GitHub account
- Render.com account (sign up with GitHub)
- Vercel account (sign up with GitHub)

---

## Step 1: Push to GitHub (2 minutes)

```powershell
# In C:\HRConnect folder
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/hrconnect.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render (2 minutes)

1. Go to https://render.com → Sign in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Select your `hrconnect` repository
4. Configure:
   - Name: `hrconnect-api`
   - Root Directory: `HRConnect.API`
   - Runtime: **Docker**
   - Instance Type: **Free**
5. Add Environment Variable:
   - Key: `ASPNETCORE_URLS`
   - Value: `http://0.0.0.0:8080`
6. Click **"Create Web Service"**
7. Wait 5-10 minutes for deployment
8. Copy your API URL (e.g., `https://hrconnect-api.onrender.com`)

---

## Step 3: Deploy Frontend to Vercel (1 minute)

1. Go to https://vercel.com → Sign in with GitHub
2. Click **"Add New Project"**
3. Import `hrconnect` repository
4. Configure:
   - Framework: **Vite**
   - Root Directory: `hrconnect-ui`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variable:
   - Key: `VITE_API_URL`
   - Value: `https://hrconnect-api.onrender.com` (your Render URL)
6. Click **"Deploy"**
7. Wait 2-3 minutes

---

## Step 4: Update CORS (1 minute)

1. Copy your Vercel URL (e.g., `https://hrconnect-abc123.vercel.app`)
2. In your code, update `HRConnect.API/Program.cs`:

Find this section:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin()
```

Replace with:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.WithOrigins(
            "https://hrconnect-abc123.vercel.app",  // Your Vercel URL
            "http://localhost:5173"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
```

3. Commit and push:
```powershell
git add .
git commit -m "Update CORS for production"
git push
```

Render will auto-redeploy!

---

## ✅ Done!

Your app is live:
- **Frontend**: Your Vercel URL
- **API**: Your Render URL
- **Swagger**: `your-render-url/swagger`

**Login:**
- Email: admin@example.com
- Password: Admin@123

---

## 🔄 Future Updates

Just push to GitHub:
```powershell
git add .
git commit -m "Your changes"
git push
```

Both services auto-deploy! 🎉

---

## ⚠️ Important Notes

**Render Free Tier:**
- Sleeps after 15 min inactivity
- First request takes 30-60 sec (cold start)
- Database resets on redeploy (SQLite)

**For Production Use:**
- Upgrade Render to $7/month (no cold starts)
- Or migrate to PostgreSQL (see full guide)

---

## 📖 Need More Help?

See full deployment guide: `DEPLOYMENT.md`
